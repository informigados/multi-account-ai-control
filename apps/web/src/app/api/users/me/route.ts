import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { hashPassword } from "@/lib/security/password";
import { userSelfUpdateSchema } from "@/schemas/user";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = userSelfUpdateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid profile payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const payload = parseResult.data;
	if (user.isSystemAdmin && payload.locale !== undefined) {
		return NextResponse.json(
			{
				message: "Protected admin allows only email and password updates.",
			},
			{ status: 400 },
		);
	}

	const data: {
		email?: string;
		passwordHash?: string;
		locale?: "pt_BR" | "en";
	} = {};
	if (payload.email !== undefined) data.email = payload.email;
	if (payload.locale !== undefined) data.locale = payload.locale;
	if (payload.password !== undefined) {
		data.passwordHash = await hashPassword(payload.password);
	}

	try {
		const updatedUser = await db.user.update({
			where: { id: user.id },
			data,
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

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "user",
			entityId: user.id,
			eventType: "user_profile_updated",
			message: `User ${updatedUser.username} updated own profile`,
			metadata: {
				updatedFields: Object.keys(payload),
			},
		});

		return NextResponse.json({ user: updatedUser }, { status: 200 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return NextResponse.json(
				{ message: "Email already exists." },
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{ message: "Failed to update profile." },
			{ status: 500 },
		);
	}
}
