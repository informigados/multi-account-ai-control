import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

const KEY_PREFIX = "app.active_account.";

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	// Fetch all active-account settings in a single query
	const settings = await db.appSetting.findMany({
		where: { key: { startsWith: KEY_PREFIX } },
		select: { key: true, valueJson: true },
	});

	const map: Record<string, string> = {};
	for (const setting of settings) {
		const providerId = setting.key.slice(KEY_PREFIX.length);
		const value = setting.valueJson;
		if (
			typeof value === "object" &&
			value !== null &&
			"accountId" in value &&
			typeof (value as { accountId: unknown }).accountId === "string"
		) {
			map[providerId] = (value as { accountId: string }).accountId;
		}
	}

	return NextResponse.json({ map }, { status: 200 });
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

	if (
		typeof body !== "object" ||
		body === null ||
		typeof (body as { providerId?: unknown }).providerId !== "string" ||
		typeof (body as { accountId?: unknown }).accountId !== "string"
	) {
		return NextResponse.json(
			{ message: "providerId and accountId are required." },
			{ status: 400 },
		);
	}

	const { providerId, accountId } = body as {
		providerId: string;
		accountId: string;
	};

	const key = `${KEY_PREFIX}${providerId}`;

	await db.appSetting.upsert({
		where: { key },
		update: { valueJson: { accountId } },
		create: { key, valueJson: { accountId } },
	});

	return NextResponse.json(
		{ ok: true, providerId, accountId },
		{ status: 200 },
	);
}
