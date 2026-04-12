"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	AccountStatus,
	AccountView,
	ProviderSummary,
} from "@/features/accounts/account-types";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import type { UsageSnapshotView } from "@/features/usage/usage-types";
import type { AppLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AccountForm = {
	providerId: string;
	displayName: string;
	identifier: string;
	planName: string;
	accountType: string;
	status: AccountStatus;
	priority: number;
	tagsText: string;
	notesText: string;
	resetIntervalMinutes: string;
	nextResetAt: string;
	passwordOrToken: string;
	apiKey: string;
	sessionToken: string;
	cookiesReference: string;
	secretNotes: string;
	clearSecret: boolean;
};

type Filters = {
	search: string;
	providerId: string;
	status: "" | AccountStatus;
	tag: string;
	includeArchived: boolean;
};

type AccountsPageResponse = {
	accounts: AccountView[];
	page: {
		limit: number;
		nextCursor: string | null;
	};
};

const statusOptions: AccountStatus[] = [
	"active",
	"warning",
	"limited",
	"exhausted",
	"disabled",
	"error",
	"archived",
];

const emptyForm: AccountForm = {
	providerId: "",
	displayName: "",
	identifier: "",
	planName: "",
	accountType: "",
	status: "active",
	priority: 5,
	tagsText: "",
	notesText: "",
	resetIntervalMinutes: "",
	nextResetAt: "",
	passwordOrToken: "",
	apiKey: "",
	sessionToken: "",
	cookiesReference: "",
	secretNotes: "",
	clearSecret: false,
};

const defaultFilters: Filters = {
	search: "",
	providerId: "",
	status: "",
	tag: "",
	includeArchived: false,
};

function usagePercent(account: AccountView) {
	return account.latestUsage?.usedPercent ?? 0;
}

function parseTags(tagsText: string) {
	return tagsText
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

function normalizeStatus(value: string): AccountStatus {
	return statusOptions.includes(value as AccountStatus)
		? (value as AccountStatus)
		: "active";
}

function toInputDateTime(isoValue: string | null) {
	if (!isoValue) return "";

	const date = new Date(isoValue);
	if (Number.isNaN(date.getTime())) return "";

	const pad = (n: number) => n.toString().padStart(2, "0");
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(
		local.getDate(),
	)}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

type AccountsManagerProps = {
	locale: AppLocale;
};

export function AccountsManager({ locale }: AccountsManagerProps) {
	const isPtBr = locale === "pt_BR";
	const ui = {
		failedLoadProviders: isPtBr
			? "Falha ao carregar provedores."
			: "Failed to load providers.",
		failedLoadAccounts: isPtBr
			? "Falha ao carregar contas."
			: "Failed to load accounts.",
		failedSaveAccount: isPtBr
			? "Falha ao salvar conta."
			: "Failed to save account.",
		failedArchiveAccount: isPtBr
			? "Falha ao arquivar conta."
			: "Failed to archive account.",
		failedDeleteAccount: isPtBr
			? "Falha ao excluir conta."
			: "Failed to delete account.",
		accountUpdated: isPtBr ? "Conta atualizada." : "Account updated.",
		accountCreated: isPtBr ? "Conta criada." : "Account created.",
		filterTitle: isPtBr ? "Filtros" : "Filters",
		cards: isPtBr ? "Cartões" : "Cards",
		table: isPtBr ? "Tabela" : "Table",
		searchPlaceholder: isPtBr
			? "Buscar por nome, identificador ou notas"
			: "Search by name, id, notes",
		allProviders: isPtBr ? "Todos os provedores" : "All providers",
		allStatuses: isPtBr ? "Todos os status" : "All statuses",
		tagPlaceholder: isPtBr ? "Tag" : "Tag",
		includeArchived: isPtBr ? "Incluir arquivadas" : "Include archived",
		editAccount: isPtBr ? "Editar Conta" : "Edit Account",
		createAccount: isPtBr ? "Criar Conta" : "Create Account",
		newButton: isPtBr ? "Novo" : "New",
		displayName: isPtBr ? "Nome de exibição" : "Display name",
		emailOrIdentifier: isPtBr
			? "E-mail ou identificador"
			: "Email or identifier",
		plan: isPtBr ? "Plano" : "Plan",
		type: isPtBr ? "Tipo" : "Type",
		priority: isPtBr ? "Prioridade" : "Priority",
		tagsCsv: isPtBr ? "Tags (separadas por vírgula)" : "Tags (comma separated)",
		operationalNotes: isPtBr ? "Notas operacionais" : "Operational notes",
		resetInterval: isPtBr ? "Intervalo de reset (min)" : "Reset interval (min)",
		sensitiveMetadata: isPtBr ? "Metadados sensíveis" : "Sensitive metadata",
		passwordOrToken: isPtBr ? "Senha ou token" : "Password or token",
		apiKey: isPtBr ? "Chave de API" : "API key",
		sessionToken: isPtBr ? "Token de sessão" : "Session token",
		cookiesReference: isPtBr ? "Referência de cookies" : "Cookies reference",
		secretNotes: isPtBr ? "Notas sensíveis" : "Secret notes",
		clearSecretBlob: isPtBr
			? "Limpar segredo armazenado"
			: "Clear stored secret blob",
		saving: isPtBr ? "Salvando..." : "Saving...",
		updateAccount: isPtBr ? "Atualizar Conta" : "Update Account",
		createAccountAction: isPtBr ? "Criar Conta" : "Create Account",
		accountsTitle: isPtBr ? "Contas" : "Accounts",
		totalSuffix: isPtBr ? "total" : "total",
		loadingAccounts: isPtBr ? "Carregando contas" : "Loading accounts",
		noAccounts: isPtBr ? "Nenhuma conta encontrada." : "No accounts found.",
		unknownProvider: isPtBr ? "Provedor desconhecido" : "Unknown provider",
		noPlan: isPtBr ? "Sem plano" : "No plan",
		hasSecret: isPtBr ? "tem segredo" : "has secret",
		nextReset: isPtBr ? "Próx. reset" : "Next reset",
		usage: isPtBr ? "Uso" : "Usage",
		lastMeasure: isPtBr ? "Última medição" : "Last measure",
		open: isPtBr ? "Abrir" : "Open",
		edit: isPtBr ? "Editar" : "Edit",
		archive: isPtBr ? "Arquivar" : "Archive",
		delete: isPtBr ? "Excluir" : "Delete",
		thName: isPtBr ? "Nome" : "Name",
		thProvider: isPtBr ? "Provedor" : "Provider",
		thStatus: "Status",
		thPriority: isPtBr ? "Prioridade" : "Priority",
		thUsage: isPtBr ? "Uso" : "Usage",
		thNextReset: isPtBr ? "Próx. reset" : "Next Reset",
		thSecret: isPtBr ? "Segredo" : "Secret",
		thActions: isPtBr ? "Ações" : "Actions",
		secretStored: isPtBr ? "Armazenado" : "Stored",
		secretNone: isPtBr ? "Nenhum" : "None",
		loadMore: isPtBr ? "Carregar mais" : "Load more",
		deleteAccountTitle: isPtBr ? "Excluir conta" : "Delete account",
		deleteAccountDescription: (name: string) =>
			isPtBr
				? `Excluir a conta "${name}"? Esta ação não pode ser desfeita.`
				: `Delete account "${name}"? This action cannot be undone.`,
		providerLabel: isPtBr ? "Provedor" : "Provider",
		providerHint: isPtBr
			? "Selecione o provedor correto para manter integridade de filtros e auditoria."
			: "Select the correct provider to keep filters and audit integrity.",
		identifierLabel: isPtBr ? "Identificador" : "Identifier",
		identifierHint: isPtBr
			? "Deve ser único dentro do mesmo provedor (e-mail, login ou ID externo)."
			: "Must be unique within the same provider (email, login, or external ID).",
		accountStatusLabel: isPtBr ? "Status da conta" : "Account status",
		accountStatusHint: isPtBr
			? "Use status para refletir risco operacional atual da conta."
			: "Use status to reflect the account's current operational risk.",
		accountTypeLabel: isPtBr ? "Tipo de conta" : "Account type",
		resetDateTimeLabel: isPtBr
			? "Data e hora do próximo reset"
			: "Next reset datetime",
		resetIntervalHint: isPtBr
			? "Intervalo em minutos para projeção automática de próximo ciclo."
			: "Interval in minutes for automatic next-cycle projection.",
		resetDateHint: isPtBr
			? "Use quando já souber a janela exata de renovação da conta."
			: "Use when you already know the exact account reset window.",
		passwordOrTokenLabel: isPtBr ? "Senha ou token" : "Password or token",
		apiKeyLabel: isPtBr ? "Chave de API" : "API key",
		sessionTokenLabel: isPtBr ? "Token de sessão" : "Session token",
		cookiesReferenceLabel: isPtBr
			? "Referência de cookies"
			: "Cookies reference",
		secretNotesLabel: isPtBr ? "Notas sensíveis" : "Secret notes",
		sensitiveMetadataHint: isPtBr
			? "Os campos abaixo são criptografados e só podem ser revelados com reautenticação."
			: "Fields below are encrypted and can only be revealed with re-authentication.",
		clearSecretHint: isPtBr
			? "Marque apenas se quiser remover o segredo já armazenado no banco."
			: "Check only if you want to remove the secret currently stored in the database.",
		sensitiveMetadataCollapsedHint: isPtBr
			? "Expandir apenas quando precisar registrar ou ajustar credenciais."
			: "Expand only when you need to register or adjust credentials.",
		deleteAccountAria: (name: string) =>
			isPtBr ? `Excluir conta ${name}` : `Delete account ${name}`,
		statusActive: isPtBr ? "Ativa" : "Active",
		statusWarning: isPtBr ? "Atenção" : "Warning",
		statusLimited: isPtBr ? "Limitada" : "Limited",
		statusExhausted: isPtBr ? "Esgotada" : "Exhausted",
		statusDisabled: isPtBr ? "Desativada" : "Disabled",
		statusError: isPtBr ? "Erro" : "Error",
		statusArchived: isPtBr ? "Arquivada" : "Archived",
	};

	const [providers, setProviders] = useState<ProviderSummary[]>([]);
	const [accounts, setAccounts] = useState<AccountView[]>([]);
	const [form, setForm] = useState<AccountForm>(emptyForm);
	const [filters, setFilters] = useState<Filters>(defaultFilters);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<{
		tone: "success" | "error";
		message: string;
	} | null>(null);
	const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [pendingDeleteAccount, setPendingDeleteAccount] =
		useState<AccountView | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [requestCursor, setRequestCursor] = useState<string | null>(null);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [reloadToken, setReloadToken] = useState(0);
	const sensitiveDetailsRef = useRef<HTMLDetailsElement>(null);
	const passwordOrTokenInputRef = useRef<HTMLInputElement>(null);

	const loadProviders = useCallback(async () => {
		const allProviders: ProviderSummary[] = [];
		let cursor: string | null = null;

		while (true) {
			const query = new URLSearchParams();
			query.set("limit", "100");
			query.set("activeOnly", "true");
			if (cursor) {
				query.set("cursor", cursor);
			}

			const response = await fetch(`/api/providers?${query.toString()}`);
			if (!response.ok) throw new Error(ui.failedLoadProviders);
			const payload = (await response.json()) as {
				providers: ProviderSummary[];
				page?: {
					nextCursor: string | null;
				};
			};

			allProviders.push(
				...payload.providers.filter((provider) => provider.isActive !== false),
			);
			const nextPageCursor = payload.page?.nextCursor ?? null;
			if (!nextPageCursor) {
				break;
			}
			cursor = nextPageCursor;
		}

		allProviders.sort((a, b) => a.name.localeCompare(b.name));
		setProviders(allProviders);
	}, [ui.failedLoadProviders]);

	const baseQueryString = useMemo(() => {
		const query = new URLSearchParams();
		query.set("limit", "24");
		if (debouncedSearch) query.set("search", debouncedSearch);
		if (filters.providerId) query.set("providerId", filters.providerId);
		if (filters.status) query.set("status", filters.status);
		if (filters.tag) query.set("tag", filters.tag);
		if (filters.includeArchived) query.set("includeArchived", "true");
		return query.toString();
	}, [
		debouncedSearch,
		filters.includeArchived,
		filters.providerId,
		filters.status,
		filters.tag,
	]);

	const queryString = useMemo(() => {
		const query = new URLSearchParams(baseQueryString);
		if (requestCursor) query.set("cursor", requestCursor);
		return query.toString();
	}, [baseQueryString, requestCursor]);

	const loadAccounts = useCallback(async () => {
		setIsLoading(true);
		setFeedback(null);

		try {
			const response = await fetch(
				`/api/accounts${queryString ? `?${queryString}` : ""}`,
			);
			if (!response.ok) {
				throw new Error(ui.failedLoadAccounts);
			}

			const payload = (await response.json()) as AccountsPageResponse;
			const isPaginating = requestCursor !== null;
			setHasMore(Boolean(payload.page.nextCursor));
			setNextCursor(payload.page.nextCursor);
			setAccounts((previous) =>
				isPaginating ? [...previous, ...payload.accounts] : payload.accounts,
			);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : ui.failedLoadAccounts,
			});
		} finally {
			setIsLoading(false);
		}
	}, [queryString, requestCursor, ui.failedLoadAccounts]);

	useEffect(() => {
		void loadProviders().catch(() =>
			setFeedback({ tone: "error", message: ui.failedLoadProviders }),
		);
	}, [loadProviders, ui.failedLoadProviders]);

	useEffect(() => {
		void baseQueryString;
		setRequestCursor(null);
		setNextCursor(null);
		setHasMore(false);
		setAccounts([]);
	}, [baseQueryString]);

	useEffect(() => {
		void reloadToken;
		void loadAccounts();
	}, [loadAccounts, reloadToken]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedSearch(filters.search.trim());
		}, 280);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [filters.search]);

	useEffect(() => {
		if (!form.providerId && providers.length > 0) {
			setForm((previous) => ({ ...previous, providerId: providers[0].id }));
		}
	}, [providers, form.providerId]);

	function setField<Key extends keyof AccountForm>(
		key: Key,
		value: AccountForm[Key],
	) {
		setForm((previous) => ({
			...previous,
			[key]: value,
		}));
	}

	function resetForm() {
		setEditingId(null);
		setForm({
			...emptyForm,
			providerId: providers[0]?.id ?? "",
		});
	}

	function startEdit(account: AccountView) {
		setEditingId(account.id);
		setForm({
			providerId: account.providerId,
			displayName: account.displayName,
			identifier: account.identifier,
			planName: account.planName ?? "",
			accountType: account.accountType ?? "",
			status: normalizeStatus(account.status),
			priority: account.priority,
			tagsText: account.tags.join(", "),
			notesText: account.notesText ?? "",
			resetIntervalMinutes: account.resetIntervalMinutes
				? String(account.resetIntervalMinutes)
				: "",
			nextResetAt: toInputDateTime(account.nextResetAt),
			passwordOrToken: "",
			apiKey: "",
			sessionToken: "",
			cookiesReference: "",
			secretNotes: "",
			clearSecret: false,
		});
	}

	async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setFeedback(null);

		const secretPayload = {
			passwordOrToken: form.passwordOrToken || undefined,
			apiKey: form.apiKey || undefined,
			sessionToken: form.sessionToken || undefined,
			cookiesReference: form.cookiesReference || undefined,
			secretNotes: form.secretNotes || undefined,
		};

		const hasSecretUpdate = Object.values(secretPayload).some(Boolean);
		const body = {
			providerId: form.providerId,
			displayName: form.displayName,
			identifier: form.identifier,
			planName: form.planName || undefined,
			accountType: form.accountType || undefined,
			status: form.status,
			priority: form.priority,
			tags: parseTags(form.tagsText),
			notesText: form.notesText || undefined,
			resetIntervalMinutes: form.resetIntervalMinutes
				? Number(form.resetIntervalMinutes)
				: undefined,
			nextResetAt: form.nextResetAt || undefined,
			secretPayload: hasSecretUpdate ? secretPayload : undefined,
			clearSecret: editingId ? form.clearSecret : undefined,
		};

		try {
			const response = await fetch(
				editingId ? `/api/accounts/${editingId}` : "/api/accounts",
				{
					method: editingId ? "PUT" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				},
			);

			if (!response.ok) {
				const errorPayload = (await response.json()) as { message?: string };
				throw new Error(errorPayload.message ?? ui.failedSaveAccount);
			}

			setFeedback({
				tone: "success",
				message: editingId ? ui.accountUpdated : ui.accountCreated,
			});
			resetForm();
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setAccounts([]);
			setReloadToken((value) => value + 1);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : ui.failedSaveAccount,
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function archiveAccount(account: AccountView) {
		try {
			const response = await fetch(`/api/accounts/${account.id}/archive`, {
				method: "POST",
			});
			if (!response.ok) {
				throw new Error(ui.failedArchiveAccount);
			}
			setFeedback({
				tone: "success",
				message: isPtBr
					? `Conta "${account.displayName}" arquivada.`
					: `Account "${account.displayName}" archived.`,
			});
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setAccounts([]);
			setReloadToken((value) => value + 1);
		} catch (error) {
			setFeedback({
				tone: "error",
				message:
					error instanceof Error ? error.message : ui.failedArchiveAccount,
			});
		}
	}

	async function deleteAccount(account: AccountView) {
		setIsDeleting(true);

		try {
			const response = await fetch(`/api/accounts/${account.id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				throw new Error(ui.failedDeleteAccount);
			}
			setFeedback({
				tone: "success",
				message: isPtBr
					? `Conta "${account.displayName}" excluída.`
					: `Account "${account.displayName}" deleted.`,
			});
			setPendingDeleteAccount(null);
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setAccounts([]);
			setReloadToken((value) => value + 1);
		} catch (error) {
			setFeedback({
				tone: "error",
				message:
					error instanceof Error ? error.message : ui.failedDeleteAccount,
			});
		} finally {
			setIsDeleting(false);
		}
	}

	function applySnapshotToAccount(
		accountId: string,
		snapshot: UsageSnapshotView,
	) {
		setAccounts((previous) =>
			previous.map((account) => {
				if (account.id !== accountId) return account;
				return {
					...account,
					latestUsage: snapshot,
					nextResetAt: snapshot.resetAt ?? account.nextResetAt,
					lastSyncAt: snapshot.measuredAt,
				};
			}),
		);
	}

	function handleSensitiveMetadataToggle() {
		if (sensitiveDetailsRef.current?.open) {
			passwordOrTokenInputRef.current?.focus();
		}
	}

	function statusLabel(status: string) {
		if (status === "active") return ui.statusActive;
		if (status === "warning") return ui.statusWarning;
		if (status === "limited") return ui.statusLimited;
		if (status === "exhausted") return ui.statusExhausted;
		if (status === "disabled") return ui.statusDisabled;
		if (status === "error") return ui.statusError;
		return ui.statusArchived;
	}

	return (
		<section className="space-y-5">
			<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-lg font-semibold">{ui.filterTitle}</h2>
					<div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
						<button
							type="button"
							onClick={() => setViewMode("cards")}
							className={`rounded-md px-3 py-1 text-sm ${
								viewMode === "cards"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground"
							}`}
						>
							{ui.cards}
						</button>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							className={`rounded-md px-3 py-1 text-sm ${
								viewMode === "table"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground"
							}`}
						>
							{ui.table}
						</button>
					</div>
				</div>
				<div className="grid gap-3 md:grid-cols-5">
					<input
						aria-label={ui.searchPlaceholder}
						placeholder={ui.searchPlaceholder}
						value={filters.search}
						onChange={(event) =>
							setFilters((previous) => ({
								...previous,
								search: event.target.value,
							}))
						}
						className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					/>
					<select
						aria-label={ui.allProviders}
						value={filters.providerId}
						onChange={(event) =>
							setFilters((previous) => ({
								...previous,
								providerId: event.target.value,
							}))
						}
						className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						<option value="">{ui.allProviders}</option>
						{providers.map((provider) => (
							<option key={provider.id} value={provider.id}>
								{provider.name}
							</option>
						))}
					</select>
					<select
						aria-label={ui.allStatuses}
						value={filters.status}
						onChange={(event) =>
							setFilters((previous) => ({
								...previous,
								status: event.target.value as Filters["status"],
							}))
						}
						className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						<option value="">{ui.allStatuses}</option>
						{statusOptions.map((status) => (
							<option key={status} value={status}>
								{statusLabel(status)}
							</option>
						))}
					</select>
					<input
						aria-label={ui.tagPlaceholder}
						placeholder={ui.tagPlaceholder}
						value={filters.tag}
						onChange={(event) =>
							setFilters((previous) => ({
								...previous,
								tag: event.target.value,
							}))
						}
						className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					/>
					<label className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground">
						<input
							type="checkbox"
							checked={filters.includeArchived}
							onChange={(event) =>
								setFilters((previous) => ({
									...previous,
									includeArchived: event.target.checked,
								}))
							}
						/>
						{ui.includeArchived}
					</label>
				</div>
			</article>

			<div className="grid gap-5 lg:grid-cols-[minmax(300px,370px),1fr]">
				<article className="h-fit rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold">
							{editingId ? ui.editAccount : ui.createAccount}
						</h2>
						{editingId ? (
							<Button variant="ghost" onClick={resetForm}>
								{ui.newButton}
							</Button>
						) : null}
					</div>

					<form onSubmit={saveAccount} className="space-y-3">
						<select
							aria-label={ui.providerLabel}
							value={form.providerId}
							onChange={(event) => setField("providerId", event.target.value)}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						>
							{providers.map((provider) => (
								<option key={provider.id} value={provider.id}>
									{provider.name}
								</option>
							))}
						</select>
						<p className="text-xs text-muted-foreground">{ui.providerHint}</p>
						<input
							aria-label={ui.displayName}
							value={form.displayName}
							onChange={(event) => setField("displayName", event.target.value)}
							placeholder={ui.displayName}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						/>
						<input
							aria-label={ui.identifierLabel}
							value={form.identifier}
							onChange={(event) => setField("identifier", event.target.value)}
							placeholder={ui.emailOrIdentifier}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						/>
						<p className="text-xs text-muted-foreground">{ui.identifierHint}</p>
						<div className="grid grid-cols-2 gap-3">
							<input
								aria-label={ui.plan}
								value={form.planName}
								onChange={(event) => setField("planName", event.target.value)}
								placeholder={ui.plan}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							/>
							<input
								aria-label={ui.accountTypeLabel}
								value={form.accountType}
								onChange={(event) =>
									setField("accountType", event.target.value)
								}
								placeholder={ui.type}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<select
								aria-label={ui.accountStatusLabel}
								value={form.status}
								onChange={(event) =>
									setField("status", event.target.value as AccountStatus)
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								{statusOptions.map((status) => (
									<option key={status} value={status}>
										{statusLabel(status)}
									</option>
								))}
							</select>
							<input
								aria-label={ui.priority}
								type="number"
								min={1}
								max={10}
								value={form.priority}
								onChange={(event) =>
									setField("priority", Number(event.target.value))
								}
								placeholder={ui.priority}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							{ui.accountStatusHint}
						</p>
						<input
							aria-label={ui.tagsCsv}
							value={form.tagsText}
							onChange={(event) => setField("tagsText", event.target.value)}
							placeholder={ui.tagsCsv}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						/>
						<textarea
							aria-label={ui.operationalNotes}
							value={form.notesText}
							onChange={(event) => setField("notesText", event.target.value)}
							placeholder={ui.operationalNotes}
							className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none ring-primary transition focus:ring-2"
						/>
						<div className="grid grid-cols-2 gap-3">
							<input
								aria-label={ui.resetInterval}
								type="number"
								min={1}
								value={form.resetIntervalMinutes}
								onChange={(event) =>
									setField("resetIntervalMinutes", event.target.value)
								}
								placeholder={ui.resetInterval}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							/>
							<input
								aria-label={ui.resetDateTimeLabel}
								type="datetime-local"
								value={form.nextResetAt}
								onChange={(event) =>
									setField("nextResetAt", event.target.value)
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							/>
						</div>
						<div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
							<p>{ui.resetIntervalHint}</p>
							<p>{ui.resetDateHint}</p>
						</div>

						<details
							ref={sensitiveDetailsRef}
							onToggle={handleSensitiveMetadataToggle}
							className="rounded-md border border-border bg-muted/30 p-3"
						>
							<summary className="cursor-pointer text-sm font-medium">
								{ui.sensitiveMetadata}
							</summary>
							<p className="mt-2 text-xs text-muted-foreground">
								{ui.sensitiveMetadataCollapsedHint}
							</p>
							<p className="mt-2 text-xs text-muted-foreground">
								{ui.sensitiveMetadataHint}
							</p>
							<div className="mt-3 space-y-2">
								<input
									ref={passwordOrTokenInputRef}
									aria-label={ui.passwordOrTokenLabel}
									type="password"
									value={form.passwordOrToken}
									onChange={(event) =>
										setField("passwordOrToken", event.target.value)
									}
									placeholder={ui.passwordOrToken}
									className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								/>
								<input
									aria-label={ui.apiKeyLabel}
									type="password"
									value={form.apiKey}
									onChange={(event) => setField("apiKey", event.target.value)}
									placeholder={ui.apiKey}
									className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								/>
								<input
									aria-label={ui.sessionTokenLabel}
									type="password"
									value={form.sessionToken}
									onChange={(event) =>
										setField("sessionToken", event.target.value)
									}
									placeholder={ui.sessionToken}
									className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								/>
								<input
									aria-label={ui.cookiesReferenceLabel}
									value={form.cookiesReference}
									onChange={(event) =>
										setField("cookiesReference", event.target.value)
									}
									placeholder={ui.cookiesReference}
									className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								/>
								<textarea
									aria-label={ui.secretNotesLabel}
									value={form.secretNotes}
									onChange={(event) =>
										setField("secretNotes", event.target.value)
									}
									placeholder={ui.secretNotes}
									className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none ring-primary transition focus:ring-2"
								/>
								{editingId ? (
									<label className="flex items-center gap-2 text-sm text-muted-foreground">
										<input
											type="checkbox"
											checked={form.clearSecret}
											onChange={(event) =>
												setField("clearSecret", event.target.checked)
											}
										/>
										{ui.clearSecretBlob}
									</label>
								) : null}
								{editingId ? (
									<p className="text-xs text-muted-foreground">
										{ui.clearSecretHint}
									</p>
								) : null}
							</div>
						</details>

						<Button type="submit" className="w-full" disabled={isSaving}>
							{isSaving
								? ui.saving
								: editingId
									? ui.updateAccount
									: ui.createAccountAction}
						</Button>
					</form>
				</article>

				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">{ui.accountsTitle}</h2>
						<span className="text-sm text-muted-foreground">
							{accounts.length} {ui.totalSuffix}
						</span>
					</div>

					{feedback ? (
						<p
							role={feedback.tone === "error" ? "alert" : "status"}
							aria-live="polite"
							className={`mb-3 rounded-md border px-3 py-2 text-sm ${
								feedback.tone === "success"
									? "border-success/30 bg-success/10 text-success"
									: "border-danger/30 bg-danger/10 text-danger"
							}`}
						>
							{feedback.message}
						</p>
					) : null}

					{isLoading ? (
						<output
							aria-live="polite"
							aria-label={ui.loadingAccounts}
							className="grid gap-3 md:grid-cols-2"
						>
							<div className="space-y-2 rounded-xl border border-border p-4">
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="h-3 w-1/2" />
								<Skeleton className="h-2 w-full" />
								<Skeleton className="h-8 w-full" />
							</div>
							<div className="space-y-2 rounded-xl border border-border p-4">
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="h-3 w-1/2" />
								<Skeleton className="h-2 w-full" />
								<Skeleton className="h-8 w-full" />
							</div>
						</output>
					) : accounts.length === 0 ? (
						<p className="text-sm text-muted-foreground">{ui.noAccounts}</p>
					) : viewMode === "cards" ? (
						<div className="grid gap-3 md:grid-cols-2">
							{accounts.map((account) => (
								<article
									key={account.id}
									className="rounded-xl border border-border bg-background/40 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold">
												<Link
													href={`/accounts/${account.id}`}
													className="hover:underline"
												>
													{account.displayName}
												</Link>
											</h3>
											<p className="text-sm text-muted-foreground">
												{account.identifier}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{account.provider?.name ?? ui.unknownProvider} •{" "}
												{account.planName ?? ui.noPlan}
											</p>
										</div>
										<span
											className={`rounded-md px-2 py-1 text-xs ${
												account.status === "active"
													? "bg-success/15 text-success"
													: account.status === "warning" ||
															account.status === "limited"
														? "bg-warning/15 text-warning"
														: account.status === "exhausted" ||
																account.status === "error"
															? "bg-danger/15 text-danger"
															: "bg-muted text-muted-foreground"
											}`}
										>
											{statusLabel(account.status)}
										</span>
									</div>

									<div className="mt-3 flex flex-wrap gap-1">
										{account.tags.map((tag) => (
											<span
												key={`${account.id}-${tag}`}
												className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
											>
												{tag}
											</span>
										))}
										{account.hasSecret ? (
											<span className="rounded-md border border-info/30 bg-info/10 px-2 py-1 text-xs text-info">
												{ui.hasSecret}
											</span>
										) : null}
									</div>

									<div className="mt-3 text-xs text-muted-foreground">
										{ui.nextReset}: {formatDateTime(account.nextResetAt)}
									</div>

									<div className="mt-3 space-y-1">
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>{ui.usage}</span>
											<span>{usagePercent(account).toFixed(1)}%</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-muted">
											<div
												className={`h-full ${
													usagePercent(account) >= 90
														? "bg-danger"
														: usagePercent(account) >= 70
															? "bg-warning"
															: "bg-success"
												}`}
												style={{
													width: `${Math.min(100, Math.max(0, usagePercent(account)))}%`,
												}}
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											{ui.lastMeasure}:{" "}
											{formatDateTime(account.latestUsage?.measuredAt ?? null)}
										</p>
									</div>

									<div className="mt-4 flex flex-wrap gap-2">
										<Link
											href={`/accounts/${account.id}`}
											className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
										>
											{ui.open}
										</Link>
										<Button
											variant="outline"
											size="sm"
											onClick={() => startEdit(account)}
										>
											{ui.edit}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => void archiveAccount(account)}
										>
											{ui.archive}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											aria-label={ui.deleteAccountAria(account.displayName)}
											onClick={() => setPendingDeleteAccount(account)}
										>
											{ui.delete}
										</Button>
										<QuickUsageUpdate
											accountId={account.id}
											locale={locale}
											onSaved={(snapshot) =>
												applySnapshotToAccount(account.id, snapshot)
											}
										/>
									</div>
								</article>
							))}
						</div>
					) : (
						<div className="overflow-x-auto rounded-lg border border-border">
							<table className="min-w-[760px] text-sm">
								<thead className="bg-muted/70 text-left text-muted-foreground">
									<tr>
										<th className="px-3 py-2">{ui.thName}</th>
										<th className="px-3 py-2">{ui.thProvider}</th>
										<th className="px-3 py-2">{ui.thStatus}</th>
										<th className="px-3 py-2">{ui.thPriority}</th>
										<th className="px-3 py-2">{ui.thUsage}</th>
										<th className="px-3 py-2">{ui.thNextReset}</th>
										<th className="px-3 py-2">{ui.thSecret}</th>
										<th className="px-3 py-2 text-right">{ui.thActions}</th>
									</tr>
								</thead>
								<tbody>
									{accounts.map((account) => (
										<tr key={account.id} className="border-t border-border/80">
											<td className="px-3 py-2">
												<p className="font-medium">
													<Link
														href={`/accounts/${account.id}`}
														className="hover:underline"
													>
														{account.displayName}
													</Link>
												</p>
												<p className="text-xs text-muted-foreground">
													{account.identifier}
												</p>
											</td>
											<td className="px-3 py-2">
												{account.provider?.name ?? "-"}
											</td>
											<td className="px-3 py-2">
												{statusLabel(account.status)}
											</td>
											<td className="px-3 py-2">{account.priority}</td>
											<td className="px-3 py-2">
												{usagePercent(account).toFixed(1)}%
											</td>
											<td className="px-3 py-2">
												{formatDateTime(account.nextResetAt)}
											</td>
											<td className="px-3 py-2">
												{account.hasSecret ? ui.secretStored : ui.secretNone}
											</td>
											<td className="px-3 py-2 text-right">
												<div className="inline-flex flex-wrap justify-end gap-2">
													<Link
														href={`/accounts/${account.id}`}
														className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
													>
														{ui.open}
													</Link>
													<Button
														variant="outline"
														size="sm"
														onClick={() => startEdit(account)}
													>
														{ui.edit}
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => void archiveAccount(account)}
													>
														{ui.archive}
													</Button>
													<Button
														variant="ghost"
														size="sm"
														aria-label={ui.deleteAccountAria(
															account.displayName,
														)}
														onClick={() => setPendingDeleteAccount(account)}
													>
														{ui.delete}
													</Button>
													<QuickUsageUpdate
														accountId={account.id}
														buttonLabel={ui.usage}
														locale={locale}
														onSaved={(snapshot) =>
															applySnapshotToAccount(account.id, snapshot)
														}
													/>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{!isLoading && hasMore ? (
						<div className="mt-3 flex justify-end">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									if (nextCursor) {
										setRequestCursor(nextCursor);
										setReloadToken((value) => value + 1);
									}
								}}
							>
								{ui.loadMore}
							</Button>
						</div>
					) : null}
				</article>
			</div>
			<ConfirmDialog
				open={Boolean(pendingDeleteAccount)}
				title={ui.deleteAccountTitle}
				description={
					pendingDeleteAccount
						? ui.deleteAccountDescription(pendingDeleteAccount.displayName)
						: ""
				}
				confirmLabel={ui.delete}
				tone="danger"
				isLoading={isDeleting}
				onCancel={() => {
					if (!isDeleting) {
						setPendingDeleteAccount(null);
					}
				}}
				onConfirm={() => {
					if (pendingDeleteAccount) {
						void deleteAccount(pendingDeleteAccount);
					}
				}}
			/>
		</section>
	);
}
