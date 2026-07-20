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

    // pdf-parse v2 class API: pass data in constructor, call getText()
    // getText() returns a TextResult with .pages (per-page) and .text (full doc)
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data });
    const result = await parser.getText();

    // result.pages is an array of { num, text } objects
    const pages = result.pages.length > 0
      ? result.pages.map((p: { num: number; text: string }) => ({ pageNumber: p.num, text: p.text.trim() })).filter((p: { pageNumber: number; text: string }) => p.text.length > 0)
      : [{ pageNumber: 1, text: result.text.trim() }];

    return NextResponse.json({ pages, numPages: result.total });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF", detail: String(error) },
      { status: 500 }
    );
  }
}
