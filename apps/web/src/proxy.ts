import { type NextRequest, NextResponse } from "next/server";

/**
 * Keeps /admin to the machine owner.
 *
 * - On your own machine (localhost) it just opens.
 * - Anywhere else it asks for ADMIN_PASSWORD (browser login prompt, any username).
 * - With no ADMIN_PASSWORD set, it does not exist outside localhost.
 *
 * The program is the real lock: only the authority wallet can change the
 * machine or withdraw. This only hides the setup page from players.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (LOCAL_HOSTS.has(host)) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse(null, { status: 404 });

  if (sameText(passwordFrom(request), password)) return NextResponse.next();
  return new NextResponse("Owner only", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CLAW admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

function passwordFrom(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return "";
  try {
    const decoded = atob(header.slice(6));
    return decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return "";
  }
}

/** Compares without bailing out at the first different character. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
