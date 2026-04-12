type UsageSnapshotModel = {
	id: string;
	accountId: string;
	sourceType: string;
	totalQuota: number | null;
	usedQuota: number | null;
	remainingQuota: number | null;
	usedPercent: number | null;
	remainingPercent: number | null;
	requestCount: number | null;
	tokenCount: number | null;
	creditBalance: number | null;
	modelBreakdownJson: unknown;
	measuredAt: Date;
	resetAt: Date | null;
	comments: string | null;
	account?: {
		id: string;
		displayName: string;
		identifier: string;
		provider?: {
			id: string;
			name: string;
			slug: string;
			color: string | null;
		};
	};
};

function toIso(value: Date | null) {
	return value ? value.toISOString() : null;
}

export function presentUsageSnapshot(snapshot: UsageSnapshotModel) {
	return {
		id: snapshot.id,
		accountId: snapshot.accountId,
		sourceType: snapshot.sourceType,
		totalQuota: snapshot.totalQuota,
		usedQuota: snapshot.usedQuota,
		remainingQuota: snapshot.remainingQuota,
		usedPercent: snapshot.usedPercent,
		remainingPercent: snapshot.remainingPercent,
		requestCount: snapshot.requestCount,
		tokenCount: snapshot.tokenCount,
		creditBalance: snapshot.creditBalance,
		modelBreakdown: snapshot.modelBreakdownJson ?? null,
		measuredAt: snapshot.measuredAt.toISOString(),
		resetAt: toIso(snapshot.resetAt),
		comments: snapshot.comments,
		account: snapshot.account,
	};
}
