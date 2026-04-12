import { z } from "zod";

export const logQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(100),
	cursor: z.string().uuid().optional(),
	entityType: z.string().trim().min(1).max(80).optional(),
	entityId: z.string().uuid().optional(),
	eventType: z.string().trim().min(1).max(120).optional(),
	search: z.string().trim().max(200).optional(),
	actorUserId: z.string().uuid().optional(),
	dateFrom: z.coerce.date().optional(),
	dateTo: z.coerce.date().optional(),
});
