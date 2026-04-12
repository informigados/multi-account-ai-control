import { writeActivityLog } from "@/lib/audit/log";
import {
	getAuditRetentionConfig,
	pruneActivityLogsByRetentionPolicy,
	saveAuditRetentionConfig,
} from "@/lib/audit/retention";
import { requireApiUser } from "@/lib/auth/require-auth";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import {
	AUDIT_RETENTION_DAYS_OPTIONS,
	auditRetentionUpdateSchema,
} from "@/schemas/settings";
import { type NextRequest, NextResponse } from "next/server";

function ensureAdmin(role: string) {
	return role === "admin";
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const config = await getAuditRetentionConfig();

	return NextResponse.json(
		{
			config,
			options: AUDIT_RETENTION_DAYS_OPTIONS,
		},
		{ status: 200 },
	);
}

export async function PATCH(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	if (!ensureAdmin(user.role)) {
		return NextResponse.json({ message: "Forbidden." }, { status: 403 });
	}

	const parseResult = auditRetentionUpdateSchema.safeParse(
		await request.json(),
	);
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid audit retention payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const config = await saveAuditRetentionConfig(parseResult.data);
	await pruneActivityLogsByRetentionPolicy({ force: true });

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "app_setting",
		entityId: null,
		eventType: "audit_retention_updated",
		message: `Audit retention policy updated to ${config.enabled ? `${config.days} days` : "disabled"}`,
		metadata: {
			auditRetention: config,
		},
	});

	return NextResponse.json(
		{
			config,
			options: AUDIT_RETENTION_DAYS_OPTIONS,
		},
		{ status: 200 },
	);
}
