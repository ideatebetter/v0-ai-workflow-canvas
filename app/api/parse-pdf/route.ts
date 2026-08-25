import { NextRequest, NextResponse } from "next/server";

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
    // pdf-parse v2 uses the browser ESM build which requires DOMMatrix (not in Node).
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

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
          return it.str ?? "";
        })
        .join(" ")
        .replace(/ +/g, " ")
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
