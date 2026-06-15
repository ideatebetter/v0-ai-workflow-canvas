import { NextRequest, NextResponse } from "next/server";

// Suffixes to strip from page titles
const TITLE_SUFFIXES = [
  " - Google Docs",
  " - Google Sheets",
  " - Google Slides",
  " - YouTube",
  " | YouTube",
  " - Wikipedia",
  " | Wikipedia",
];

function cleanTitle(raw: string): string {
  let title = raw.trim();
  for (const suffix of TITLE_SUFFIXES) {
    if (title.endsWith(suffix)) {
      title = title.slice(0, -suffix.length).trim();
      break;
    }
  }
  return title;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ title: null }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AtlasBot/1.0; +https://ideatebetter.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(6000),
    });

    const html = await res.text();
    // Extract <title> — handles multiline and attributes
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const raw = match?.[1]
      ?.replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    const title = raw ? cleanTitle(raw) : null;
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: null });
  }
}
