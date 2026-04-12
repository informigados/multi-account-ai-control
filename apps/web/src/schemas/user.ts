import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "operator"]);
export const userLocaleSchema = z.enum(["pt_BR", "en"]);

const usernameSchema = z
	.string()
	.trim()
	.min(3)
	.max(40)
	.regex(/^[a-zA-Z0-9._-]+$/, {
		message:
			"Username must contain only letters, numbers, dot, underscore, or hyphen.",
	});

const emailSchema = z.string().trim().email().max(180);
const passwordSchema = z.string().min(12).max(128);

export const userCreateSchema = z.object({
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema,
	role: userRoleSchema.default("operator"),
	locale: userLocaleSchema.default("pt_BR"),
	isActive: z.boolean().default(true),
});

export const userUpdateSchema = z
	.object({
		username: usernameSchema.optional(),
		email: emailSchema.optional(),
		password: passwordSchema.optional(),
		role: userRoleSchema.optional(),
		locale: userLocaleSchema.optional(),
		isActive: z.boolean().optional(),
	})
	.refine((payload) => Object.keys(payload).length > 0, {
		message: "At least one field must be provided for update.",
	});

export const userSelfUpdateSchema = z
	.object({
		email: emailSchema.optional(),
		password: passwordSchema.optional(),
		locale: userLocaleSchema.optional(),
	})
	.refine((payload) => Object.keys(payload).length > 0, {
		message: "At least one field must be provided for update.",
	});

export const userQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(100),
	cursor: z.string().uuid().optional(),
	search: z.string().trim().max(180).optional(),
});
