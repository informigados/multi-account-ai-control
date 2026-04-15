import { resolveProviderCatalogDefaults } from "@/features/providers/provider-catalog";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/normalization";
import {
	SENSITIVE_CONNECTOR_CONFIRMATION_HEADER,
	evaluateConnectorGate,
} from "@/lib/security/connector-gate";
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
	const catalogDefaults = resolveProviderCatalogDefaults(slug);
	const connectorGate = evaluateConnectorGate({
		actorRole: user.role,
		nextConnectorType: data.connectorType,
		confirmationPhrase: request.headers.get(
			SENSITIVE_CONNECTOR_CONFIRMATION_HEADER,
		),
	});

	if (!slug) {
		return NextResponse.json(
			{ message: "Unable to derive a valid slug." },
			{ status: 400 },
		);
	}

	if (!connectorGate.ok) {
		await writeActivityLog({
			actorUserId: user.id,
			entityType: "provider",
			entityId: null,
			eventType: "provider_connector_gate_denied",
			message: connectorGate.message,
			metadata: {
				reason: connectorGate.code,
				connectorType: data.connectorType,
			},
		});

		return NextResponse.json(
			{ message: connectorGate.message },
			{ status: connectorGate.status },
		);
	}

	try {
		const provider = await db.provider.create({
			data: {
				name: data.name,
				slug,
				icon: data.icon ?? catalogDefaults?.icon,
				color: data.color ?? catalogDefaults?.color,
				description: data.description ?? catalogDefaults?.description,
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

		if (connectorGate.level !== "none") {
			await writeActivityLog({
				actorUserId: user.id,
				entityType: "provider",
				entityId: provider.id,
				eventType: "provider_connector_gate_passed",
				message: `Sensitive connector gate passed for provider ${provider.name}`,
				metadata: {
					providerId: provider.id,
					connectorType: provider.connectorType,
					level: connectorGate.level,
				},
			});
		}

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
