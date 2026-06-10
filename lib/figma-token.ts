import { createHmac } from "crypto";

// HMAC-based token: `${userId}.${hmac}` — no DB storage needed.
// Uses SUPABASE_SERVICE_ROLE_KEY as the signing secret (already available server-side).

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret";
}

export function generateFigmaSyncToken(userId: string): string {
  const hmac = createHmac("sha256", secret()).update(userId).digest("hex").slice(0, 32);
  return `${userId}.${hmac}`;
}

export function validateFigmaSyncToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const hmac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("hex").slice(0, 32);
  if (hmac !== expected) return null;
  return userId;
}

export function tokenFromHeader(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}
