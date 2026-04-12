import { z } from "zod";

export const providerConnectorTypeSchema = z.enum([
	"manual",
	"api",
	"cookie_session",
	"web_automation",
	"custom_script",
]);

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined));

export const providerCreateSchema = z.object({
	name: z.string().trim().min(2).max(80),
	slug: optionalText(80),
	icon: optionalText(120),
	color: optionalText(32),
	description: optionalText(500),
	connectorType: providerConnectorTypeSchema.default("manual"),
	isActive: z.boolean().default(true),
});

export const providerUpdateSchema = providerCreateSchema.partial();

export const providerQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(50),
	cursor: z.string().uuid().optional(),
	activeOnly: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value === "true"),
});

export type ProviderCreateInput = z.infer<typeof providerCreateSchema>;
export type ProviderUpdateInput = z.infer<typeof providerUpdateSchema>;
