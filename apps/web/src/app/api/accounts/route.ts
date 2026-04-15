import { presentAccount } from "@/features/accounts/account-presenter";
import { buildSecretBlob } from "@/features/accounts/secret-blob";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { normalizeTags } from "@/lib/normalization";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { accountCreateSchema, accountQuerySchema } from "@/schemas/account";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const queryResult = accountQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);

	if (!queryResult.success) {
		return NextResponse.json(
			{
				message: "Invalid account query.",
				issues: queryResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const { search, providerId, status, tag, includeArchived, limit, cursor } =
		queryResult.data;
	const where: Prisma.AccountWhereInput = {
		AND: [
			includeArchived ? {} : { archivedAt: null },
			providerId ? { providerId } : {},
			status ? { status } : {},
			// Tag filter: SQLite stores tagsJson as a JSON array string; use
			// string_contains to find the normalized tag value inside the JSON blob.
			// This avoids in-memory post-filtering which breaks cursor pagination.
			tag
				? {
						tagsJson: {
							string_contains: tag.toLowerCase(),
						},
					}
				: {},
			search
				? {
						OR: [
							{ displayName: { contains: search } },
							{ identifier: { contains: search } },
							{ notesText: { contains: search } },
						],
					}
				: {},
		],
	};

	const accounts = await db.account.findMany({
		where,
		take: limit + 1,
		...(cursor
			? {
					cursor: { id: cursor },
					skip: 1,
				}
			: {}),
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
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
	});

	const hasMore = accounts.length > limit;
	const slice = hasMore ? accounts.slice(0, limit) : accounts;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;
	const presented = slice.map(presentAccount);

	return NextResponse.json(
		{
			accounts: presented,
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

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = accountCreateSchema.safeParse(await request.json());
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
	const provider = await db.provider.findUnique({
		where: { id: payload.providerId },
		select: { id: true, name: true },
	});

	if (!provider) {
		return NextResponse.json(
			{ message: "Provider not found." },
			{ status: 404 },
		);
	}

	const tags = normalizeTags(payload.tags);
	const encryptedSecretBlob = buildSecretBlob(payload.secretPayload);

	try {
		const account = await db.account.create({
			data: {
				providerId: payload.providerId,
				displayName: payload.displayName,
				identifier: payload.identifier,
				planName: payload.planName,
				accountType: payload.accountType,
				status: payload.status,
				priority: payload.priority,
				tagsJson: tags,
				notesText: payload.notesText,
				resetIntervalMinutes: payload.resetIntervalMinutes,
				nextResetAt: payload.nextResetAt,
				encryptedSecretBlob,
				archivedAt: payload.status === "archived" ? new Date() : null,
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
			entityId: account.id,
			eventType: "account_created",
			message: `Account ${account.displayName} created`,
			metadata: { accountId: account.id, providerId: account.providerId },
		});

		return NextResponse.json(
			{ account: presentAccount(account) },
			{ status: 201 },
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
			{ message: "Failed to create account." },
			{ status: 500 },
		);
	}
}
