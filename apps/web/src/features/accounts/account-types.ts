import type { UsageSnapshotView } from "@/features/usage/usage-types";

export type ProviderSummary = {
	id: string;
	name: string;
	slug: string;
	color: string | null;
	isActive?: boolean;
};

export type AccountStatus =
	| "active"
	| "warning"
	| "limited"
	| "exhausted"
	| "disabled"
	| "error"
	| "archived";

export type AccountView = {
	id: string;
	providerId: string;
	provider?: ProviderSummary;
	displayName: string;
	identifier: string;
	planName: string | null;
	accountType: string | null;
	status: string;
	priority: number;
	tags: string[];
	notesText: string | null;
	resetIntervalMinutes: number | null;
	nextResetAt: string | null;
	lastSyncAt: string | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	hasSecret: boolean;
	latestUsage: UsageSnapshotView | null;
};
