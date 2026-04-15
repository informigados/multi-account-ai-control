import { db } from "@/lib/db";
import { sanitizeAuditMetadata } from "@/lib/security/audit-redaction";
import type { Prisma } from "@prisma/client";
import { pruneActivityLogsByRetentionPolicy } from "./retention";

export type ActivityLogInput = {
	actorUserId?: string | null;
	entityType: string;
	entityId?: string | null;
	eventType: string;
	message: string;
	metadata?: Prisma.InputJsonValue;
};

export async function writeActivityLog(input: ActivityLogInput) {
	await pruneActivityLogsByRetentionPolicy();

	return db.activityLog.create({
		data: {
			actorUserId: input.actorUserId ?? null,
			entityType: input.entityType,
			entityId: input.entityId ?? null,
			eventType: input.eventType,
			message: input.message,
			metadataJson: sanitizeAuditMetadata(input.metadata),
		},
	});
}
