/**
 * GET  /api/totp/export  — export all TOTP entries (including secrets) as JSON
 *                          for the authenticated user.
 *                          Response: { entries: TotpEntry[], exportedAt: string }
 *
 * POST /api/totp/import  — import a JSON array of TOTP entries.
 *                          Merges by id (skip duplicates). Returns imported count.
 *                          Body: { entries: TotpEntry[] }
 *
 * Security:
 *  - Requires authenticated session (requireApiUser).
 *  - Export exposes the raw Base32 secrets — caller must handle them securely.
 *  - Import validates each entry shape before merging.
 */
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

function getEntries(raw: unknown): TotpEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(
		(e) => typeof e?.id === "string" && typeof e?.secret === "string",
	) as TotpEntry[];
}

/* ─── Export ────────────────────────────────────────────────────────── */
export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const entries = getEntries(setting?.valueJson);

	// Return full entries including secrets — the client will encrypt before persisting
	return NextResponse.json(
		{ entries, exportedAt: new Date().toISOString() },
		{
			status: 200,
			headers: {
				// Prevent browser caching of sensitive data
				"Cache-Control": "no-store",
				"Content-Disposition": `attachment; filename="totp-export-${new Date().toISOString().slice(0, 10)}.json"`,
			},
		},
	);
}

/* ─── Import ────────────────────────────────────────────────────────── */
const importEntrySchema = z.object({
	id: z.string().uuid().optional(),
	label: z.string().min(1).max(80),
	issuer: z.string().max(80).default(""),
	secret: z
		.string()
		.min(16)
		.max(256)
		.transform((s) => s.replace(/\s+/g, "").toUpperCase()),
	createdAt: z.string().optional(),
	isFavorite: z.boolean().optional().default(false),
});

const importBodySchema = z.object({
	entries: z.array(importEntrySchema).min(1).max(200),
});

export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
	}

	const parsed = importBodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid payload.", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const existing = getEntries(setting?.valueJson);
	const existingIds = new Set(existing.map((e) => e.id));

	const now = new Date().toISOString();
	let importedCount = 0;

	for (const raw of parsed.data.entries) {
		const id = raw.id ?? crypto.randomUUID();
		if (existingIds.has(id)) continue; // Skip duplicates by id

		existing.push({
			id,
			label: raw.label,
			issuer: raw.issuer,
			secret: raw.secret,
			createdAt: raw.createdAt ?? now,
			isFavorite: raw.isFavorite ?? false,
		});
		existingIds.add(id);
		importedCount++;
	}

	await db.appSetting.upsert({
		where: { key: KEY_TOTP },
		create: { key: KEY_TOTP, valueJson: existing },
		update: { valueJson: existing },
	});

	return NextResponse.json(
		{ ok: true, importedCount, totalEntries: existing.length },
		{ status: 200 },
	);
}
