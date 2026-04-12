import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { type AppLocale, DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n";
import { cookies } from "next/headers";

export async function getAppDefaultLocale(): Promise<AppLocale> {
	let setting: { valueJson: unknown } | null = null;
	try {
		setting = await db.appSetting.findUnique({
			where: { key: "ui.locale.default" },
			select: { valueJson: true },
		});
	} catch {
		return DEFAULT_LOCALE;
	}

	if (
		!setting ||
		typeof setting.valueJson !== "object" ||
		setting.valueJson === null
	) {
		return DEFAULT_LOCALE;
	}

	const localeValue = (setting.valueJson as { locale?: unknown }).locale;
	if (typeof localeValue !== "string") {
		return DEFAULT_LOCALE;
	}

	return normalizeLocale(localeValue);
}

export async function getRequestLocale(): Promise<AppLocale> {
	const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
	if (!sessionToken) {
		return DEFAULT_LOCALE;
	}

	const payload = verifySessionToken(sessionToken);
	if (!payload) {
		return DEFAULT_LOCALE;
	}

	const user = await db.user.findUnique({
		where: { id: payload.sub },
		select: { locale: true },
	});

	if (!user) {
		return DEFAULT_LOCALE;
	}

	return normalizeLocale(user.locale);
}
