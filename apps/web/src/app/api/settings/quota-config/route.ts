import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

const KEY_QUOTA_CONFIG = "app.quota_config";

type QuotaConfig = {
	refreshIntervalMinutes: number;
	alertThresholdPercent: number;
};

const defaultConfig: QuotaConfig = {
	refreshIntervalMinutes: 10,
	alertThresholdPercent: 80,
};

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const setting = await db.appSetting.findUnique({
		where: { key: KEY_QUOTA_CONFIG },
	});

	const config: QuotaConfig =
		setting?.valueJson &&
		typeof setting.valueJson === "object" &&
		setting.valueJson !== null
			? { ...defaultConfig, ...(setting.valueJson as Partial<QuotaConfig>) }
			: defaultConfig;

	return NextResponse.json({ config }, { status: 200 });
}

export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
	}

	if (typeof body !== "object" || body === null) {
		return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
	}

	const raw = body as Record<string, unknown>;

	const refreshInterval =
		typeof raw.refreshIntervalMinutes === "number"
			? Math.max(1, Math.min(120, raw.refreshIntervalMinutes))
			: defaultConfig.refreshIntervalMinutes;

	const alertThreshold =
		typeof raw.alertThresholdPercent === "number"
			? Math.max(1, Math.min(100, raw.alertThresholdPercent))
			: defaultConfig.alertThresholdPercent;

	const config: QuotaConfig = {
		refreshIntervalMinutes: refreshInterval,
		alertThresholdPercent: alertThreshold,
	};

	await db.appSetting.upsert({
		where: { key: KEY_QUOTA_CONFIG },
		update: { valueJson: config },
		create: { key: KEY_QUOTA_CONFIG, valueJson: config },
	});

	return NextResponse.json({ ok: true, config }, { status: 200 });
}
