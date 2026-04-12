import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { decryptSecret } from "@/lib/security/encryption";
import { verifyPassword } from "@/lib/security/password";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const revealSchema = z.object({
	password: z.string().min(1),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawParams = await context.params;
	const parsedParams = paramsSchema.safeParse(rawParams);
	if (!parsedParams.success) {
		return NextResponse.json(
			{ message: "Invalid account id." },
			{ status: 400 },
		);
	}

	const parseResult = revealSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{ message: "Invalid reveal payload." },
			{ status: 400 },
		);
	}

	const clientAddress = getClientAddress(request);
	const rateLimitResult = consumeRateLimit({
		key: `account:secret-reveal:${clientAddress}:${parsedParams.data.id}`,
		limit: 8,
		windowMs: 10 * 60 * 1000,
	});
	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{
				message: `Too many secret reveal attempts. Retry in ${rateLimitResult.retryAfterSeconds} seconds.`,
			},
			{
				status: 429,
				headers: {
					"retry-after": String(rateLimitResult.retryAfterSeconds),
				},
			},
		);
	}

	const authUser = await db.user.findUnique({
		where: { id: user.id },
		select: { id: true, username: true, passwordHash: true, isActive: true },
	});

	if (!authUser || !authUser.isActive) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true, displayName: true, encryptedSecretBlob: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	const isValid = await verifyPassword(
		parseResult.data.password,
		authUser.passwordHash,
	);
	if (!isValid) {
		await writeActivityLog({
			actorUserId: authUser.id,
			entityType: "account",
			entityId: account.id,
			eventType: "secret_reveal_denied",
			message: `Secret reveal denied for ${account.displayName}`,
		});

		return NextResponse.json(
			{ message: "Invalid credentials." },
			{ status: 401 },
		);
	}

	if (!account.encryptedSecretBlob) {
		return NextResponse.json(
			{ accountId: account.id, hasSecret: false, secret: null },
			{ status: 200 },
		);
	}

	let secret: unknown;
	try {
		const decrypted = decryptSecret(account.encryptedSecretBlob);
		secret = JSON.parse(decrypted) as unknown;
	} catch {
		return NextResponse.json(
			{ message: "Failed to decrypt stored secret." },
			{ status: 500 },
		);
	}

	await writeActivityLog({
		actorUserId: authUser.id,
		entityType: "account",
		entityId: account.id,
		eventType: "secret_revealed",
		message: `Secret revealed for ${account.displayName}`,
		metadata: {
			accountId: account.id,
		},
	});

	return NextResponse.json(
		{
			accountId: account.id,
			hasSecret: true,
			secret,
		},
		{ status: 200 },
	);
}
