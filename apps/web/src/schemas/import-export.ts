import { accountStatusSchema } from "@/schemas/account";
import { noteTypeSchema } from "@/schemas/note";
import { providerConnectorTypeSchema } from "@/schemas/provider";
import { usageSourceTypeSchema } from "@/schemas/usage";
import { z } from "zod";

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined));

const optionalNumber = z.number().finite().optional();

export const importProviderSchema = z.object({
	name: z.string().trim().min(2).max(80),
	slug: optionalText(80),
	icon: optionalText(120),
	color: optionalText(32),
	description: optionalText(500),
	connectorType: providerConnectorTypeSchema.optional(),
	isActive: z.boolean().optional(),
});

export const importAccountSchema = z.object({
	providerId: z.string().uuid().optional(),
	providerSlug: optionalText(80),
	providerName: optionalText(80),
	displayName: z.string().trim().min(1).max(120),
	identifier: z.string().trim().min(1).max(180),
	planName: optionalText(120),
	accountType: optionalText(60),
	status: accountStatusSchema.optional(),
	priority: z.number().int().min(1).max(10).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).default([]),
	notesText: optionalText(5000),
	resetIntervalMinutes: z.number().int().positive().optional(),
	nextResetAt: z.coerce.date().optional(),
	encryptedSecretBlob: optionalText(20000),
});

export const importUsageSnapshotSchema = z.object({
	providerId: z.string().uuid().optional(),
	providerSlug: optionalText(80),
	accountIdentifier: z.string().trim().min(1).max(180),
	sourceType: usageSourceTypeSchema.optional(),
	totalQuota: optionalNumber,
	usedQuota: optionalNumber,
	remainingQuota: optionalNumber,
	usedPercent: optionalNumber,
	remainingPercent: optionalNumber,
	requestCount: z.number().int().min(0).optional(),
	tokenCount: z.number().int().min(0).optional(),
	creditBalance: optionalNumber,
	modelBreakdown: z.record(z.string(), z.unknown()).optional(),
	measuredAt: z.coerce.date().optional(),
	resetAt: z.coerce.date().optional(),
	comments: optionalText(2000),
});

export const importJsonSchema = z
	.object({
		fileName: optionalText(180),
		providers: z.array(importProviderSchema).default([]),
		accounts: z.array(importAccountSchema).default([]),
		usageSnapshots: z.array(importUsageSnapshotSchema).default([]),
	})
	.refine(
		(payload) =>
			payload.providers.length > 0 ||
			payload.accounts.length > 0 ||
			payload.usageSnapshots.length > 0,
		{
			message:
				"At least one of providers, accounts, or usageSnapshots must be provided.",
			path: ["providers"],
		},
	);

export const importCsvSchema = z.object({
	fileName: optionalText(180),
	csvText: z.string().min(1),
	delimiter: z.string().default(","),
});

const userRoleSchema = z.enum(["admin", "operator"]);
export const importFileTypeSchema = z.enum(["csv", "json"]);
export const importStatusSchema = z.enum([
	"pending",
	"success",
	"failed",
	"partial",
]);

export const importHistoryQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	cursor: z.string().min(1).max(256).optional(),
	status: importStatusSchema.optional(),
	fileType: importFileTypeSchema.optional(),
	search: z.string().trim().max(180).optional(),
});

const backupUserSchema = z.object({
	id: z.string().uuid(),
	username: z.string().trim().min(1),
	email: z.string().trim().min(1),
	passwordHash: z.string().min(1),
	role: userRoleSchema,
	isActive: z.boolean(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	lastLoginAt: z.coerce.date().nullable().optional(),
});

const backupProviderSchema = z.object({
	id: z.string().uuid(),
	name: z.string().trim().min(1),
	slug: z.string().trim().min(1),
	icon: z.string().nullable().optional(),
	color: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	connectorType: providerConnectorTypeSchema,
	isActive: z.boolean(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

const backupAccountSchema = z.object({
	id: z.string().uuid(),
	providerId: z.string().uuid(),
	displayName: z.string().trim().min(1),
	identifier: z.string().trim().min(1),
	planName: z.string().nullable().optional(),
	accountType: z.string().nullable().optional(),
	status: accountStatusSchema,
	priority: z.number().int(),
	tagsJson: z.unknown().nullable().optional(),
	notesText: z.string().nullable().optional(),
	encryptedSecretBlob: z.string().nullable().optional(),
	resetIntervalMinutes: z.number().int().nullable().optional(),
	nextResetAt: z.coerce.date().nullable().optional(),
	lastSyncAt: z.coerce.date().nullable().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	archivedAt: z.coerce.date().nullable().optional(),
});

const backupUsageSnapshotSchema = z.object({
	id: z.string().uuid(),
	accountId: z.string().uuid(),
	sourceType: usageSourceTypeSchema,
	totalQuota: z.number().nullable().optional(),
	usedQuota: z.number().nullable().optional(),
	remainingQuota: z.number().nullable().optional(),
	usedPercent: z.number().nullable().optional(),
	remainingPercent: z.number().nullable().optional(),
	requestCount: z.number().int().nullable().optional(),
	tokenCount: z.number().int().nullable().optional(),
	creditBalance: z.number().nullable().optional(),
	modelBreakdownJson: z.unknown().nullable().optional(),
	measuredAt: z.coerce.date(),
	resetAt: z.coerce.date().nullable().optional(),
	comments: z.string().nullable().optional(),
});

const backupNoteSchema = z.object({
	id: z.string().uuid(),
	accountId: z.string().uuid(),
	noteType: noteTypeSchema,
	content: z.string().min(1),
	createdBy: z.string().uuid().nullable().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

const backupActivityLogSchema = z.object({
	id: z.string().uuid(),
	actorUserId: z.string().uuid().nullable().optional(),
	entityType: z.string().trim().min(1),
	entityId: z.string().nullable().optional(),
	eventType: z.string().trim().min(1),
	message: z.string().trim().min(1),
	metadataJson: z.unknown().nullable().optional(),
	createdAt: z.coerce.date(),
});

const backupImportSchema = z.object({
	id: z.string().uuid(),
	fileName: z.string().trim().min(1),
	fileType: importFileTypeSchema,
	importedBy: z.string().uuid().nullable().optional(),
	importedAt: z.coerce.date(),
	status: importStatusSchema,
	summaryJson: z.unknown().nullable().optional(),
});

const backupSettingSchema = z.object({
	id: z.string().uuid(),
	key: z.string().trim().min(1),
	valueJson: z.unknown(),
	updatedAt: z.coerce.date(),
});

export const backupDataSchema = z.object({
	users: z.array(backupUserSchema),
	providers: z.array(backupProviderSchema),
	accounts: z.array(backupAccountSchema),
	usageSnapshots: z.array(backupUsageSnapshotSchema),
	notes: z.array(backupNoteSchema),
	activityLogs: z.array(backupActivityLogSchema),
	imports: z.array(backupImportSchema),
	settings: z.array(backupSettingSchema),
});

export const backupArtifactSchema = z.object({
	version: z.number().int().min(1),
	exportType: z.literal("backup"),
	algorithm: z.string().trim().min(1).optional(),
	metadataVersion: z.number().int().min(1).optional(),
	checksumAlgorithm: z.enum(["sha256"]).optional(),
	payloadChecksum: z
		.string()
		.regex(/^[a-fA-F0-9]{64}$/)
		.optional(),
	payloadBytes: z.number().int().positive().optional(),
	encryptedPayload: z.string().min(1),
});

export const backupRestoreRequestSchema = z.object({
	artifact: backupArtifactSchema,
	dryRun: z.boolean().default(false),
	confirmPhrase: z.string().trim().optional(),
});

export const backupPlainPayloadSchema = z.object({
	version: z.number().int().min(1),
	exportType: z.literal("backup"),
	exportedAt: z.coerce.date(),
	data: backupDataSchema,
});

export type BackupDataInput = z.infer<typeof backupDataSchema>;
