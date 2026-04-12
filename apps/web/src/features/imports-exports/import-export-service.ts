import { db } from "@/lib/db";
import { normalizeTags, toSlug } from "@/lib/normalization";
import { normalizeUsagePayload } from "@/lib/usage/normalize";
import type { BackupDataInput } from "@/schemas/import-export";
import type {
	AccountStatus,
	ImportStatus,
	Prisma,
	ProviderConnectorType,
} from "@prisma/client";

type ProviderInput = {
	name: string;
	slug?: string;
	icon?: string;
	color?: string;
	description?: string;
	connectorType?: ProviderConnectorType;
	isActive?: boolean;
};

type AccountInput = {
	providerId?: string;
	providerSlug?: string;
	providerName?: string;
	displayName: string;
	identifier: string;
	planName?: string;
	accountType?: string;
	status?: AccountStatus;
	priority?: number;
	tags?: string[];
	notesText?: string;
	resetIntervalMinutes?: number;
	nextResetAt?: Date;
	encryptedSecretBlob?: string;
};

type UsageInput = {
	providerId?: string;
	providerSlug?: string;
	accountIdentifier: string;
	sourceType?: "manual" | "import" | "connector";
	totalQuota?: number;
	usedQuota?: number;
	remainingQuota?: number;
	usedPercent?: number;
	remainingPercent?: number;
	requestCount?: number;
	tokenCount?: number;
	creditBalance?: number;
	modelBreakdown?: Record<string, unknown>;
	measuredAt?: Date;
	resetAt?: Date;
	comments?: string;
};

type ImportExecutionInput = {
	providers?: ProviderInput[];
	accounts?: AccountInput[];
	usageSnapshots?: UsageInput[];
};

export type ImportExecutionSummary = {
	providers: {
		total: number;
		created: number;
		updated: number;
		failed: number;
	};
	accounts: {
		total: number;
		created: number;
		updated: number;
		failed: number;
	};
	usageSnapshots: {
		total: number;
		created: number;
		failed: number;
	};
	errors: Array<{
		section: "providers" | "accounts" | "usageSnapshots";
		index: number;
		message: string;
	}>;
};

type ImportStatusSummary = Pick<
	ImportExecutionSummary,
	"providers" | "accounts" | "usageSnapshots"
>;

export function resolveImportStatus(summary: ImportStatusSummary) {
	const successCount =
		summary.providers.created +
		summary.providers.updated +
		summary.accounts.created +
		summary.accounts.updated +
		summary.usageSnapshots.created;
	const failedCount =
		summary.providers.failed +
		summary.accounts.failed +
		summary.usageSnapshots.failed;

	if (failedCount === 0) return "success" satisfies ImportStatus;
	if (successCount === 0) return "failed" satisfies ImportStatus;
	return "partial" satisfies ImportStatus;
}

type ProviderRef = {
	id: string;
	name: string;
	slug: string;
};

async function getProviderMap() {
	const providers = await db.provider.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
		},
	});

	return {
		byId: new Map(providers.map((provider) => [provider.id, provider])),
		bySlug: new Map(providers.map((provider) => [provider.slug, provider])),
		byName: new Map(
			providers.map((provider) => [
				provider.name.trim().toLowerCase(),
				provider,
			]),
		),
	};
}

async function resolveOrCreateProvider(
	input: Pick<AccountInput, "providerId" | "providerSlug" | "providerName">,
	providerMap: Awaited<ReturnType<typeof getProviderMap>>,
) {
	if (input.providerId) {
		const found = providerMap.byId.get(input.providerId);
		if (found) return found;
	}

	if (input.providerSlug) {
		const slug = toSlug(input.providerSlug);
		const foundBySlug = providerMap.bySlug.get(slug);
		if (foundBySlug) return foundBySlug;

		const fallbackName = input.providerName?.trim() || slug;
		const created = await db.provider.create({
			data: {
				name: fallbackName,
				slug,
				connectorType: "manual",
				isActive: true,
			},
			select: {
				id: true,
				name: true,
				slug: true,
			},
		});

		providerMap.byId.set(created.id, created);
		providerMap.bySlug.set(created.slug, created);
		providerMap.byName.set(created.name.trim().toLowerCase(), created);
		return created;
	}

	if (input.providerName) {
		const normalizedName = input.providerName.trim().toLowerCase();
		const foundByName = providerMap.byName.get(normalizedName);
		if (foundByName) return foundByName;

		const slug = toSlug(input.providerName);
		if (!slug) return null;

		const existingBySlug = providerMap.bySlug.get(slug);
		if (existingBySlug) {
			return existingBySlug;
		}

		const created = await db.provider.create({
			data: {
				name: input.providerName.trim(),
				slug,
				connectorType: "manual",
				isActive: true,
			},
			select: {
				id: true,
				name: true,
				slug: true,
			},
		});

		providerMap.byId.set(created.id, created);
		providerMap.bySlug.set(created.slug, created);
		providerMap.byName.set(created.name.trim().toLowerCase(), created);
		return created;
	}

	return null;
}

async function upsertProvider(input: ProviderInput) {
	const slug = toSlug(input.slug ?? input.name);
	if (!slug) throw new Error("Unable to derive provider slug.");

	return db.provider.upsert({
		where: { slug },
		update: {
			name: input.name.trim(),
			icon: input.icon,
			color: input.color,
			description: input.description,
			connectorType: input.connectorType ?? "manual",
			isActive: input.isActive ?? true,
		},
		create: {
			name: input.name.trim(),
			slug,
			icon: input.icon,
			color: input.color,
			description: input.description,
			connectorType: input.connectorType ?? "manual",
			isActive: input.isActive ?? true,
		},
		select: {
			id: true,
			name: true,
			slug: true,
		},
	});
}

async function upsertAccount(input: AccountInput, provider: ProviderRef) {
	const existing = await db.account.findUnique({
		where: {
			providerId_identifier: {
				providerId: provider.id,
				identifier: input.identifier,
			},
		},
		select: { id: true },
	});

	const normalizedTags = normalizeTags(input.tags ?? []);
	const account = await db.account.upsert({
		where: {
			providerId_identifier: {
				providerId: provider.id,
				identifier: input.identifier,
			},
		},
		update: {
			displayName: input.displayName,
			planName: input.planName,
			accountType: input.accountType,
			status: input.status,
			priority: input.priority,
			tagsJson: normalizedTags,
			notesText: input.notesText,
			resetIntervalMinutes: input.resetIntervalMinutes,
			nextResetAt: input.nextResetAt,
			encryptedSecretBlob: input.encryptedSecretBlob,
			archivedAt: input.status === "archived" ? new Date() : undefined,
		},
		create: {
			providerId: provider.id,
			displayName: input.displayName,
			identifier: input.identifier,
			planName: input.planName,
			accountType: input.accountType,
			status: input.status ?? "active",
			priority: input.priority ?? 5,
			tagsJson: normalizedTags,
			notesText: input.notesText,
			resetIntervalMinutes: input.resetIntervalMinutes,
			nextResetAt: input.nextResetAt,
			encryptedSecretBlob: input.encryptedSecretBlob,
			archivedAt: input.status === "archived" ? new Date() : null,
		},
		select: {
			id: true,
			displayName: true,
		},
	});

	return { account, created: !existing };
}

async function resolveAccountForUsage(
	input: UsageInput,
	providerMap: Awaited<ReturnType<typeof getProviderMap>>,
) {
	let providerId = input.providerId;

	if (!providerId && input.providerSlug) {
		const bySlug = providerMap.bySlug.get(toSlug(input.providerSlug));
		providerId = bySlug?.id;
	}

	const where: Prisma.AccountWhereInput = providerId
		? {
				providerId,
				identifier: input.accountIdentifier,
			}
		: {
				identifier: input.accountIdentifier,
			};

	return db.account.findFirst({
		where,
		select: {
			id: true,
		},
	});
}

export async function executeImportData(
	input: ImportExecutionInput,
): Promise<ImportExecutionSummary> {
	const summary: ImportExecutionSummary = {
		providers: { total: 0, created: 0, updated: 0, failed: 0 },
		accounts: { total: 0, created: 0, updated: 0, failed: 0 },
		usageSnapshots: { total: 0, created: 0, failed: 0 },
		errors: [],
	};

	const providers = input.providers ?? [];
	const accounts = input.accounts ?? [];
	const usageSnapshots = input.usageSnapshots ?? [];
	const providerMap = await getProviderMap();

	summary.providers.total = providers.length;
	for (let index = 0; index < providers.length; index += 1) {
		const provider = providers[index];

		try {
			const slug = toSlug(provider.slug ?? provider.name);
			const existing = slug ? providerMap.bySlug.get(slug) : null;
			const upserted = await upsertProvider(provider);

			if (existing) {
				summary.providers.updated += 1;
			} else {
				summary.providers.created += 1;
			}

			providerMap.byId.set(upserted.id, upserted);
			providerMap.bySlug.set(upserted.slug, upserted);
			providerMap.byName.set(upserted.name.trim().toLowerCase(), upserted);
		} catch (error) {
			summary.providers.failed += 1;
			summary.errors.push({
				section: "providers",
				index,
				message:
					error instanceof Error ? error.message : "Invalid provider row.",
			});
		}
	}

	summary.accounts.total = accounts.length;
	for (let index = 0; index < accounts.length; index += 1) {
		const account = accounts[index];

		try {
			const provider = await resolveOrCreateProvider(account, providerMap);
			if (!provider) {
				throw new Error("Unable to resolve provider for account row.");
			}

			const result = await upsertAccount(account, provider);
			if (result.created) {
				summary.accounts.created += 1;
			} else {
				summary.accounts.updated += 1;
			}
		} catch (error) {
			summary.accounts.failed += 1;
			summary.errors.push({
				section: "accounts",
				index,
				message:
					error instanceof Error ? error.message : "Invalid account row.",
			});
		}
	}

	summary.usageSnapshots.total = usageSnapshots.length;
	for (let index = 0; index < usageSnapshots.length; index += 1) {
		const usage = usageSnapshots[index];

		try {
			const account = await resolveAccountForUsage(usage, providerMap);
			if (!account) {
				throw new Error("Unable to resolve account for usage row.");
			}

			const normalized = normalizeUsagePayload({
				sourceType: usage.sourceType ?? "import",
				totalQuota: usage.totalQuota,
				usedQuota: usage.usedQuota,
				remainingQuota: usage.remainingQuota,
				usedPercent: usage.usedPercent,
				remainingPercent: usage.remainingPercent,
				requestCount: usage.requestCount,
				tokenCount: usage.tokenCount,
				creditBalance: usage.creditBalance,
				modelBreakdown: usage.modelBreakdown,
				measuredAt: usage.measuredAt,
				resetAt: usage.resetAt,
				comments: usage.comments,
			});

			await db.usageSnapshot.create({
				data: {
					accountId: account.id,
					sourceType: normalized.sourceType,
					totalQuota: normalized.totalQuota,
					usedQuota: normalized.usedQuota,
					remainingQuota: normalized.remainingQuota,
					usedPercent: normalized.usedPercent,
					remainingPercent: normalized.remainingPercent,
					requestCount: normalized.requestCount,
					tokenCount: normalized.tokenCount,
					creditBalance: normalized.creditBalance,
					modelBreakdownJson: normalized.modelBreakdownJson
						? (normalized.modelBreakdownJson as Prisma.InputJsonValue)
						: undefined,
					measuredAt: normalized.measuredAt,
					resetAt: normalized.resetAt,
					comments: normalized.comments,
				},
			});

			await db.account.update({
				where: { id: account.id },
				data: {
					lastSyncAt: normalized.measuredAt,
					nextResetAt: normalized.resetAt ?? undefined,
				},
			});

			summary.usageSnapshots.created += 1;
		} catch (error) {
			summary.usageSnapshots.failed += 1;
			summary.errors.push({
				section: "usageSnapshots",
				index,
				message: error instanceof Error ? error.message : "Invalid usage row.",
			});
		}
	}

	return summary;
}

export type BackupRestoreSummary = {
	usersInBackup: number;
	usersRestored: number;
	providers: number;
	accounts: number;
	usageSnapshots: number;
	notes: number;
	activityLogs: number;
	imports: number;
	settings: number;
};

function buildBackupRestoreSummary(
	data: BackupDataInput,
	usersRestored: number,
): BackupRestoreSummary {
	return {
		usersInBackup: data.users.length,
		usersRestored,
		providers: data.providers.length,
		accounts: data.accounts.length,
		usageSnapshots: data.usageSnapshots.length,
		notes: data.notes.length,
		activityLogs: data.activityLogs.length,
		imports: data.imports.length,
		settings: data.settings.length,
	};
}

function assertReferenceIntegrity(data: BackupDataInput) {
	const providerIds = new Set(data.providers.map((provider) => provider.id));
	for (const account of data.accounts) {
		if (!providerIds.has(account.providerId)) {
			throw new Error(
				`Backup integrity error: account ${account.id} references missing provider ${account.providerId}.`,
			);
		}
	}

	const accountIds = new Set(data.accounts.map((account) => account.id));
	for (const snapshot of data.usageSnapshots) {
		if (!accountIds.has(snapshot.accountId)) {
			throw new Error(
				`Backup integrity error: usage snapshot ${snapshot.id} references missing account ${snapshot.accountId}.`,
			);
		}
	}

	for (const note of data.notes) {
		if (!accountIds.has(note.accountId)) {
			throw new Error(
				`Backup integrity error: note ${note.id} references missing account ${note.accountId}.`,
			);
		}
	}
}

export function validateBackupData(
	data: BackupDataInput,
): BackupRestoreSummary {
	assertReferenceIntegrity(data);
	return buildBackupRestoreSummary(data, 0);
}

type RestoreBackupOptions = {
	restoreUsers?: boolean;
};

export async function restoreBackupData(
	data: BackupDataInput,
	options?: RestoreBackupOptions,
): Promise<BackupRestoreSummary> {
	assertReferenceIntegrity(data);

	const restoreUsers = options?.restoreUsers ?? false;
	const userIds = new Set(
		restoreUsers ? data.users.map((user) => user.id) : [],
	);

	await db.$transaction(
		async (tx) => {
			await tx.usageSnapshot.deleteMany();
			await tx.note.deleteMany();
			await tx.account.deleteMany();
			await tx.provider.deleteMany();
			await tx.activityLog.deleteMany();
			await tx.import.deleteMany();
			await tx.appSetting.deleteMany();

			if (restoreUsers) {
				await tx.user.deleteMany();
			}

			if (restoreUsers && data.users.length > 0) {
				await tx.user.createMany({
					data: data.users.map((user) => ({
						id: user.id,
						username: user.username,
						email: user.email,
						passwordHash: user.passwordHash,
						role: user.role,
						isActive: user.isActive,
						createdAt: user.createdAt,
						updatedAt: user.updatedAt,
						lastLoginAt: user.lastLoginAt ?? null,
					})),
				});
			}

			if (data.providers.length > 0) {
				await tx.provider.createMany({
					data: data.providers.map((provider) => ({
						id: provider.id,
						name: provider.name,
						slug: provider.slug,
						icon: provider.icon ?? null,
						color: provider.color ?? null,
						description: provider.description ?? null,
						connectorType: provider.connectorType,
						isActive: provider.isActive,
						createdAt: provider.createdAt,
						updatedAt: provider.updatedAt,
					})),
				});
			}

			if (data.accounts.length > 0) {
				await tx.account.createMany({
					data: data.accounts.map((account) => ({
						id: account.id,
						providerId: account.providerId,
						displayName: account.displayName,
						identifier: account.identifier,
						planName: account.planName ?? null,
						accountType: account.accountType ?? null,
						status: account.status,
						priority: account.priority,
						tagsJson:
							account.tagsJson === null || account.tagsJson === undefined
								? undefined
								: (account.tagsJson as Prisma.InputJsonValue),
						notesText: account.notesText ?? null,
						encryptedSecretBlob: account.encryptedSecretBlob ?? null,
						resetIntervalMinutes: account.resetIntervalMinutes ?? null,
						nextResetAt: account.nextResetAt ?? null,
						lastSyncAt: account.lastSyncAt ?? null,
						createdAt: account.createdAt,
						updatedAt: account.updatedAt,
						archivedAt: account.archivedAt ?? null,
					})),
				});
			}

			if (data.usageSnapshots.length > 0) {
				await tx.usageSnapshot.createMany({
					data: data.usageSnapshots.map((snapshot) => ({
						id: snapshot.id,
						accountId: snapshot.accountId,
						sourceType: snapshot.sourceType,
						totalQuota: snapshot.totalQuota ?? null,
						usedQuota: snapshot.usedQuota ?? null,
						remainingQuota: snapshot.remainingQuota ?? null,
						usedPercent: snapshot.usedPercent ?? null,
						remainingPercent: snapshot.remainingPercent ?? null,
						requestCount: snapshot.requestCount ?? null,
						tokenCount: snapshot.tokenCount ?? null,
						creditBalance: snapshot.creditBalance ?? null,
						modelBreakdownJson:
							snapshot.modelBreakdownJson === null ||
							snapshot.modelBreakdownJson === undefined
								? undefined
								: (snapshot.modelBreakdownJson as Prisma.InputJsonValue),
						measuredAt: snapshot.measuredAt,
						resetAt: snapshot.resetAt ?? null,
						comments: snapshot.comments ?? null,
					})),
				});
			}

			if (data.notes.length > 0) {
				await tx.note.createMany({
					data: data.notes.map((note) => ({
						id: note.id,
						accountId: note.accountId,
						noteType: note.noteType,
						content: note.content,
						createdBy:
							note.createdBy && userIds.has(note.createdBy)
								? note.createdBy
								: null,
						createdAt: note.createdAt,
						updatedAt: note.updatedAt,
					})),
				});
			}

			if (data.imports.length > 0) {
				await tx.import.createMany({
					data: data.imports.map((importRow) => ({
						id: importRow.id,
						fileName: importRow.fileName,
						fileType: importRow.fileType,
						importedBy:
							importRow.importedBy && userIds.has(importRow.importedBy)
								? importRow.importedBy
								: null,
						importedAt: importRow.importedAt,
						status: importRow.status,
						summaryJson:
							importRow.summaryJson === null ||
							importRow.summaryJson === undefined
								? undefined
								: (importRow.summaryJson as Prisma.InputJsonValue),
					})),
				});
			}

			if (data.settings.length > 0) {
				await tx.appSetting.createMany({
					data: data.settings.map((setting) => ({
						id: setting.id,
						key: setting.key,
						valueJson: setting.valueJson as Prisma.InputJsonValue,
						updatedAt: setting.updatedAt,
					})),
				});
			}

			if (data.activityLogs.length > 0) {
				await tx.activityLog.createMany({
					data: data.activityLogs.map((log) => ({
						id: log.id,
						actorUserId:
							log.actorUserId && userIds.has(log.actorUserId)
								? log.actorUserId
								: null,
						entityType: log.entityType,
						entityId: log.entityId ?? null,
						eventType: log.eventType,
						message: log.message,
						metadataJson:
							log.metadataJson === null || log.metadataJson === undefined
								? undefined
								: (log.metadataJson as Prisma.InputJsonValue),
						createdAt: log.createdAt,
					})),
				});
			}
		},
		{ timeout: 120_000 },
	);

	return buildBackupRestoreSummary(data, restoreUsers ? data.users.length : 0);
}
