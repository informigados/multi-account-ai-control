import { normalizeTags, toSlug } from "@/lib/normalization";

export type CsvParseResult = {
	headers: string[];
	rows: Array<Record<string, string>>;
};

function normalizeHeader(value: string) {
	return value.trim().toLowerCase();
}

function parseCsvLine(line: string, delimiter: string) {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];

		if (char === '"') {
			if (inQuotes && line[index + 1] === '"') {
				current += '"';
				index += 1;
				continue;
			}

			inQuotes = !inQuotes;
			continue;
		}

		if (char === delimiter && !inQuotes) {
			values.push(current.trim());
			current = "";
			continue;
		}

		current += char;
	}

	values.push(current.trim());
	return values;
}

export function parseCsvToRows(
	csvText: string,
	delimiter = ",",
): CsvParseResult {
	const lines = csvText
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return { headers: [], rows: [] };
	}

	const rawHeaders = parseCsvLine(lines[0], delimiter);
	const headers = rawHeaders.map(normalizeHeader);
	const rows: Array<Record<string, string>> = [];

	for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
		const rawValues = parseCsvLine(lines[lineIndex], delimiter);
		const row: Record<string, string> = {};

		for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
			const header = headers[columnIndex];
			row[header] = rawValues[columnIndex]?.trim() ?? "";
		}

		rows.push(row);
	}

	return { headers, rows };
}

function escapeCsvValue(value: string) {
	if (value.includes('"')) {
		return `"${value.replace(/"/g, '""')}"`;
	}

	if (value.includes(",") || value.includes("\n")) {
		return `"${value}"`;
	}

	return value;
}

export function buildCsv(
	headers: string[],
	rows: Array<Record<string, string | number | null | undefined>>,
) {
	const normalizedHeaders = headers.map((header) => header.trim());
	const headerRow = normalizedHeaders.join(",");
	const bodyRows = rows.map((row) =>
		normalizedHeaders
			.map((header) => {
				const value = row[header];
				if (value === null || value === undefined) return "";
				return escapeCsvValue(String(value));
			})
			.join(","),
	);

	return [headerRow, ...bodyRows].join("\n");
}

function parseNumber(value: string | undefined) {
	if (!value) return undefined;
	const normalized = value.trim();
	if (!normalized) return undefined;
	const number = Number(normalized);
	return Number.isFinite(number) ? number : undefined;
}

function parseDate(value: string | undefined) {
	if (!value) return undefined;
	const normalized = value.trim();
	if (!normalized) return undefined;
	const parsed = new Date(normalized);
	if (Number.isNaN(parsed.getTime())) return undefined;
	return parsed;
}

export type CsvImportedAccount = {
	providerSlug?: string;
	providerName?: string;
	displayName: string;
	identifier: string;
	planName?: string;
	accountType?: string;
	status?:
		| "active"
		| "warning"
		| "limited"
		| "exhausted"
		| "disabled"
		| "error"
		| "archived";
	priority?: number;
	tags: string[];
	notesText?: string;
	resetIntervalMinutes?: number;
	nextResetAt?: Date;
};

type MappedCsvAccount =
	| {
			ok: true;
			account: CsvImportedAccount;
	  }
	| {
			ok: false;
			error: string;
	  };

export function mapCsvRowToAccount(
	row: Record<string, string>,
): MappedCsvAccount {
	const displayName = row.displayname?.trim() ?? "";
	const identifier = row.identifier?.trim() ?? "";
	if (!displayName || !identifier) {
		return {
			ok: false,
			error:
				"displayName and identifier are required columns with non-empty values.",
		};
	}

	const providerSlugRaw = row.providerslug?.trim();
	const providerNameRaw = row.providername?.trim();
	const planName = row.planname?.trim();
	const accountType = row.accounttype?.trim();
	const statusRaw = row.status?.trim().toLowerCase();
	const statusOptions = new Set([
		"active",
		"warning",
		"limited",
		"exhausted",
		"disabled",
		"error",
		"archived",
	]);
	const status =
		statusRaw && statusOptions.has(statusRaw)
			? (statusRaw as CsvImportedAccount["status"])
			: undefined;
	const priority = parseNumber(row.priority);
	const nextResetAt = parseDate(row.nextresetat);
	const resetIntervalMinutes = parseNumber(row.resetintervalminutes);
	const tagsText = row.tags?.trim() ?? "";

	const result: CsvImportedAccount = {
		providerSlug: providerSlugRaw ? toSlug(providerSlugRaw) : undefined,
		providerName: providerNameRaw || undefined,
		displayName,
		identifier,
		planName: planName || undefined,
		accountType: accountType || undefined,
		status,
		priority: priority ? Math.trunc(priority) : undefined,
		tags: normalizeTags(
			tagsText
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
		notesText: row.notestext?.trim() || undefined,
		resetIntervalMinutes: resetIntervalMinutes
			? Math.trunc(resetIntervalMinutes)
			: undefined,
		nextResetAt,
	};

	if (!result.providerSlug && !result.providerName) {
		return {
			ok: false,
			error: "providerSlug or providerName is required for each account row.",
		};
	}

	return { ok: true, account: result };
}
