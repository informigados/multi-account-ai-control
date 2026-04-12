import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/normalization";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { providerCreateSchema, providerQuerySchema } from "@/schemas/provider";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const queryResult = providerQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);
	if (!queryResult.success) {
		return NextResponse.json(
			{
				message: "Invalid provider query.",
				issues: queryResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const { limit, cursor, activeOnly } = queryResult.data;

	const providers = await db.provider.findMany({
		where: activeOnly ? { isActive: true } : undefined,
		take: limit + 1,
		...(cursor
			? {
					cursor: { id: cursor },
					skip: 1,
				}
			: {}),
		orderBy: [{ id: "asc" }],
	});

	const hasMore = providers.length > limit;
	const slice = hasMore ? providers.slice(0, limit) : providers;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			providers: slice,
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

	const parseResult = providerCreateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid provider payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const data = parseResult.data;
	const slug = toSlug(data.slug ?? data.name);

	if (!slug) {
		return NextResponse.json(
			{ message: "Unable to derive a valid slug." },
			{ status: 400 },
		);
	}

	try {
		const provider = await db.provider.create({
			data: {
				name: data.name,
				slug,
				icon: data.icon,
				color: data.color,
				description: data.description,
				connectorType: data.connectorType,
				isActive: data.isActive,
			},
		});

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "provider",
			entityId: provider.id,
			eventType: "provider_created",
			message: `Provider ${provider.name} created`,
			metadata: { providerId: provider.id, slug: provider.slug },
		});

		return NextResponse.json({ provider }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return NextResponse.json(
				{ message: "Provider slug already exists." },
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{ message: "Failed to create provider." },
			{ status: 500 },
		);
	}
}
