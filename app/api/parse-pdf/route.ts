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

    // Import the main lib and the worker in our code (no webpackIgnore here) so
    // Next.js output file tracing picks up the worker file and includes it in the
    // Vercel function bundle. Without this explicit import, pdfjs's own
    // /*webpackIgnore*/ annotation causes the tracer to skip the worker entirely.
    const pdfjsLib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as any;
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");

    // import.meta.resolve gives the absolute file:// URL of the worker that now
    // exists in the function bundle, so pdfjs can dynamically import it at runtime.
    pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );

    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages: Array<{ pageNumber: number; text: string }> = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items as any[])
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s{2,}/g, "\n")
        .trim();
      if (text.length > 20) {
        pages.push({ pageNumber: i, text });
      }
    }

    return NextResponse.json({ pages, numPages: pdf.numPages });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF", detail: String(error) },
      { status: 500 }
    );
  }
}
