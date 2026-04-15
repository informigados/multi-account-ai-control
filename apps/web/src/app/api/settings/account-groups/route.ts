import { randomUUID } from "node:crypto";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

const KEY_ACCOUNT_GROUPS = "app.account_groups";

export type AccountGroup = {
	id: string;
	name: string;
	accountIds: string[];
};

async function loadGroups(userId: string): Promise<AccountGroup[]> {
	const setting = await db.appSetting.findUnique({
		where: { key: `${KEY_ACCOUNT_GROUPS}.${userId}` },
	});

	if (
		!setting?.valueJson ||
		typeof setting.valueJson !== "object" ||
		!Array.isArray(setting.valueJson)
	) {
		return [];
	}

	return setting.valueJson as AccountGroup[];
}

async function saveGroups(
	userId: string,
	groups: AccountGroup[],
): Promise<void> {
	const key = `${KEY_ACCOUNT_GROUPS}.${userId}`;
	await db.appSetting.upsert({
		where: { key },
		update: { valueJson: groups },
		create: { key, valueJson: groups },
	});
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const groups = await loadGroups(user.id);
	return NextResponse.json({ groups }, { status: 200 });
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
		typeof (body as { name?: unknown }).name !== "string" ||
		!(body as { name: string }).name.trim()
	) {
		return NextResponse.json({ message: "name is required." }, { status: 400 });
	}

	const { name } = body as { name: string };

	const groups = await loadGroups(user.id);

	const newGroup: AccountGroup = {
		id: randomUUID(),
		name: name.trim().slice(0, 50),
		accountIds: [],
	};

	groups.push(newGroup);
	await saveGroups(user.id, groups);

	return NextResponse.json({ ok: true, group: newGroup }, { status: 201 });
}
