import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

const FIGMA_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function middleware(request: NextRequest) {
  // Short-circuit Figma plugin routes before any Supabase auth processing.
  // Plugin UI runs from a null origin so standard auth middleware would redirect it.
  if (request.nextUrl.pathname.startsWith('/demo')) {
    return NextResponse.next({ request })
  }

  if (request.nextUrl.pathname.startsWith('/api/figma/')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: FIGMA_CORS_HEADERS })
    }
    return NextResponse.next({ request })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs)$).*)',
  ],
}
