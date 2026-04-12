export function toSlug(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

export function normalizeTags(values: string[] | undefined) {
	if (!values) return [];

	const unique = new Set(
		values
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag) => tag.length > 0),
	);

	return Array.from(unique);
}
