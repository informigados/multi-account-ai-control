import { z } from "zod";

export const noteTypeSchema = z.enum([
	"general",
	"warning",
	"operational",
	"ownership",
]);

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined));

export const noteCreateSchema = z.object({
	noteType: noteTypeSchema.default("general"),
	content: z.string().trim().min(1).max(5000),
});

export const noteUpdateSchema = z
	.object({
		noteType: noteTypeSchema.optional(),
		content: optionalText(5000),
	})
	.refine(
		(payload) =>
			payload.noteType !== undefined || payload.content !== undefined,
		{
			message: "At least one field must be provided.",
			path: ["content"],
		},
	);

export const noteListQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(25),
	cursor: z.string().uuid().optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
