import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFigmaSyncToken } from "@/lib/figma-token";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = generateFigmaSyncToken(user.id);
  return NextResponse.json({ token });
}
