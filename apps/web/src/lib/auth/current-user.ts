import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function getCurrentUserFromRequest(request: NextRequest) {
	const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	if (!sessionCookie) return null;

	const payload = verifySessionToken(sessionCookie);
	if (!payload) return null;

	const user = await db.user.findFirst({
		where: { id: payload.sub, isActive: true },
		select: {
			id: true,
			username: true,
			email: true,
			role: true,
			locale: true,
			isActive: true,
			isSystemAdmin: true,
			lastLoginAt: true,
		},
	});

	return user;
}
