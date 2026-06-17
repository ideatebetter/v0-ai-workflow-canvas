// PDF utilities — text extraction is server-side; thumbnail rendering is skipped (no worker available in browser)

export interface ParsedPDFPage {
  pageNumber: number;
  text: string;
}

// Text extraction via server-side API (Node.js pdfjs, no worker)
export async function parsePDFToText(file: File): Promise<ParsedPDFPage[]> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/parse-pdf", { method: "POST", body: form });
  if (!res.ok) throw new Error("PDF parse failed");

  const { pages } = await res.json();
  return pages as ParsedPDFPage[];
}

// Returns null — PDF thumbnail rendering requires a browser worker which isn't reliable cross-origin.
// The file node will show the PDF icon placeholder instead.
export async function renderPDFFirstPageToDataURL(_file: File, _scale = 1.5): Promise<string | null> {
  return null;
}

// Returns null for the same reason — existing PDFs show the icon placeholder.
export async function renderPDFFromURL(_url: string, _scale = 1.5): Promise<string | null> {
  return null;
}

// Split a block of text into logical sections by double-newlines or headings
export function splitIntoSections(rawText: string, maxSections = 8): string[] {
  const chunks = rawText
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);

  if (chunks.length <= maxSections) return chunks;

  while (chunks.length > maxSections) {
    let minIdx = 0;
    let minLen = chunks[0].length;
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].length < minLen) { minLen = chunks[i].length; minIdx = i; }
    }
    const mergeWith = minIdx < chunks.length - 1 ? minIdx + 1 : minIdx - 1;
    const [a, b] = minIdx < mergeWith ? [minIdx, mergeWith] : [mergeWith, minIdx];
    chunks.splice(a, 2, `${chunks[a]}\n\n${chunks[b]}`);
  }

  return chunks;
}
