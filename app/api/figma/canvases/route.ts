import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFigmaSyncToken, tokenFromHeader } from "@/lib/figma-token";
import { FIGMA_CORS_HEADERS, optionsResponse } from "@/lib/figma-cors";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  try {
    const token = tokenFromHeader(request);
    const userId = token ? validateFigmaSyncToken(token) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: FIGMA_CORS_HEADERS });
    }

    const admin = createAdminClient();
    const { data: canvases, error } = await admin
      .from("canvases")
      .select("id, name, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch canvases" }, { status: 500, headers: FIGMA_CORS_HEADERS });
    }

    return NextResponse.json({ canvases }, { headers: FIGMA_CORS_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500, headers: FIGMA_CORS_HEADERS });
  }
}
