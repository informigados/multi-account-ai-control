/**
 * POST /api/usage/quota-alert
 *
 * Called from the frontend when usage monitoring detects a threshold breach.
 * Writes an activity_log entry of type "quota_alert" so operators have an
 * auditable record of every breach — satisfying the roadmap requirement:
 * "Registro do evento quota_alert no activity_log".
 */
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
	accountId: z.string().min(1),
	accountName: z.string().min(1),
	providerName: z.string().default("Unknown"),
	usedPercent: z.number().min(0).max(100),
	threshold: z.number().min(0).max(100),
});

export async function POST(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid payload.", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { accountId, accountName, providerName, usedPercent, threshold } =
		parsed.data;

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		entityId: accountId,
		eventType: "quota_alert",
		message: `Quota alert: ${accountName} (${providerName}) reached ${usedPercent.toFixed(1)}% — threshold ${threshold}%`,
		metadata: {
			accountName,
			providerName,
			usedPercent,
			threshold,
		},
	});

	return NextResponse.json({ ok: true }, { status: 201 });
}
