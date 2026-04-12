import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/normalization";
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

	if (payload.slug !== undefined && !resolvedSlug) {
		return NextResponse.json(
			{ message: "Invalid slug value." },
			{ status: 400 },
		);
	}

	try {
		const provider = await db.provider.update({
			where: { id: currentProvider.id },
			data: {
				name: payload.name,
				slug: resolvedSlug,
				icon: payload.icon,
				color: payload.color,
				description: payload.description,
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
		select: { id: true, name: true },
	});

	if (!provider) {
		return NextResponse.json(
			{ message: "Provider not found." },
			{ status: 404 },
		);
	}

	const accountsCount = await db.account.count({
		where: { providerId: provider.id },
	});

	if (accountsCount > 0) {
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
