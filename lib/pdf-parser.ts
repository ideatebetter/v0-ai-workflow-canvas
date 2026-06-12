// PDF text extraction using pdfjs-dist (no worker — avoids Next.js bundler issues)

export interface ParsedPDFPage {
  pageNumber: number;
  text: string;
}

export async function parsePDFToText(file: File): Promise<ParsedPDFPage[]> {
  // Dynamically import to avoid SSR issues
  const pdfjsLib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as typeof import("pdfjs-dist");

  // Disable worker entirely — runs on the main thread, avoids worker URL resolution issues in Next.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false }).promise;
  const pages: ParsedPDFPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s{2,}/g, "\n")
      .trim();
    if (text.length > 20) {
      pages.push({ pageNumber: i, text });
    }
  }

  return pages;
}

// Split a block of text into logical sections by double-newlines or headings
export function splitIntoSections(rawText: string, maxSections = 8): string[] {
  const chunks = rawText
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);

  if (chunks.length <= maxSections) return chunks;

  // Merge smallest adjacent chunks until within limit
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
