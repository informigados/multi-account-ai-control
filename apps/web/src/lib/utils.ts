import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | Date | null | undefined) {
	if (!value) return "-";

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";

	return date.toLocaleString();
}
