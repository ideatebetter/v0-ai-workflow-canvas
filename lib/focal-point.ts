/**
 * Subject-aware focal point detection.
 *
 * Priority order:
 *   1. FaceDetector API (Chrome/Edge 113+) — fast, hardware-accelerated face bounding boxes
 *   2. Canvas entropy analysis — finds the highest-variance region in a downsampled grid,
 *      biased toward the upper-center where subjects tend to appear in portrait photos
 *
 * Results are module-level cached so the same URL is only analysed once per session.
 * In-flight requests are de-duplicated so parallel callers share one computation.
 */

export type FocalPoint = { x: number; y: number };

const cache = new Map<string, FocalPoint>();
const pending = new Map<string, Set<(fp: FocalPoint) => void>>();

const SAMPLE_PX = 64;   // resize target for entropy scan — small = fast
const GRID      = 8;    // divide into 8×8 grid of candidate regions

const DEFAULT: FocalPoint = { x: 0.5, y: 0.38 }; // slight upward bias (safe default for portraits)

// ─── Entropy (saliency) analysis ────────────────────────────────────────────

async function entropyFocalPoint(img: HTMLImageElement): Promise<FocalPoint> {
  const canvas = document.createElement("canvas");
  canvas.width  = SAMPLE_PX;
  canvas.height = SAMPLE_PX;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return DEFAULT;

  try {
    ctx.drawImage(img, 0, 0, SAMPLE_PX, SAMPLE_PX);
  } catch {
    return DEFAULT;
  }

  let pixels: ImageData;
  try {
    pixels = ctx.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX);
  } catch {
    // Cross-origin taint — can't read pixels; use biased center
    return DEFAULT;
  }
  const { data } = pixels;

  const cellW = SAMPLE_PX / GRID;
  const cellH = SAMPLE_PX / GRID;

  let bestScore = -1;
  let focalX = DEFAULT.x;
  let focalY = DEFAULT.y;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const x0 = Math.round(gx * cellW);
      const y0 = Math.round(gy * cellH);
      const x1 = Math.round((gx + 1) * cellW);
      const y1 = Math.round((gy + 1) * cellH);

      let sum = 0;
      let count = 0;
      const lumas: number[] = [];

      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const i = (py * SAMPLE_PX + px) * 4;
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          lumas.push(luma);
          sum += luma;
          count++;
        }
      }

      if (count === 0) continue;
      const mean = sum / count;
      const variance = lumas.reduce((s, v) => s + (v - mean) ** 2, 0) / count;

      // Cell centre as 0-1 fractions
      const cx = (gx + 0.5) / GRID;
      const cy = (gy + 0.5) / GRID;

      // Gaussian weight: pull saliency toward upper-centre
      // σ_x = 0.5  (full horizontal range), σ_y = 0.45 biased upward (centre at 0.35)
      const dx = cx - 0.5;
      const dy = cy - 0.35;
      const gaussian = Math.exp(-(dx * dx / (2 * 0.25 * 0.25) + dy * dy / (2 * 0.45 * 0.45)));

      const score = variance * gaussian;

      if (score > bestScore) {
        bestScore = score;
        focalX = cx;
        focalY = cy;
      }
    }
  }

  return {
    x: Math.max(0.1, Math.min(0.9, focalX)),
    y: Math.max(0.1, Math.min(0.9, focalY)),
  };
}

// ─── Load image helper ───────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => {
      // Retry without CORS (can't read pixels but FaceDetector may still work)
      const img2 = new Image();
      img2.onload  = () => resolve(img2);
      img2.onerror = reject;
      img2.src = url;
    };
    img.src = url;
  });
}

// ─── Main detection ──────────────────────────────────────────────────────────

async function computeFocalPoint(url: string): Promise<FocalPoint> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } catch {
    return DEFAULT;
  }

  // 1. FaceDetector API (Chrome/Edge 113+)
  if (typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 8 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faces: any[] = await detector.detect(img);
      if (faces.length > 0) {
        const W = img.naturalWidth  || img.width;
        const H = img.naturalHeight || img.height;
        if (W > 0 && H > 0) {
          const ax = faces.reduce((s: number, f: any) => s + (f.boundingBox.left + f.boundingBox.width  / 2), 0) / faces.length / W;
          const ay = faces.reduce((s: number, f: any) => s + (f.boundingBox.top  + f.boundingBox.height / 2), 0) / faces.length / H;
          return { x: Math.max(0.1, Math.min(0.9, ax)), y: Math.max(0.1, Math.min(0.9, ay)) };
        }
      }
    } catch {
      // FaceDetector unsupported or permission denied — fall through
    }
  }

  // 2. Entropy analysis
  return entropyFocalPoint(img);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Async — calls `onResult` once with the detected focal point.
 * Simultaneous calls for the same URL share one in-flight analysis.
 */
export function detectFocalPoint(url: string, onResult: (fp: FocalPoint) => void): void {
  const hit = cache.get(url);
  if (hit) { onResult(hit); return; }

  const queue = pending.get(url);
  if (queue) { queue.add(onResult); return; }

  const cbs = new Set<(fp: FocalPoint) => void>([onResult]);
  pending.set(url, cbs);

  computeFocalPoint(url).then(fp => {
    cache.set(url, fp);
    pending.delete(url);
    cbs.forEach(cb => cb(fp));
  });
}

/** Clears the cache — useful in tests or when images are replaced. */
export function clearFocalPointCache(): void {
  cache.clear();
}
