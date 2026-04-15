import {
	type BackupRestoreSummary,
	restoreBackupData,
	validateBackupData,
} from "@/features/imports-exports/import-export-service";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { decryptSecret } from "@/lib/security/encryption";
import {
	compareHexChecksums,
	computeSha256Hex,
} from "@/lib/security/integrity";
import {
	backupArtifactSchema,
	backupPlainPayloadSchema,
	backupRestoreRequestSchema,
} from "@/schemas/import-export";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

const RESTORE_CONFIRM_PHRASE = "RESTORE BACKUP";

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawBody = (await request.json()) as unknown;
	const wrapperParse = backupRestoreRequestSchema.safeParse(rawBody);

	const parsedInput = wrapperParse.success
		? wrapperParse.data
		: {
				artifact: rawBody,
				dryRun: false,
				confirmPhrase: undefined,
			};

	const artifactParse = backupArtifactSchema.safeParse(parsedInput.artifact);
	if (!artifactParse.success) {
		return NextResponse.json(
			{
				message: "Invalid backup import payload.",
				issues: artifactParse.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const { dryRun, confirmPhrase } = parsedInput;
	if (!dryRun && confirmPhrase !== RESTORE_CONFIRM_PHRASE) {
		return NextResponse.json(
			{
				message: `Restore confirmation required. Send confirmPhrase exactly as "${RESTORE_CONFIRM_PHRASE}".`,
			},
			{ status: 400 },
		);
	}

	let decryptedJsonText = "";
	try {
		decryptedJsonText = decryptSecret(artifactParse.data.encryptedPayload);
	} catch {
		return NextResponse.json(
			{
				message:
					"Unable to decrypt backup payload with current APP_MASTER_KEY.",
			},
			{ status: 400 },
		);
	}

	const payloadBytes = Buffer.byteLength(decryptedJsonText, "utf8");
	const expectedPayloadBytes = artifactParse.data.payloadBytes ?? null;
	if (expectedPayloadBytes !== null && expectedPayloadBytes !== payloadBytes) {
		return NextResponse.json(
			{
				message: "Backup integrity check failed: payload size mismatch.",
			},
			{ status: 400 },
		);
	}

	const expectedChecksum = artifactParse.data.payloadChecksum ?? null;
	const checksumAlgorithm = artifactParse.data.checksumAlgorithm ?? null;
	let checksumVerified = false;
	if (expectedChecksum) {
		if (checksumAlgorithm && checksumAlgorithm !== "sha256") {
			return NextResponse.json(
				{
					message: `Unsupported backup checksum algorithm: ${checksumAlgorithm}.`,
				},
				{ status: 400 },
			);
		}

		const actualChecksum = computeSha256Hex(decryptedJsonText);
		checksumVerified = compareHexChecksums(expectedChecksum, actualChecksum);

		if (!checksumVerified) {
			return NextResponse.json(
				{
					message: "Backup integrity check failed: checksum mismatch.",
				},
				{ status: 400 },
			);
		}
	}

	let plainObject: unknown;
	try {
		plainObject = JSON.parse(decryptedJsonText);
	} catch {
		return NextResponse.json(
			{ message: "Decrypted backup payload is not valid JSON." },
			{ status: 400 },
		);
	}

	const plainParse = backupPlainPayloadSchema.safeParse(plainObject);
	if (!plainParse.success) {
		return NextResponse.json(
			{
				message: "Invalid decrypted backup structure.",
				issues: plainParse.error.flatten(),
			},
			{ status: 400 },
		);
	}

	let summary: BackupRestoreSummary;
	const restoreUsers = false;
	try {
		summary = dryRun
			? validateBackupData(plainParse.data.data)
			: await restoreBackupData(plainParse.data.data, { restoreUsers });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to restore backup.";
		return NextResponse.json({ message }, { status: 400 });
	}

	const actorExists = await db.user.findUnique({
		where: { id: user.id },
		select: { id: true },
	});
	const actorUserId = actorExists ? user.id : null;

	const restoreImport = await db.import.create({
		data: {
			fileName: `${dryRun ? "dry-run-backup" : "restore-backup"}-${new Date()
				.toISOString()
				.replace(/[:.]/g, "-")}.json`,
			fileType: "json",
			importedBy: actorUserId,
			status: "success",
			summaryJson: {
				type: dryRun ? "backup_restore_dry_run" : "backup_restore",
				summary,
				dryRun,
				restoreUsers,
				sourceExportedAt: plainParse.data.exportedAt.toISOString(),
				integrity: {
					checksumVerified,
					checksumProvided: Boolean(expectedChecksum),
					checksumAlgorithm: checksumAlgorithm ?? "sha256",
					payloadBytes,
					expectedPayloadBytes,
					artifactVersion: artifactParse.data.version,
					metadataVersion: artifactParse.data.metadataVersion ?? null,
				},
			} as Prisma.InputJsonValue,
		},
		select: {
			id: true,
		},
	});

	await writeActivityLog({
		actorUserId,
		entityType: "import",
		entityId: restoreImport.id,
		eventType: dryRun ? "import_dry_run" : "import_executed",
		message: dryRun
			? "Encrypted backup restore dry-run executed"
			: "Encrypted backup restored successfully",
		metadata: {
			importId: restoreImport.id,
			fileType: "backup",
			summary,
			dryRun,
			restoreUsers,
			sourceExportedAt: plainParse.data.exportedAt.toISOString(),
			integrity: {
				checksumVerified,
				checksumProvided: Boolean(expectedChecksum),
				checksumAlgorithm: checksumAlgorithm ?? "sha256",
				payloadBytes,
				expectedPayloadBytes,
				artifactVersion: artifactParse.data.version,
				metadataVersion: artifactParse.data.metadataVersion ?? null,
			},
		},
	});

	return NextResponse.json(
		{
			importId: restoreImport.id,
			status: "success",
			dryRun,
			restoreUsers,
			summary,
			integrity: {
				checksumVerified,
				checksumProvided: Boolean(expectedChecksum),
				payloadBytes,
				artifactVersion: artifactParse.data.version,
				metadataVersion: artifactParse.data.metadataVersion ?? null,
			},
		},
		{ status: 200 },
	);
}
