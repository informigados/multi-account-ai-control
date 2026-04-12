import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function requireApiUser(request: NextRequest) {
	const user = await getCurrentUserFromRequest(request);
	return user;
}

export async function getServerSessionUser() {
	const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
	if (!sessionToken) return null;

	const payload = verifySessionToken(sessionToken);
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
		},
	});

	return user;
}
