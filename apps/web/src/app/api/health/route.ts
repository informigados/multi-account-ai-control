/**
 * GET /api/health
 *
 * Rich system health endpoint — returns live database metrics and subsystem
 * status for diagnostic and monitoring purposes.
 *
 * Public metadata (status, version, uptime) is always returned.
 * Detailed metrics (account counts, quota stats, recent alerts) are only
 * returned when the request is authenticated.
 *
 * Response shape:
 * {
 *   status: "ok" | "degraded" | "error"
 *   version: string
 *   timestamp: string (ISO)
 *   uptime: number (seconds since process start)
 *   db: "ok" | "error"
 *   metrics?: {
 *     accounts: { total, active, archived }
 *     providers: { total, active }
 *     snapshots: { total, last24h }
 *     alerts: { last24h }
 *     totp: { entries }
 *     backups: { stored }
 *   }
 * }
 */
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

const START_TIME = Date.now();
const VERSION = process.env.npm_package_version ?? "1.1.0";

export async function GET(request: NextRequest) {
	const timestamp = new Date().toISOString();
	const uptime = Math.round((Date.now() - START_TIME) / 1000);

	// ── Database connectivity check ──────────────────────────────────────────
	let dbStatus: "ok" | "error" = "ok";
	try {
		await db.$queryRaw`SELECT 1`;
	} catch {
		dbStatus = "error";
	}

	const overallStatus = dbStatus === "ok" ? "ok" : "degraded";

	// ── Try to get authenticated user for detailed metrics ───────────────────
	const user = await requireApiUser(request);

	if (!user || dbStatus === "error") {
		return NextResponse.json(
			{
				status: overallStatus,
				version: VERSION,
				timestamp,
				uptime,
				db: dbStatus,
			},
			{ status: overallStatus === "ok" ? 200 : 503 },
		);
	}

	// ── Detailed metrics (authenticated only) ────────────────────────────────
	const now = new Date();
	const yesterday = new Date(now.getTime() - 86_400_000);

	const [
		accountsActive,
		accountsArchived,
		providersTotal,
		providersActive,
		snapshotsTotal,
		snapshots24h,
		alerts24h,
		totpSetting,
		backupSetting,
	] = await Promise.all([
		db.account.count({ where: { status: "active" } }),
		db.account.count({ where: { status: "archived" } }),
		db.provider.count(),
		db.provider.count({ where: { isActive: true } }),
		db.usageSnapshot.count(),
		db.usageSnapshot.count({ where: { measuredAt: { gte: yesterday } } }),
		db.activityLog.count({
			where: {
				eventType: "quota_alert",
				createdAt: { gte: yesterday },
			},
		}),
		db.appSetting.findUnique({ where: { key: "app.totp_entries" } }),
		db.appSetting.findUnique({ where: { key: "app.backup_schedule_log" } }),
	]);

	// Count TOTP entries from the JSON array
	const totpEntries = Array.isArray(totpSetting?.valueJson)
		? (totpSetting.valueJson as unknown[]).length
		: 0;

	// Count backup entries from the JSON array
	const backupsStored = Array.isArray(backupSetting?.valueJson)
		? (backupSetting.valueJson as unknown[]).length
		: 0;

	return NextResponse.json(
		{
			status: overallStatus,
			version: VERSION,
			timestamp,
			uptime,
			db: dbStatus,
			metrics: {
				accounts: {
					total: accountsActive + accountsArchived,
					active: accountsActive,
					archived: accountsArchived,
				},
				providers: {
					total: providersTotal,
					active: providersActive,
				},
				snapshots: {
					total: snapshotsTotal,
					last24h: snapshots24h,
				},
				alerts: {
					last24h: alerts24h,
				},
				totp: {
					entries: totpEntries,
				},
				backups: {
					stored: backupsStored,
				},
			},
		},
		{ status: 200 },
	);
}
