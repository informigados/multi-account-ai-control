import { z } from "zod";

export const accountStatusSchema = z.enum([
	"active",
	"warning",
	"limited",
	"exhausted",
	"disabled",
	"error",
	"archived",
]);

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined));

export const accountSecretPayloadSchema = z
	.object({
		passwordOrToken: optionalText(400),
		apiKey: optionalText(400),
		sessionToken: optionalText(4000),
		cookiesReference: optionalText(4000),
		secretNotes: optionalText(8000),
	})
	.partial()
	.optional();

export const accountCreateSchema = z.object({
	providerId: z.string().uuid(),
	displayName: z.string().trim().min(1).max(120),
	identifier: z.string().trim().min(1).max(180),
	planName: optionalText(120),
	accountType: optionalText(60),
	status: accountStatusSchema.default("active"),
	priority: z.number().int().min(1).max(10).default(5),
	tags: z.array(z.string().trim().min(1).max(40)).default([]),
	notesText: optionalText(5000),
	resetIntervalMinutes: z.number().int().positive().optional(),
	nextResetAt: z.coerce.date().optional(),
	secretPayload: accountSecretPayloadSchema,
});

export const accountUpdateSchema = accountCreateSchema.partial();
export const accountUpdateWithControlSchema = accountUpdateSchema.extend({
	clearSecret: z.boolean().optional(),
});

export const accountQuerySchema = z.object({
	search: z.string().trim().optional(),
	providerId: z.string().uuid().optional(),
	status: accountStatusSchema.optional(),
	tag: z.string().trim().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(24),
	cursor: z.string().uuid().optional(),
	includeArchived: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value === "true"),
});

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type AccountUpdateWithControlInput = z.infer<
	typeof accountUpdateWithControlSchema
>;
