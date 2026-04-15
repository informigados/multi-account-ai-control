import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

type BulkAction = "archive" | "delete";

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
		!Array.isArray((body as { ids?: unknown }).ids) ||
		typeof (body as { action?: unknown }).action !== "string"
	) {
		return NextResponse.json(
			{ message: "action and ids[] are required." },
			{ status: 400 },
		);
	}

	const { action, ids } = body as { action: BulkAction; ids: string[] };

	if (!["archive", "delete"].includes(action)) {
		return NextResponse.json(
			{ message: "action must be 'archive' or 'delete'." },
			{ status: 400 },
		);
	}

	if (!Array.isArray(ids) || ids.length === 0) {
		return NextResponse.json(
			{ message: "ids must be a non-empty array." },
			{ status: 400 },
		);
	}

	if (ids.length > 100) {
		return NextResponse.json(
			{ message: "Cannot operate on more than 100 accounts at once." },
			{ status: 400 },
		);
	}

	// Validate all IDs are strings
	if (!ids.every((id) => typeof id === "string")) {
		return NextResponse.json(
			{ message: "All ids must be strings." },
			{ status: 400 },
		);
	}

	if (action === "archive") {
		await db.account.updateMany({
			where: { id: { in: ids } },
			data: { status: "archived" },
		});

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "account",
			eventType: "bulk_archive",
			message: `Bulk archive: ${ids.length} account(s)`,
			metadata: { count: ids.length, ids },
		});

		return NextResponse.json(
			{ ok: true, action, affected: ids.length },
			{ status: 200 },
		);
	}

	// action === "delete"
	// Cascade: delete usage snapshots, notes, activity logs referencing these accounts
	await db.usageSnapshot.deleteMany({ where: { accountId: { in: ids } } });
	await db.note.deleteMany({ where: { accountId: { in: ids } } });
	await db.account.deleteMany({ where: { id: { in: ids } } });

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		eventType: "bulk_delete",
		message: `Bulk delete: ${ids.length} account(s)`,
		metadata: { count: ids.length, ids },
	});

	return NextResponse.json(
		{ ok: true, action, affected: ids.length },
		{ status: 200 },
	);
}
