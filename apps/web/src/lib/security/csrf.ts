import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);
const DESKTOP_ORIGIN_PROTOCOLS = new Set(["tauri:", "app:"]);

function forbidden(message: string) {
	return NextResponse.json({ message }, { status: 403 });
}

function isDesktopWebviewRequest(request: NextRequest) {
	const userAgent = (request.headers.get("user-agent") ?? "").toLowerCase();
	return userAgent.includes("tauri") || userAgent.includes("wry");
}

export function enforceCsrfProtection(request: NextRequest) {
	const method = request.method.toUpperCase();
	if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
		return null;
	}

	const secFetchSite = request.headers.get("sec-fetch-site");
	if (secFetchSite && !ALLOWED_FETCH_SITES.has(secFetchSite)) {
		return forbidden("CSRF protection blocked cross-site request.");
	}

	const originHeader = request.headers.get("origin");
	if (!originHeader) {
		// Desktop WebViews (Tauri/Wry) may omit Origin on local requests.
		if (isDesktopWebviewRequest(request)) {
			return null;
		}

		return forbidden("CSRF protection requires Origin header.");
	}

	let originUrl: URL;
	try {
		originUrl = new URL(originHeader);
	} catch {
		return forbidden("Invalid Origin header.");
	}

	if (DESKTOP_ORIGIN_PROTOCOLS.has(originUrl.protocol.toLowerCase())) {
		return null;
	}

	const requestHost =
		request.headers.get("x-forwarded-host") ?? request.headers.get("host");
	if (!requestHost) {
		return forbidden("Unable to validate request host.");
	}

	if (originUrl.host.toLowerCase() !== requestHost.toLowerCase()) {
		return forbidden("CSRF origin mismatch.");
	}

	const forwardedProto = request.headers.get("x-forwarded-proto");
	const requestProtocol = (
		forwardedProto?.split(",")[0].trim() ??
		request.nextUrl.protocol.replace(":", "")
	).toLowerCase();
	const originProtocol = originUrl.protocol.replace(":", "").toLowerCase();

	if (originProtocol !== requestProtocol) {
		return forbidden("CSRF protocol mismatch.");
	}

	return null;
}
