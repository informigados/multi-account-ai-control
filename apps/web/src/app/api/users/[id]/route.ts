import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { hashPassword } from "@/lib/security/password";
import { userUpdateSchema } from "@/schemas/user";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

type RouteContext = {
	params: Promise<{ id: string }>;
};

function ensureAdmin(role: string) {
	return role === "admin";
}

async function countOtherActiveAdmins(excludingUserId: string) {
	return db.user.count({
		where: {
			id: { not: excludingUserId },
			role: "admin",
			isActive: true,
		},
	});
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

	const { id } = await context.params;
	const parseResult = userUpdateSchema.safeParse(await request.json());
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
	const target = await db.user.findUnique({
		where: { id },
		select: {
			id: true,
			username: true,
			role: true,
			isActive: true,
			isSystemAdmin: true,
		},
	});

	if (!target) {
		return NextResponse.json({ message: "User not found." }, { status: 404 });
	}

	if (target.isSystemAdmin) {
		if (
			payload.username !== undefined ||
			payload.role !== undefined ||
			payload.isActive !== undefined ||
			payload.locale !== undefined
		) {
			return NextResponse.json(
				{
					message: "Protected admin allows only email and password updates.",
				},
				{ status: 400 },
			);
		}
	}

	const willRemoveAdminPrivileges =
		target.role === "admin" &&
		((payload.role !== undefined && payload.role !== "admin") ||
			(payload.isActive !== undefined && payload.isActive === false));
	if (willRemoveAdminPrivileges) {
		const otherAdmins = await countOtherActiveAdmins(target.id);
		if (otherAdmins === 0) {
			return NextResponse.json(
				{ message: "At least one active admin must remain." },
				{ status: 400 },
			);
		}
	}

	const data: {
		username?: string;
		email?: string;
		passwordHash?: string;
		role?: "admin" | "operator";
		locale?: "pt_BR" | "en";
		isActive?: boolean;
	} = {};

	if (payload.username !== undefined) data.username = payload.username;
	if (payload.email !== undefined) data.email = payload.email;
	if (payload.role !== undefined) data.role = payload.role;
	if (payload.locale !== undefined) data.locale = payload.locale;
	if (payload.isActive !== undefined) data.isActive = payload.isActive;
	if (payload.password !== undefined) {
		data.passwordHash = await hashPassword(payload.password);
	}

	try {
		const user = await db.user.update({
			where: { id },
			data,
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
			eventType: "user_updated",
			message: `User ${user.username} updated`,
			metadata: {
				updatedFields: Object.keys(payload),
			},
		});

		return NextResponse.json({ user }, { status: 200 });
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
			{ message: "Failed to update user." },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

	const { id } = await context.params;
	if (actor.id === id) {
		return NextResponse.json(
			{ message: "You cannot delete your own user." },
			{ status: 400 },
		);
	}

	const target = await db.user.findUnique({
		where: { id },
		select: {
			id: true,
			username: true,
			role: true,
			isActive: true,
			isSystemAdmin: true,
		},
	});

	if (!target) {
		return NextResponse.json({ message: "User not found." }, { status: 404 });
	}

	if (target.isSystemAdmin) {
		return NextResponse.json(
			{ message: "Protected admin cannot be deleted." },
			{ status: 400 },
		);
	}

	if (target.role === "admin" && target.isActive) {
		const otherAdmins = await countOtherActiveAdmins(target.id);
		if (otherAdmins === 0) {
			return NextResponse.json(
				{ message: "At least one active admin must remain." },
				{ status: 400 },
			);
		}
	}

	await db.user.delete({ where: { id } });
	await writeActivityLog({
		actorUserId: actor.id,
		entityType: "user",
		entityId: target.id,
		eventType: "user_deleted",
		message: `User ${target.username} deleted`,
		metadata: {
			deletedUserId: target.id,
			deletedUsername: target.username,
		},
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
