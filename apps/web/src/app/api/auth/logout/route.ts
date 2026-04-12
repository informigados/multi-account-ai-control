import { writeActivityLog } from "@/lib/audit/log";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const payload = token ? verifySessionToken(token) : null;

	if (payload) {
		await writeActivityLog({
			actorUserId: payload.sub,
			entityType: "auth",
			entityId: payload.sub,
			eventType: "logout",
			message: `User ${payload.sub} logged out`,
		});
	}

	const response = NextResponse.json({ ok: true }, { status: 200 });
	response.cookies.set({
		name: SESSION_COOKIE_NAME,
		value: "",
		path: "/",
		maxAge: 0,
		httpOnly: true,
		sameSite: "lax",
	});

	return response;
}
