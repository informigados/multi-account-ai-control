/**
 * GET/POST /api/settings/groups-config
 *
 * Stores the maximum number of groups a user can create.
 * Default: unlimited (null). When set, the AccountGroupsManager enforces the limit.
 */
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const KEY = "app.groups_config";

type GroupsConfig = {
	maxGroups: number | null; // null = unlimited
};

const DEFAULT: GroupsConfig = { maxGroups: null };

function parse(raw: unknown): GroupsConfig {
	if (!raw || typeof raw !== "object") return DEFAULT;
	const candidate = raw as Record<string, unknown>;
	return {
		maxGroups:
			typeof candidate.maxGroups === "number" ? candidate.maxGroups : null,
	};
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const config = parse(setting?.valueJson);

	return NextResponse.json({ config }, { status: 200 });
}

const schema = z.object({
	maxGroups: z.number().int().min(1).max(200).nullable(),
});

export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	if (user.role !== "admin") {
		return NextResponse.json(
			{ message: "Admin role required." },
			{ status: 403 },
		);
	}

	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid payload.", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const config: GroupsConfig = { maxGroups: parsed.data.maxGroups };

	await db.appSetting.upsert({
		where: { key: KEY },
		create: { key: KEY, valueJson: config },
		update: { valueJson: config },
	});

	return NextResponse.json({ config }, { status: 200 });
}
