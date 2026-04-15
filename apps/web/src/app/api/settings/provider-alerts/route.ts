/**
 * GET/POST /api/settings/provider-alerts
 *
 * Stores per-provider quota alert thresholds, overriding the global config.
 * Shape: { overrides: Record<providerId, { threshold: number }> }
 *
 * - GET: returns the full override map
 * - POST: upserts one provider override  { providerId, threshold }
 * - DELETE ?providerId=<id>: clears one provider override (revert to global)
 */
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const KEY = "app.provider_alert_overrides";

type OverrideMap = Record<string, { threshold: number }>;

function parseOverrides(raw: unknown): OverrideMap {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	const map: OverrideMap = {};
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		if (
			v &&
			typeof v === "object" &&
			typeof (v as { threshold?: unknown }).threshold === "number"
		) {
			map[k] = { threshold: (v as { threshold: number }).threshold };
		}
	}
	return map;
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const overrides = parseOverrides(setting?.valueJson);

	return NextResponse.json({ overrides }, { status: 200 });
}

const postSchema = z.object({
	providerId: z.string().min(1),
	threshold: z.number().int().min(1).max(100),
});

export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const parsed = postSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid payload.", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { providerId, threshold } = parsed.data;

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const overrides = parseOverrides(setting?.valueJson);
	overrides[providerId] = { threshold };

	await db.appSetting.upsert({
		where: { key: KEY },
		create: { key: KEY, valueJson: overrides },
		update: { valueJson: overrides },
	});

	return NextResponse.json({ overrides }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const providerId = new URL(request.url).searchParams.get("providerId");
	if (!providerId)
		return NextResponse.json(
			{ message: "providerId query param required." },
			{ status: 400 },
		);

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const overrides = parseOverrides(setting?.valueJson);
	delete overrides[providerId];

	await db.appSetting.upsert({
		where: { key: KEY },
		create: { key: KEY, valueJson: overrides },
		update: { valueJson: overrides },
	});

	return NextResponse.json({ overrides }, { status: 200 });
}
