/**
 * POST /api/export/backup/schedule
 *
 * Persists a backup snapshot into the AppSetting "app.backup_schedule_log"
 * (JSON array with retention, max N entries).
 *
 * GET /api/export/backup/schedule
 * Returns the list of scheduled backup entries (metadata only, no payload).
 *
 * DELETE /api/export/backup/schedule?id=<entryId>
 * Removes a specific backup entry by id.
 */
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

const KEY = "app.backup_schedule_log";
const MAX_ENTRIES = 30; // keep at most 30 entries

export type ScheduledBackupEntry = {
	id: string;
	createdAt: string;
	label: string;
	sizeBytes: number;
	checksum: string;
	/** encrypted backup JSON stored as a string */
	payload: string;
};

export type ScheduledBackupMeta = Omit<ScheduledBackupEntry, "payload">;

function getEntries(raw: unknown): ScheduledBackupEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(
		(e) => typeof e?.id === "string" && typeof e?.payload === "string",
	) as ScheduledBackupEntry[];
}

/** GET: list metadata (no payload exposed) — or download one entry */
export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const url = new URL(request.url);
	const downloadId = url.searchParams.get("id");
	const isDownload = url.searchParams.get("download") === "1";

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const entries = getEntries(setting?.valueJson);

	// Download mode: return a specific entry's full payload
	if (isDownload && downloadId) {
		const entry = entries.find((e) => e.id === downloadId);
		if (!entry)
			return NextResponse.json(
				{ message: "Entry not found." },
				{ status: 404 },
			);
		return NextResponse.json({ payload: entry.payload }, { status: 200 });
	}

	// List mode: return metadata only
	const meta: ScheduledBackupMeta[] = entries.map(
		({ payload: _, ...rest }) => rest,
	);

	return NextResponse.json({ entries: meta }, { status: 200 });
}

/** POST: save a new backup snapshot */
export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const body = (await request.json()) as {
		payload: string;
		label?: string;
		checksum?: string;
	};

	if (!body.payload || typeof body.payload !== "string") {
		return NextResponse.json(
			{ message: "payload (string) is required." },
			{ status: 400 },
		);
	}

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const entries = getEntries(setting?.valueJson);

	const newEntry: ScheduledBackupEntry = {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		label: body.label ?? `backup-${new Date().toISOString().slice(0, 10)}`,
		sizeBytes: Buffer.byteLength(body.payload, "utf8"),
		checksum: body.checksum ?? "",
		payload: body.payload,
	};

	// Newest first, cap at MAX_ENTRIES
	const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);

	await db.appSetting.upsert({
		where: { key: KEY },
		create: { key: KEY, valueJson: updated },
		update: { valueJson: updated },
	});

	const { payload: _, ...meta } = newEntry;
	return NextResponse.json({ entry: meta }, { status: 201 });
}

/** DELETE ?id=<entryId>: remove one scheduled backup */
export async function DELETE(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const id = new URL(request.url).searchParams.get("id");
	if (!id)
		return NextResponse.json(
			{ message: "id query param required." },
			{ status: 400 },
		);

	const setting = await db.appSetting.findUnique({ where: { key: KEY } });
	const entries = getEntries(setting?.valueJson);
	const filtered = entries.filter((e) => e.id !== id);

	if (filtered.length === entries.length) {
		return NextResponse.json({ message: "Entry not found." }, { status: 404 });
	}

	await db.appSetting.upsert({
		where: { key: KEY },
		create: { key: KEY, valueJson: filtered },
		update: { valueJson: filtered },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
