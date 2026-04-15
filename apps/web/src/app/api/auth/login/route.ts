import { writeActivityLog } from "@/lib/audit/log";
import {
	SESSION_COOKIE_NAME,
	createSessionToken,
	getSessionTtlSeconds,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { verifyPassword } from "@/lib/security/password";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
	identifier: z.string().min(1),
	password: z.string().min(1),
});

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const parseResult = loginSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{ message: "Invalid login payload." },
			{ status: 400 },
		);
	}

	const { identifier, password } = parseResult.data;
	const clientAddress = getClientAddress(request);
	const rateLimitResult = consumeRateLimit({
		key: `auth:login:${clientAddress}`,
		limit: 10,
		windowMs: 10 * 60 * 1000,
	});
	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{
				message: `Too many login attempts. Retry in ${rateLimitResult.retryAfterSeconds} seconds.`,
			},
			{
				status: 429,
				headers: {
					"retry-after": String(rateLimitResult.retryAfterSeconds),
				},
			},
		);
	}

	try {
		const user = await db.user.findFirst({
			where: {
				isActive: true,
				OR: [{ email: identifier }, { username: identifier }],
			},
		});

		if (!user) {
			await writeActivityLog({
				entityType: "auth",
				eventType: "login_failure",
				message: `Failed login for identifier ${identifier}`,
			});

			return NextResponse.json(
				{ message: "Invalid credentials." },
				{ status: 401 },
			);
		}

		const validPassword = await verifyPassword(password, user.passwordHash);
		if (!validPassword) {
			await writeActivityLog({
				actorUserId: user.id,
				entityType: "auth",
				entityId: user.id,
				eventType: "login_failure",
				message: `Failed login for user ${user.username}`,
			});

			return NextResponse.json(
				{ message: "Invalid credentials." },
				{ status: 401 },
			);
		}

		await db.user.update({
			where: { id: user.id },
			data: { lastLoginAt: new Date() },
		});

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "auth",
			entityId: user.id,
			eventType: "login_success",
			message: `User ${user.username} logged in`,
		});

		const token = createSessionToken(user.id);
		const response = NextResponse.json(
			{
				user: {
					id: user.id,
					username: user.username,
					role: user.role,
					locale: user.locale,
				},
			},
			{ status: 200 },
		);

		response.cookies.set({
			name: SESSION_COOKIE_NAME,
			value: token,
			httpOnly: true,
			sameSite: "strict",
			secure: getEnv().NODE_ENV === "production",
			path: "/",
			maxAge: getSessionTtlSeconds(),
		});

		return response;
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2021"
		) {
			return NextResponse.json(
				{
					message:
						"Database is not initialized. Run migrations and seed before login.",
				},
				{ status: 503 },
			);
		}

		return NextResponse.json(
			{ message: "Login failed due to a server error." },
			{ status: 500 },
		);
	}
}
