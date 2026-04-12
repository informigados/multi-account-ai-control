import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import {
	getIdleLockConfig,
	saveIdleLockConfig,
} from "@/lib/security/idle-lock";
import {
	DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
	IDLE_LOCK_TIMEOUT_MINUTES_MAX,
	IDLE_LOCK_TIMEOUT_MINUTES_MIN,
	idleLockUpdateSchema,
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

	const config = await getIdleLockConfig();

	return NextResponse.json(
		{
			config,
			limits: {
				timeoutMinutesMin: IDLE_LOCK_TIMEOUT_MINUTES_MIN,
				timeoutMinutesMax: IDLE_LOCK_TIMEOUT_MINUTES_MAX,
				defaultTimeoutMinutes: DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
			},
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

	const parseResult = idleLockUpdateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid idle lock payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const config = await saveIdleLockConfig(parseResult.data);

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "app_setting",
		entityId: null,
		eventType: "idle_lock_updated",
		message: `Idle lock updated: ${config.enabled ? `${config.timeoutMinutes} min` : "disabled"} / password=${config.requirePasswordOnUnlock}`,
		metadata: {
			idleLock: config,
		},
	});

	return NextResponse.json(
		{
			config,
			limits: {
				timeoutMinutesMin: IDLE_LOCK_TIMEOUT_MINUTES_MIN,
				timeoutMinutesMax: IDLE_LOCK_TIMEOUT_MINUTES_MAX,
				defaultTimeoutMinutes: DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
			},
		},
		{ status: 200 },
	);
}
