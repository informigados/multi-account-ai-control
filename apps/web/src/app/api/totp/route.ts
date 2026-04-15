import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const KEY_TOTP = "app.totp_entries";

type TotpEntry = {
	id: string;
	label: string;
	issuer: string;
	secret: string; // Base32 stored in AppSetting (access-controlled per user session)
	createdAt: string;
	isFavorite: boolean;
};

function getTotpEntries(raw: unknown): TotpEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(
		(e) => typeof e?.id === "string" && typeof e?.secret === "string",
	) as TotpEntry[];
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const entries = getTotpEntries(setting?.valueJson);

	// Never expose the secret in list — return masked
	const masked = entries.map(({ secret: _, ...rest }) => ({
		...rest,
		hasSecret: true,
	}));

	return NextResponse.json({ entries: masked }, { status: 200 });
}

const createSchema = z.object({
	label: z.string().min(1).max(80),
	issuer: z.string().max(80).default(""),
	secret: z
		.string()
		.min(16)
		.max(256)
		.transform((s) => s.replace(/\s+/g, "").toUpperCase()),
});

export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const parsed = createSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid payload.", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const entries = getTotpEntries(setting?.valueJson);

	const newEntry: TotpEntry = {
		id: crypto.randomUUID(),
		label: parsed.data.label,
		issuer: parsed.data.issuer,
		secret: parsed.data.secret,
		createdAt: new Date().toISOString(),
		isFavorite: false,
	};

	const updated = [...entries, newEntry];

	await db.appSetting.upsert({
		where: { key: KEY_TOTP },
		create: { key: KEY_TOTP, valueJson: updated },
		update: { valueJson: updated },
	});

	const { secret: _, ...safeEntry } = newEntry;
	return NextResponse.json(
		{ entry: { ...safeEntry, hasSecret: true } },
		{ status: 201 },
	);
}
