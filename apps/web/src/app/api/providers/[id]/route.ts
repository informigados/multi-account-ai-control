import {
	isCanonicalProvider,
	resolveProviderCatalogDefaults,
} from "@/features/providers/provider-catalog";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/normalization";
import {
	SENSITIVE_CONNECTOR_CONFIRMATION_HEADER,
	evaluateConnectorGate,
} from "@/lib/security/connector-gate";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { providerUpdateSchema } from "@/schemas/provider";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

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
			{ message: "Invalid provider id." },
			{ status: 400 },
		);
	}

	const parseResult = providerUpdateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid provider payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const payload = parseResult.data;
	const currentProvider = await db.provider.findUnique({
		where: { id: parsedParams.data.id },
	});

	if (!currentProvider) {
		return NextResponse.json(
			{ message: "Provider not found." },
			{ status: 404 },
		);
	}

	const resolvedSlug =
		payload.slug !== undefined ? toSlug(payload.slug) : undefined;
	const nextSlug = resolvedSlug ?? currentProvider.slug;
	const catalogDefaults = resolveProviderCatalogDefaults(nextSlug);

	if (payload.slug !== undefined && !resolvedSlug) {
		return NextResponse.json(
			{ message: "Invalid slug value." },
			{ status: 400 },
		);
	}

	if (payload.connectorType !== undefined) {
		const connectorGate = evaluateConnectorGate({
			actorRole: user.role,
			previousConnectorType: currentProvider.connectorType,
			nextConnectorType: payload.connectorType,
			confirmationPhrase: request.headers.get(
				SENSITIVE_CONNECTOR_CONFIRMATION_HEADER,
			),
		});

		if (!connectorGate.ok) {
			await writeActivityLog({
				actorUserId: user.id,
				entityType: "provider",
				entityId: currentProvider.id,
				eventType: "provider_connector_gate_denied",
				message: connectorGate.message,
				metadata: {
					reason: connectorGate.code,
					previousConnectorType: currentProvider.connectorType,
					nextConnectorType: payload.connectorType,
				},
			});

			return NextResponse.json(
				{ message: connectorGate.message },
				{ status: connectorGate.status },
			);
		}
	}

	try {
		const provider = await db.provider.update({
			where: { id: currentProvider.id },
			data: {
				name: payload.name,
				slug: resolvedSlug,
				icon:
					payload.icon ??
					currentProvider.icon ??
					catalogDefaults?.icon ??
					undefined,
				color:
					payload.color ??
					currentProvider.color ??
					catalogDefaults?.color ??
					undefined,
				description:
					payload.description ??
					currentProvider.description ??
					catalogDefaults?.description ??
					undefined,
				connectorType: payload.connectorType,
				isActive: payload.isActive,
			},
		});

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "provider",
			entityId: provider.id,
			eventType: "provider_updated",
			message: `Provider ${provider.name} updated`,
			metadata: { providerId: provider.id },
		});

		if (
			payload.connectorType !== undefined &&
			payload.connectorType !== currentProvider.connectorType
		) {
			const connectorGate = evaluateConnectorGate({
				actorRole: user.role,
				previousConnectorType: currentProvider.connectorType,
				nextConnectorType: payload.connectorType,
				confirmationPhrase: request.headers.get(
					SENSITIVE_CONNECTOR_CONFIRMATION_HEADER,
				),
			});

			if (connectorGate.ok && connectorGate.level !== "none") {
				await writeActivityLog({
					actorUserId: user.id,
					entityType: "provider",
					entityId: provider.id,
					eventType: "provider_connector_gate_passed",
					message: `Sensitive connector gate passed for provider ${provider.name}`,
					metadata: {
						providerId: provider.id,
						previousConnectorType: currentProvider.connectorType,
						nextConnectorType: payload.connectorType,
						level: connectorGate.level,
					},
				});
			}
		}

		return NextResponse.json({ provider }, { status: 200 });
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
			{ message: "Failed to update provider." },
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
			{ message: "Invalid provider id." },
			{ status: 400 },
		);
	}

	const provider = await db.provider.findUnique({
		where: { id: parsedParams.data.id },
		select: {
			id: true,
			name: true,
			slug: true,
			_count: { select: { accounts: true } },
		},
	});

	if (!provider) {
		return NextResponse.json(
			{ message: "Provider not found." },
			{ status: 404 },
		);
	}

	// ── Canonical providers cannot be deleted — only deactivated ────────────
	if (isCanonicalProvider(provider.slug)) {
		return NextResponse.json(
			{
				message: `O provedor "${provider.name}" faz parte do catálogo canônico e não pode ser excluído. Use a opção Desativar para ocultá-lo das operações.`,
				code: "CANONICAL_PROVIDER",
			},
			{ status: 409 },
		);
	}
	// ────────────────────────────────────────────────────────────────────────

	if (provider._count.accounts > 0) {
		return NextResponse.json(
			{ message: "Provider has linked accounts and cannot be removed." },
			{ status: 409 },
		);
	}

	await db.provider.delete({
		where: { id: provider.id },
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "provider",
		entityId: provider.id,
		eventType: "provider_deleted",
		message: `Provider ${provider.name} deleted`,
		metadata: { providerId: provider.id },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
