import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/security/encryption";
import {
	BACKUP_CHECKSUM_ALGORITHM,
	computeSha256Hex,
} from "@/lib/security/integrity";
import { type NextRequest, NextResponse } from "next/server";

type WithId = { id: string };

async function collectInBatches<T extends WithId>(
	fetchBatch: (cursor?: string) => Promise<T[]>,
) {
	const rows: T[] = [];
	let cursor: string | undefined;

	while (true) {
		const batch = await fetchBatch(cursor);
		if (batch.length === 0) break;

		rows.push(...batch);
		cursor = batch[batch.length - 1]?.id;
	}

	return rows;
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const providers = await collectInBatches((cursor) =>
		db.provider.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);
	const accounts = await collectInBatches((cursor) =>
		db.account.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);
	const usageSnapshots = await collectInBatches((cursor) =>
		db.usageSnapshot.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);
	const notes = await collectInBatches((cursor) =>
		db.note.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);
	const activityLogs = await collectInBatches((cursor) =>
		db.activityLog.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);
	const imports = await collectInBatches((cursor) =>
		db.import.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);
	const settings = await collectInBatches((cursor) =>
		db.appSetting.findMany({
			orderBy: { id: "asc" },
			take: 500,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1,
					}
				: {}),
		}),
	);

	const exportedAt = new Date();
	const plainPayload = {
		version: 1,
		exportType: "backup",
		exportedAt: exportedAt.toISOString(),
		data: {
			users: [],
			providers,
			accounts,
			usageSnapshots,
			notes,
			activityLogs,
			imports,
			settings,
		},
	};

	const plainPayloadText = JSON.stringify(plainPayload);
	const payloadChecksum = computeSha256Hex(plainPayloadText);
	const payloadBytes = Buffer.byteLength(plainPayloadText, "utf8");
	const encryptedBackup = encryptSecret(plainPayloadText);
	const backupPayload = {
		version: 2,
		exportType: "backup",
		metadataVersion: 1,
		algorithm: "aes-256-gcm",
		checksumAlgorithm: BACKUP_CHECKSUM_ALGORITHM,
		payloadChecksum,
		payloadBytes,
		exportedAt: exportedAt.toISOString(),
		encryptedPayload: encryptedBackup,
	};

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "export",
		entityId: null,
		eventType: "export_created",
		message: "Encrypted backup export generated",
		metadata: {
			exportType: "backup",
			counts: {
				users: 0,
				providers: providers.length,
				accounts: accounts.length,
				usageSnapshots: usageSnapshots.length,
				notes: notes.length,
				activityLogs: activityLogs.length,
				imports: imports.length,
				settings: settings.length,
			},
			authUsersExcluded: true,
			integrity: {
				checksumAlgorithm: BACKUP_CHECKSUM_ALGORITHM,
				payloadChecksum,
				payloadBytes,
				metadataVersion: 1,
			},
		},
	});

	const fileName = `multi-account-backup-${exportedAt
		.toISOString()
		.replace(/[:.]/g, "-")}.json`;

	return new NextResponse(JSON.stringify(backupPayload, null, 2), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"content-disposition": `attachment; filename="${fileName}"`,
		},
	});
}
