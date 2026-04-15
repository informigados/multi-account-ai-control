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

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const { id } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
	}

	const raw = body as Record<string, unknown>;

	const groups = await loadGroups(user.id);
	const idx = groups.findIndex((g) => g.id === id);

	if (idx === -1) {
		return NextResponse.json({ message: "Group not found." }, { status: 404 });
	}

	// Rename
	if (typeof raw.name === "string" && raw.name.trim()) {
		groups[idx].name = raw.name.trim().slice(0, 50);
	}

	// Set accountIds
	if (Array.isArray(raw.accountIds)) {
		groups[idx].accountIds = (raw.accountIds as unknown[])
			.filter((v): v is string => typeof v === "string")
			.slice(0, 500);
	}

	// Add accounts
	if (raw.addAccountId && typeof raw.addAccountId === "string") {
		if (!groups[idx].accountIds.includes(raw.addAccountId)) {
			groups[idx].accountIds.push(raw.addAccountId);
		}
	}

	// Remove account
	if (raw.removeAccountId && typeof raw.removeAccountId === "string") {
		groups[idx].accountIds = groups[idx].accountIds.filter(
			(aid) => aid !== raw.removeAccountId,
		);
	}

	await saveGroups(user.id, groups);

	return NextResponse.json({ ok: true, group: groups[idx] }, { status: 200 });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const { id } = await params;

	const groups = await loadGroups(user.id);
	const filtered = groups.filter((g) => g.id !== id);

	if (filtered.length === groups.length) {
		return NextResponse.json({ message: "Group not found." }, { status: 404 });
	}

	await saveGroups(user.id, filtered);

	return NextResponse.json({ ok: true }, { status: 200 });
}
