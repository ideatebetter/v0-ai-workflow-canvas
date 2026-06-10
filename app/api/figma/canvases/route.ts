import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFigmaSyncToken, tokenFromHeader } from "@/lib/figma-token";

export async function GET(request: Request) {
  const token = tokenFromHeader(request);
  const userId = token ? validateFigmaSyncToken(token) : null;
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const admin = createAdminClient();
  const { data: canvases, error } = await admin
    .from("canvases")
    .select("id, name, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch canvases" }, { status: 500 });

  return NextResponse.json({ canvases });
}
