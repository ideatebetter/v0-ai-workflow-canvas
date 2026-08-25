import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Use pdfjs-dist legacy build — it works in Node.js without browser globals.
    // Turbopack bundles server code into chunks at a different path, so the default
    // relative worker resolution breaks. We point workerSrc to the actual node_modules
    // file via process.cwd(), which is always the project root in Next.js.
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const workerPath = path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

    const loadingTask = pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const pages: { pageNumber: number; text: string }[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: unknown) => {
          const it = item as { str?: string; hasEOL?: boolean };
          const str = it.str ?? "";
          // Empty items with hasEOL are visual spacers between sections in the PDF layout.
          // Non-empty items with hasEOL are soft line wraps — treat them as spaces.
          if (str === "" && it.hasEOL) return "\n\n";
          return str + " ";
        })
        .join("")
        .replace(/ {2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (text.length > 0) {
        pages.push({ pageNumber: i, text });
      }
    }

    const fallbackText = pages.map(p => p.text).join("\n\n");
    const result = pages.length > 0
      ? pages
      : [{ pageNumber: 1, text: fallbackText }];

    return NextResponse.json({ pages: result, numPages });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF", detail: String(error) },
      { status: 500 }
    );
  }
}
