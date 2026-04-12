import { presentUsageSnapshot } from "@/features/usage/usage-presenter";

type AccountModel = {
	id: string;
	providerId: string;
	displayName: string;
	identifier: string;
	planName: string | null;
	accountType: string | null;
	status: string;
	priority: number;
	tagsJson: unknown;
	notesText: string | null;
	resetIntervalMinutes: number | null;
	nextResetAt: Date | null;
	lastSyncAt: Date | null;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	encryptedSecretBlob: string | null;
	usageSnapshots?: Array<{
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
	}>;
	provider?: {
		id: string;
		name: string;
		slug: string;
		color: string | null;
	};
};

function toIso(value: Date | null) {
	return value ? value.toISOString() : null;
}

export function presentAccount(account: AccountModel) {
	const tags = Array.isArray(account.tagsJson)
		? account.tagsJson.filter((tag) => typeof tag === "string")
		: [];
	const latestUsage = account.usageSnapshots?.[0]
		? presentUsageSnapshot(account.usageSnapshots[0])
		: null;

	return {
		id: account.id,
		providerId: account.providerId,
		provider: account.provider,
		displayName: account.displayName,
		identifier: account.identifier,
		planName: account.planName,
		accountType: account.accountType,
		status: account.status,
		priority: account.priority,
		tags,
		notesText: account.notesText,
		resetIntervalMinutes: account.resetIntervalMinutes,
		nextResetAt: toIso(account.nextResetAt),
		lastSyncAt: toIso(account.lastSyncAt),
		archivedAt: toIso(account.archivedAt),
		createdAt: account.createdAt.toISOString(),
		updatedAt: account.updatedAt.toISOString(),
		hasSecret: Boolean(account.encryptedSecretBlob),
		latestUsage,
	};
}
