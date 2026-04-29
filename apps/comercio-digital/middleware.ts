import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  const isEmbedQuery = searchParams.get("embed") === "true";
  const isEmbedPath = pathname.startsWith("/embed");
  const isEmbed = isEmbedPath || isEmbedQuery;

  if (isEmbed && !isEmbedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/embed" + pathname;
    url.searchParams.delete("embed");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/app") && !pathname.startsWith("/app/login")) {
    const hasSession = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

    if (!hasSession) {
      const loginUrl = new URL("/app/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Propagate or generate correlation ID for every request
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-correlation-id", correlationId);

  if (isEmbed) {
    response.headers.set("x-aethereos-embed", "true");
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/embed/:path*"],
};
