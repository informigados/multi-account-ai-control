import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const KEY_TOTP = "app.totp_entries";

type TotpEntry = {
	id: string;
	label: string;
	issuer: string;
	secret: string;
	createdAt: string;
	isFavorite: boolean;
};

function getTotpEntries(raw: unknown): TotpEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((e) => typeof e?.id === "string") as TotpEntry[];
}

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
	label: z.string().min(1).max(80).optional(),
	issuer: z.string().max(80).optional(),
	isFavorite: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const { id } = await context.params;
	const parsed = patchSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
	}

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const entries = getTotpEntries(setting?.valueJson);

	const idx = entries.findIndex((e) => e.id === id);
	if (idx === -1)
		return NextResponse.json({ message: "Entry not found." }, { status: 404 });

	entries[idx] = { ...entries[idx], ...parsed.data };
	await db.appSetting.upsert({
		where: { key: KEY_TOTP },
		create: { key: KEY_TOTP, valueJson: entries },
		update: { valueJson: entries },
	});

	const { secret: _, ...safe } = entries[idx];
	return NextResponse.json(
		{ entry: { ...safe, hasSecret: true } },
		{ status: 200 },
	);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const { id } = await context.params;

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const entries = getTotpEntries(setting?.valueJson);
	const filtered = entries.filter((e) => e.id !== id);

	if (filtered.length === entries.length) {
		return NextResponse.json({ message: "Entry not found." }, { status: 404 });
	}

	await db.appSetting.upsert({
		where: { key: KEY_TOTP },
		create: { key: KEY_TOTP, valueJson: filtered },
		update: { valueJson: filtered },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
