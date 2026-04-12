import { z } from "zod";

export const usageSourceTypeSchema = z.enum(["manual", "import", "connector"]);

const nullableNumber = z.number().finite().optional();

export const usageCreateSchema = z
	.object({
		sourceType: usageSourceTypeSchema.default("manual"),
		totalQuota: nullableNumber,
		usedQuota: nullableNumber,
		remainingQuota: nullableNumber,
		usedPercent: nullableNumber,
		remainingPercent: nullableNumber,
		requestCount: z.number().int().min(0).optional(),
		tokenCount: z.number().int().min(0).optional(),
		creditBalance: nullableNumber,
		modelBreakdown: z.record(z.string(), z.unknown()).optional(),
		measuredAt: z.coerce.date().optional(),
		resetAt: z.coerce.date().optional(),
		comments: z
			.string()
			.trim()
			.max(2000)
			.optional()
			.transform((value) => (value && value.length > 0 ? value : undefined)),
	})
	.refine(
		(payload) =>
			payload.totalQuota !== undefined ||
			payload.usedQuota !== undefined ||
			payload.remainingQuota !== undefined ||
			payload.usedPercent !== undefined ||
			payload.remainingPercent !== undefined ||
			payload.requestCount !== undefined ||
			payload.tokenCount !== undefined ||
			payload.creditBalance !== undefined ||
			payload.modelBreakdown !== undefined ||
			payload.comments !== undefined,
		{
			message: "At least one usage metric is required.",
			path: ["totalQuota"],
		},
	);

export const usageRecentQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	cursor: z.string().uuid().optional(),
	accountId: z.string().uuid().optional(),
});

export type UsageCreateInput = z.infer<typeof usageCreateSchema>;
