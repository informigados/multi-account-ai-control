type ActivityLogModel = {
	id: string;
	actorUserId: string | null;
	entityType: string;
	entityId: string | null;
	eventType: string;
	message: string;
	metadataJson: unknown;
	createdAt: Date;
	actor?: {
		id: string;
		username: string;
		email: string;
	} | null;
};

export function presentActivityLog(log: ActivityLogModel) {
	return {
		id: log.id,
		actorUserId: log.actorUserId,
		entityType: log.entityType,
		entityId: log.entityId,
		eventType: log.eventType,
		message: log.message,
		metadata: log.metadataJson ?? null,
		createdAt: log.createdAt.toISOString(),
		actor: log.actor
			? {
					id: log.actor.id,
					username: log.actor.username,
					email: log.actor.email,
				}
			: null,
	};
}
