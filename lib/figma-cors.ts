// CORS helper for Figma plugin API routes.
// Figma plugin UIs run in a sandboxed iframe with an opaque (null) origin,
// so we must allow any origin and handle OPTIONS preflight explicitly.

export const FIGMA_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function withCors(response: Response): Response {
  const next = new Response(response.body, response);
  Object.entries(FIGMA_CORS_HEADERS).forEach(([k, v]) => next.headers.set(k, v));
  return next;
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: FIGMA_CORS_HEADERS });
}
