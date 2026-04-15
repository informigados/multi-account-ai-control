import { presentAccount } from "@/features/accounts/account-presenter";
import { buildSecretBlob } from "@/features/accounts/secret-blob";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { normalizeTags } from "@/lib/normalization";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { accountUpdateWithControlSchema } from "@/schemas/account";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
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

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		include: {
			provider: {
				select: {
					id: true,
					name: true,
					slug: true,
					icon: true,
					color: true,
				},
			},
			usageSnapshots: {
				orderBy: { measuredAt: "desc" },
				take: 1,
			},
		},
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	return NextResponse.json(
		{ account: presentAccount(account) },
		{ status: 200 },
	);
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

	const parseResult = accountUpdateWithControlSchema.safeParse(
		await request.json(),
	);
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid account payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const payload = parseResult.data;
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

	if (payload.providerId) {
		const provider = await db.provider.findUnique({
			where: { id: payload.providerId },
			select: { id: true },
		});

		if (!provider) {
			return NextResponse.json(
				{ message: "Provider not found." },
				{ status: 404 },
			);
		}
	}

	const encryptedSecretBlob = payload.secretPayload
		? buildSecretBlob(payload.secretPayload)
		: undefined;

	try {
		const updated = await db.account.update({
			where: { id: account.id },
			data: {
				providerId: payload.providerId,
				displayName: payload.displayName,
				identifier: payload.identifier,
				planName: payload.planName,
				accountType: payload.accountType,
				status: payload.status,
				priority: payload.priority,
				tagsJson: payload.tags ? normalizeTags(payload.tags) : undefined,
				notesText: payload.notesText,
				resetIntervalMinutes: payload.resetIntervalMinutes,
				nextResetAt: payload.nextResetAt,
				encryptedSecretBlob:
					payload.clearSecret === true
						? null
						: encryptedSecretBlob !== undefined
							? encryptedSecretBlob
							: undefined,
				archivedAt:
					payload.status === "archived"
						? new Date()
						: payload.status
							? null
							: undefined,
			},
			include: {
				provider: {
					select: {
						id: true,
						name: true,
						slug: true,
						icon: true,
						color: true,
					},
				},
				usageSnapshots: {
					orderBy: { measuredAt: "desc" },
					take: 1,
				},
			},
		});

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "account",
			entityId: updated.id,
			eventType: "account_updated",
			message: `Account ${updated.displayName} updated`,
			metadata: { accountId: updated.id },
		});

		return NextResponse.json(
			{ account: presentAccount(updated) },
			{ status: 200 },
		);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return NextResponse.json(
				{
					message:
						"An account with this provider and identifier already exists.",
				},
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{ message: "Failed to update account." },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true, displayName: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	await db.account.delete({
		where: { id: account.id },
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		entityId: account.id,
		eventType: "account_deleted",
		message: `Account ${account.displayName} deleted`,
		metadata: { accountId: account.id },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
