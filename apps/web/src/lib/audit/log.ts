import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ActivityLogInput = {
	actorUserId?: string | null;
	entityType: string;
	entityId?: string | null;
	eventType: string;
	message: string;
	metadata?: Prisma.InputJsonValue;
};

export async function writeActivityLog(input: ActivityLogInput) {
	return db.activityLog.create({
		data: {
			actorUserId: input.actorUserId ?? null,
			entityType: input.entityType,
			entityId: input.entityId ?? null,
			eventType: input.eventType,
			message: input.message,
			metadataJson: input.metadata ?? {},
		},
	});
}
