export type ProviderConnectorType =
	| "manual"
	| "api"
	| "cookie_session"
	| "web_automation"
	| "custom_script";

export type ProviderCatalogStatus =
	| "official"
	| "community"
	| "internal"
	| "generic";

export type ProviderCatalogEntry = {
	slug: string;
	displayName: string;
	officialSite: string;
	iconAsset: string;
	brandColor: string;
	description: string;
	defaultConnectorType: ProviderConnectorType;
	status: ProviderCatalogStatus;
	isActiveByDefault: boolean;
};

export const PROVIDER_CATALOG_VERSION = "2026-04-14";

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
	{
		slug: "openai-chatgpt",
		displayName: "OpenAI / ChatGPT",
		officialSite: "https://openai.com",
		iconAsset: "/providers/openai-chatgpt.ico",
		brandColor: "#10A37F",
		description: "OpenAI platform accounts and quotas.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "codex",
		displayName: "Codex",
		officialSite: "https://openai.com",
		iconAsset: "/providers/codex.ico",
		brandColor: "#10A37F",
		description: "Codex workspace and automation profiles.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "codex-cli",
		displayName: "Codex CLI",
		officialSite: "https://openai.com",
		iconAsset: "/providers/codex-cli.ico",
		brandColor: "#0F766E",
		description: "Codex CLI account and token operations.",
		defaultConnectorType: "custom_script",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "github-copilot",
		displayName: "GitHub Copilot",
		officialSite: "https://github.com/features/copilot",
		iconAsset: "/providers/github-copilot.svg",
		brandColor: "#8957E5",
		description: "Copilot subscriptions and IDE-linked usage monitoring.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "windsurf",
		displayName: "Windsurf",
		officialSite: "https://windsurf.com",
		iconAsset: "/providers/windsurf.svg",
		brandColor: "#0F172A",
		description: "Windsurf operational profiles and usage tracking.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "verdent",
		displayName: "Verdent",
		officialSite: "https://verdent.ai",
		iconAsset: "/providers/verdent.ico",
		brandColor: "#0EA5E9",
		description: "Verdent accounts and lifecycle controls.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "kiro",
		displayName: "Kiro",
		officialSite: "https://kiro.dev",
		iconAsset: "/providers/kiro.svg",
		brandColor: "#0F766E",
		description: "Kiro account operations and reset window tracking.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "cursor",
		displayName: "Cursor",
		officialSite: "https://cursor.com",
		iconAsset: "/providers/cursor.svg",
		brandColor: "#111827",
		description: "Cursor seats, plans, and workspace account controls.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "google-gemini",
		displayName: "Google / Gemini",
		officialSite: "https://gemini.google.com",
		iconAsset: "/providers/gemini.svg",
		brandColor: "#4285F4",
		description: "Gemini account and quota tracking.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "google-gemini-cli",
		displayName: "Gemini CLI",
		officialSite: "https://ai.google.dev",
		iconAsset: "/providers/gemini.svg",
		brandColor: "#1A73E8",
		description: "Gemini CLI tokens and automation-oriented workflows.",
		defaultConnectorType: "custom_script",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "codebuddy",
		displayName: "CodeBuddy",
		officialSite: "https://codebuddy.com",
		iconAsset: "/providers/codebuddy.svg",
		brandColor: "#2563EB",
		description: "CodeBuddy account management and operational tracking.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "codebuddy-cn",
		displayName: "CodeBuddy CN",
		officialSite: "https://codebuddy.com",
		iconAsset: "/providers/codebuddy-cn.svg",
		brandColor: "#1D4ED8",
		description: "CodeBuddy CN region-specific account catalog.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "qoder",
		displayName: "Qoder",
		officialSite: "https://qoder.com",
		iconAsset: "/providers/qoder.svg",
		brandColor: "#4F46E5",
		description: "Qoder account fleet and quota visibility.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "trae",
		displayName: "Trae",
		officialSite: "https://trae.ai",
		iconAsset: "/providers/trae.svg",
		brandColor: "#0F172A",
		description: "Trae account lifecycle and operating state.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "zed",
		displayName: "Zed",
		officialSite: "https://zed.dev",
		iconAsset: "/providers/zed.svg",
		brandColor: "#084CCF",
		description: "Zed teams, plans, and account inventory tracking.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "antigravity",
		displayName: "Antigravity",
		officialSite: "https://antigravity.com",
		iconAsset: "/providers/antigravity.ico",
		brandColor: "#F97316",
		description: "Antigravity account controls and operational history.",
		defaultConnectorType: "manual",
		status: "community",
		isActiveByDefault: true,
	},
	{
		slug: "anthropic-claude",
		displayName: "Anthropic / Claude",
		officialSite: "https://www.anthropic.com",
		iconAsset: "/providers/anthropic-claude.svg",
		brandColor: "#111827",
		description: "Claude account and plan management.",
		defaultConnectorType: "manual",
		status: "official",
		isActiveByDefault: true,
	},
	{
		slug: "custom",
		displayName: "Custom",
		officialSite: "https://localhost",
		iconAsset: "/providers/provider-fallback.svg",
		brandColor: "#3B82F6",
		description: "Custom internal provider definitions.",
		defaultConnectorType: "custom_script",
		status: "generic",
		isActiveByDefault: true,
	},
	{
		slug: "other",
		displayName: "Other",
		officialSite: "https://localhost",
		iconAsset: "/providers/provider-fallback.svg",
		brandColor: "#6B7280",
		description: "Catch-all provider for miscellaneous accounts.",
		defaultConnectorType: "manual",
		status: "generic",
		isActiveByDefault: true,
	},
];

let providerCatalogBySlug: Map<string, ProviderCatalogEntry> | null = null;

function getProviderCatalogBySlug(): Map<string, ProviderCatalogEntry> {
	if (!providerCatalogBySlug) {
		providerCatalogBySlug = new Map(
			PROVIDER_CATALOG.map((entry) => [entry.slug, entry]),
		);
	}
	return providerCatalogBySlug;
}

export function findProviderCatalogEntryBySlug(
	slug: string | null | undefined,
) {
	if (!slug) {
		return null;
	}
	return getProviderCatalogBySlug().get(slug) ?? null;
}

/** Returns true if the given slug belongs to the canonical provider catalog */
export function isCanonicalProvider(slug: string | null | undefined): boolean {
	if (!slug) return false;
	return getProviderCatalogBySlug().has(slug);
}

export function resolveProviderCatalogDefaults(
	slug: string | null | undefined,
) {
	const entry = findProviderCatalogEntryBySlug(slug);
	if (!entry) {
		return null;
	}

	return {
		icon: entry.iconAsset,
		color: entry.brandColor,
		description: entry.description,
		defaultConnectorType: entry.defaultConnectorType,
		isActiveByDefault: entry.isActiveByDefault,
		displayName: entry.displayName,
	};
}
