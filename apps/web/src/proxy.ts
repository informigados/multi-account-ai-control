import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "maac_session";

const PROTECTED_PREFIXES = [
	"/",
	"/accounts",
	"/providers",
	"/data",
	"/audit",
	"/settings",
	"/about",
];

/**
 * Public paths that authenticated users should be redirected *away* from.
 */
const GUEST_ONLY_PATHS = ["/login"];

/**
 * Paths that are always public — even for unauthenticated requests.
 * Includes both exact paths and prefix matches (/reset-password/*).
 */
function isPublicPath(pathname: string) {
	if (pathname === "/login") return true;
	// Allow all reset-password sub-routes (e.g. /reset-password/confirm/[token])
	if (
		pathname === "/reset-password" ||
		pathname.startsWith("/reset-password/")
	) {
		return true;
	}
	return false;
}

function isProtectedPath(pathname: string) {
	if (isPublicPath(pathname)) return false;
	return PROTECTED_PREFIXES.some((prefix) => {
		if (prefix === "/") {
			return pathname === "/";
		}
		return pathname === prefix || pathname.startsWith(`${prefix}/`);
	});
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Let Next.js internals and API routes pass through.
	if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
		return NextResponse.next();
	}

	const hasSessionCookie = Boolean(
		request.cookies.get(SESSION_COOKIE_NAME)?.value,
	);

	// Redirect authenticated users away from login.
	if (GUEST_ONLY_PATHS.includes(pathname) && hasSessionCookie) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	// Redirect unauthenticated users away from protected routes.
	if (isProtectedPath(pathname) && !hasSessionCookie) {
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
