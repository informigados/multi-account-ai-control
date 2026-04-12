import { z } from "zod";

export const passwordResetRequestSchema = z.object({
	email: z.string().trim().email().max(180),
});

export const passwordResetConfirmSchema = z.object({
	token: z.string().trim().min(16).max(512),
	password: z.string().min(12).max(128),
});
