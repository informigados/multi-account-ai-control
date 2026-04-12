export type UsageSnapshotView = {
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
	modelBreakdown: unknown;
	measuredAt: string;
	resetAt: string | null;
	comments: string | null;
};
