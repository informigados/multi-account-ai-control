import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { hashPassword } from "@/lib/security/password";
import { userCreateSchema, userQuerySchema } from "@/schemas/user";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

function ensureAdmin(role: string) {
	return role === "admin";
}

export async function GET(request: NextRequest) {
	const actor = await requireApiUser(request);
	if (!actor) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	if (!ensureAdmin(actor.role)) {
		return NextResponse.json({ message: "Forbidden." }, { status: 403 });
	}

	const queryResult = userQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);
	if (!queryResult.success) {
		return NextResponse.json(
			{
				message: "Invalid users query.",
				issues: queryResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const { limit, cursor, search } = queryResult.data;
	const users = await db.user.findMany({
		where: search
			? {
					OR: [
						{ username: { contains: search } },
						{ email: { contains: search } },
					],
				}
			: undefined,
		take: limit + 1,
		...(cursor
			? {
					cursor: { id: cursor },
					skip: 1,
				}
			: {}),
		orderBy: [{ id: "asc" }],
		select: {
			id: true,
			username: true,
			email: true,
			role: true,
			locale: true,
			isActive: true,
			isSystemAdmin: true,
			createdAt: true,
			updatedAt: true,
			lastLoginAt: true,
		},
	});

	const hasMore = users.length > limit;
	const slice = hasMore ? users.slice(0, limit) : users;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			users: slice,
			page: {
				limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const actor = await requireApiUser(request);
	if (!actor) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	if (!ensureAdmin(actor.role)) {
		return NextResponse.json({ message: "Forbidden." }, { status: 403 });
	}

	const parseResult = userCreateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid user payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const payload = parseResult.data;
	const passwordHash = await hashPassword(payload.password);

	try {
		const user = await db.user.create({
			data: {
				username: payload.username,
				email: payload.email,
				passwordHash,
				role: payload.role,
				locale: payload.locale,
				isActive: payload.isActive,
				isSystemAdmin: false,
			},
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				locale: true,
				isActive: true,
				isSystemAdmin: true,
				createdAt: true,
				updatedAt: true,
				lastLoginAt: true,
			},
		});

		await writeActivityLog({
			actorUserId: actor.id,
			entityType: "user",
			entityId: user.id,
			eventType: "user_created",
			message: `User ${user.username} created`,
			metadata: {
				createdUserId: user.id,
				createdUsername: user.username,
				createdRole: user.role,
			},
		});

		return NextResponse.json({ user }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return NextResponse.json(
				{ message: "Username or email already exists." },
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{ message: "Failed to create user." },
			{ status: 500 },
		);
	}
}
