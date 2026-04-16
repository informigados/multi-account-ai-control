/**
 * GET /api/auth/desktop-init
 *
 * Desktop-only initialisation endpoint called by the Tauri shell on every
 * app launch (via window.location.replace).  It unconditionally expires the
 * session cookie so the user always lands on the login page with a clean
 * slate, preventing stale cookies from silently auto-routing to the
 * dashboard and producing the "blank page / flickering" symptom.
 */
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function GET() {
	const jar = await cookies();

	// Expire the session cookie if one exists.
	if (jar.has(SESSION_COOKIE_NAME)) {
		jar.delete(SESSION_COOKIE_NAME);
	}

	redirect("/login");
}
