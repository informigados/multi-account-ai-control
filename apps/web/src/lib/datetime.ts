/**
 * Shared datetime utilities used across multiple components.
 *
 * Centralising these helpers avoids duplication between accounts-manager,
 * quick-usage-update, and audit-log-viewer.
 */

/**
 * Converts an ISO-8601 date string to the value expected by an
 * `<input type="datetime-local">` element, adjusted to the local timezone.
 *
 * Returns an empty string for null/invalid inputs.
 */
export function toInputDateTime(isoValue: string | null): string {
	if (!isoValue) return "";
	const date = new Date(isoValue);
	if (Number.isNaN(date.getTime())) return "";
	const pad = (n: number) => n.toString().padStart(2, "0");
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}
