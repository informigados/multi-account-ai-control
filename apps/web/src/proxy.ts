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

function isProtectedPath(pathname: string) {
	return PROTECTED_PREFIXES.some((prefix) => {
		if (prefix === "/") {
			return pathname === "/";
		}
		return pathname === prefix || pathname.startsWith(`${prefix}/`);
	});
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
		return NextResponse.next();
	}

	const hasSessionCookie = Boolean(
		request.cookies.get(SESSION_COOKIE_NAME)?.value,
	);

	if (pathname === "/login" && hasSessionCookie) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	if (isProtectedPath(pathname) && !hasSessionCookie) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
