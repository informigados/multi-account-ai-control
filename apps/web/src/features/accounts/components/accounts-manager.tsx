"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	AccountStatus,
	AccountView,
	ProviderSummary,
} from "@/features/accounts/account-types";
import { AccountGroupsManager } from "@/features/accounts/components/account-groups-manager";
import type { AccountGroup } from "@/features/accounts/components/account-groups-manager";
import { BatchActionBar } from "@/features/accounts/components/batch-action-bar";
import { ExportJsonDialog } from "@/features/accounts/components/export-json-dialog";
import { LocalImportDialog } from "@/features/accounts/components/local-import-dialog";
import type { DetectedLocalAccount } from "@/features/accounts/components/local-import-dialog";
import { QuickAddAccountDialog } from "@/features/accounts/components/quick-add-account-dialog";
import { QuotaAlertBanner } from "@/features/accounts/components/quota-alert-banner";
import { TagEditorDialog } from "@/features/accounts/components/tag-editor-dialog";
import { useAccountSelection } from "@/features/accounts/hooks/use-account-selection";
import { useAccountsAutoRefresh } from "@/features/accounts/hooks/use-accounts-auto-refresh";
import { ProviderBrand } from "@/features/providers/components/provider-brand";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import type { UsageSnapshotView } from "@/features/usage/usage-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Scroll a ref element into view and flash-highlight to signal form is ready */
function scrollToForm(ref: React.RefObject<HTMLElement | null>) {
	if (!ref.current) return;
	ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
	ref.current.classList.add("ring-2", "ring-primary/60", "transition");
	window.setTimeout(() => {
		ref.current?.classList.remove("ring-2", "ring-primary/60");
	}, 1200);
}

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
	groupId: string;
};

type SortConfig = {
	field: "displayName" | "priority" | "status" | "usedPercent";
	dir: "asc" | "desc";
};

const SORT_LS_KEY = "accounts_sort_v1";

function loadSortFromStorage(): SortConfig {
	try {
		const raw = localStorage.getItem(SORT_LS_KEY);
		if (raw) return JSON.parse(raw) as SortConfig;
	} catch {
		/* ignore */
	}
	return { field: "displayName", dir: "asc" };
}

const QUOTA_CONFIG_LS_KEY = "accounts_quota_config_v1";

type QuotaConfig = {
	refreshIntervalMinutes: number;
	alertThresholdPercent: number;
};

const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
	refreshIntervalMinutes: 10,
	alertThresholdPercent: 80,
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
	groupId: "",
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
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });

	const ui = {
		failedLoadProviders: text(
			"Falha ao carregar provedores.",
			"Failed to load providers.",
			"Error al cargar proveedores.",
			"加载服务商失败。",
		),
		failedLoadAccounts: text(
			"Falha ao carregar contas.",
			"Failed to load accounts.",
			"Error al cargar cuentas.",
			"加载账号失败。",
		),
		failedSaveAccount: text(
			"Falha ao salvar conta.",
			"Failed to save account.",
			"Error al guardar la cuenta.",
			"保存账号失败。",
		),
		failedArchiveAccount: text(
			"Falha ao arquivar conta.",
			"Failed to archive account.",
			"Error al archivar la cuenta.",
			"归档账号失败。",
		),
		failedDeleteAccount: text(
			"Falha ao excluir conta.",
			"Failed to delete account.",
			"Error al eliminar la cuenta.",
			"删除账号失败。",
		),
		accountUpdated: text(
			"Conta atualizada.",
			"Account updated.",
			"Cuenta actualizada.",
			"账号已更新。",
		),
		accountCreated: text(
			"Conta criada.",
			"Account created.",
			"Cuenta creada.",
			"账号已创建。",
		),
		filterTitle: text("Filtros", "Filters", "Filtros", "筛选"),
		cards: text("Cartões", "Cards", "Tarjetas", "卡片"),
		table: text("Tabela", "Table", "Tabla", "表格"),
		searchPlaceholder: text(
			"Buscar por nome, identificador ou notas",
			"Search by name, id, notes",
			"Buscar por nombre, identificador o notas",
			"按名称、标识或备注搜索",
		),
		allProviders: text(
			"Todos os provedores",
			"All providers",
			"Todos los proveedores",
			"全部服务商",
		),
		allStatuses: text(
			"Todos os status",
			"All statuses",
			"Todos los estados",
			"全部状态",
		),
		tagPlaceholder: text("Tag", "Tag", "Etiqueta", "标签"),
		includeArchived: text(
			"Incluir arquivadas",
			"Include archived",
			"Incluir archivadas",
			"包含已归档",
		),
		editAccount: text(
			"Editar Conta",
			"Edit Account",
			"Editar cuenta",
			"编辑账号",
		),
		createAccount: text(
			"Criar Conta",
			"Create Account",
			"Crear cuenta",
			"创建账号",
		),
		newButton: text("Novo", "New", "Nuevo", "新建"),
		displayName: text(
			"Nome de exibição",
			"Display name",
			"Nombre para mostrar",
			"显示名称",
		),
		emailOrIdentifier: text(
			"E-mail ou identificador",
			"Email or identifier",
			"Correo o identificador",
			"邮箱或标识",
		),
		plan: text("Plano", "Plan", "Plan", "套餐"),
		type: text("Tipo", "Type", "Tipo", "类型"),
		priority: text("Prioridade", "Priority", "Prioridad", "优先级"),
		tagsCsv: text(
			"Tags (separadas por vírgula)",
			"Tags (comma separated)",
			"Etiquetas (separadas por coma)",
			"标签（逗号分隔）",
		),
		operationalNotes: text(
			"Notas operacionais",
			"Operational notes",
			"Notas operativas",
			"运营备注",
		),
		resetInterval: text(
			"Intervalo de reset (min)",
			"Reset interval (min)",
			"Intervalo de reinicio (min)",
			"重置间隔（分钟）",
		),
		sensitiveMetadata: text(
			"Metadados sensíveis",
			"Sensitive metadata",
			"Metadatos sensibles",
			"敏感元数据",
		),
		passwordOrToken: text(
			"Senha ou token",
			"Password or token",
			"Contraseña o token",
			"密码或令牌",
		),
		apiKey: text("Chave de API", "API key", "Clave API", "API 密钥"),
		sessionToken: text(
			"Token de sessão",
			"Session token",
			"Token de sesión",
			"会话令牌",
		),
		cookiesReference: text(
			"Referência de cookies",
			"Cookies reference",
			"Referencia de cookies",
			"Cookie 引用",
		),
		secretNotes: text(
			"Notas sensíveis",
			"Secret notes",
			"Notas sensibles",
			"敏感备注",
		),
		clearSecretBlob: text(
			"Limpar segredo armazenado",
			"Clear stored secret blob",
			"Limpiar secreto almacenado",
			"清除已存储密钥",
		),
		saving: text("Salvando...", "Saving...", "Guardando...", "保存中..."),
		updateAccount: text(
			"Atualizar Conta",
			"Update Account",
			"Actualizar cuenta",
			"更新账号",
		),
		createAccountAction: text(
			"Criar Conta",
			"Create Account",
			"Crear cuenta",
			"创建账号",
		),
		accountsTitle: text("Contas", "Accounts", "Cuentas", "账号"),
		totalSuffix: text("total", "total", "total", "总计"),
		loadingAccounts: text(
			"Carregando contas",
			"Loading accounts",
			"Cargando cuentas",
			"正在加载账号",
		),
		noAccounts: text(
			"Nenhuma conta encontrada.",
			"No accounts found.",
			"No se encontraron cuentas.",
			"未找到账号。",
		),
		unknownProvider: text(
			"Provedor desconhecido",
			"Unknown provider",
			"Proveedor desconocido",
			"未知服务商",
		),
		noPlan: text("Sem plano", "No plan", "Sin plan", "无套餐"),
		hasSecret: text("tem segredo", "has secret", "tiene secreto", "有密钥"),
		nextReset: text("Próx. reset", "Next reset", "Próx. reinicio", "下次重置"),
		usage: text("Uso", "Usage", "Uso", "用量"),
		lastMeasure: text(
			"Última medição",
			"Last measure",
			"Última medición",
			"最近测量",
		),
		open: text("Abrir", "Open", "Abrir", "打开"),
		edit: text("Editar", "Edit", "Editar", "编辑"),
		archive: text("Arquivar", "Archive", "Archivar", "归档"),
		delete: text("Excluir", "Delete", "Eliminar", "删除"),
		thName: text("Nome", "Name", "Nombre", "名称"),
		thProvider: text("Provedor", "Provider", "Proveedor", "服务商"),
		thStatus: text("Status", "Status", "Estado", "状态"),
		thPriority: text("Prioridade", "Priority", "Prioridad", "优先级"),
		thUsage: text("Uso", "Usage", "Uso", "用量"),
		thNextReset: text(
			"Próx. reset",
			"Next Reset",
			"Próx. reinicio",
			"下次重置",
		),
		thSecret: text("Segredo", "Secret", "Secreto", "密钥"),
		thActions: text("Ações", "Actions", "Acciones", "操作"),
		secretStored: text("Armazenado", "Stored", "Almacenado", "已存储"),
		secretNone: text("Nenhum", "None", "Ninguno", "无"),
		loadMore: text("Carregar mais", "Load more", "Cargar más", "加载更多"),
		deleteAccountTitle: text(
			"Excluir conta",
			"Delete account",
			"Eliminar cuenta",
			"删除账号",
		),
		deleteAccountDescription: (name: string) =>
			text(
				`Excluir a conta "${name}"? Esta ação não pode ser desfeita.`,
				`Delete account "${name}"? This action cannot be undone.`,
				`¿Eliminar la cuenta "${name}"? Esta acción no se puede deshacer.`,
				`确定删除账号“${name}”？此操作不可撤销。`,
			),
		providerLabel: text("Provedor", "Provider", "Proveedor", "服务商"),
		providerHint: text(
			"Selecione o provedor correto para manter integridade de filtros e auditoria.",
			"Select the correct provider to keep filters and audit integrity.",
			"Selecciona el proveedor correcto para mantener la integridad de filtros y auditoría.",
			"请选择正确的服务商以保持筛选和审计一致性。",
		),
		identifierLabel: text(
			"Identificador",
			"Identifier",
			"Identificador",
			"标识",
		),
		identifierHint: text(
			"Deve ser único dentro do mesmo provedor (e-mail, login ou ID externo).",
			"Must be unique within the same provider (email, login, or external ID).",
			"Debe ser único dentro del mismo proveedor (correo, login o ID externo).",
			"在同一服务商内必须唯一（邮箱、登录名或外部 ID）。",
		),
		accountStatusLabel: text(
			"Status da conta",
			"Account status",
			"Estado de la cuenta",
			"账号状态",
		),
		accountStatusHint: text(
			"Use status para refletir risco operacional atual da conta.",
			"Use status to reflect the account's current operational risk.",
			"Usa el estado para reflejar el riesgo operativo actual de la cuenta.",
			"请使用状态反映账号当前运营风险。",
		),
		accountTypeLabel: text(
			"Tipo de conta",
			"Account type",
			"Tipo de cuenta",
			"账号类型",
		),
		resetDateTimeLabel: text(
			"Data e hora do próximo reset",
			"Next reset datetime",
			"Fecha y hora del próximo reinicio",
			"下次重置日期时间",
		),
		resetIntervalHint: text(
			"Intervalo em minutos para projeção automática de próximo ciclo.",
			"Interval in minutes for automatic next-cycle projection.",
			"Intervalo en minutos para proyección automática del siguiente ciclo.",
			"以分钟为单位，用于自动推算下个周期。",
		),
		resetDateHint: text(
			"Use quando já souber a janela exata de renovação da conta.",
			"Use when you already know the exact account reset window.",
			"Úsalo cuando ya conozcas la ventana exacta de renovación de la cuenta.",
			"当你已知账号的准确重置窗口时使用。",
		),
		passwordOrTokenLabel: text(
			"Senha ou token",
			"Password or token",
			"Contraseña o token",
			"密码或令牌",
		),
		apiKeyLabel: text("Chave de API", "API key", "Clave API", "API 密钥"),
		sessionTokenLabel: text(
			"Token de sessão",
			"Session token",
			"Token de sesión",
			"会话令牌",
		),
		cookiesReferenceLabel: text(
			"Referência de cookies",
			"Cookies reference",
			"Referencia de cookies",
			"Cookie 引用",
		),
		secretNotesLabel: text(
			"Notas sensíveis",
			"Secret notes",
			"Notas sensibles",
			"敏感备注",
		),
		sensitiveMetadataHint: text(
			"Os campos abaixo são criptografados e só podem ser revelados com reautenticação.",
			"Fields below are encrypted and can only be revealed with re-authentication.",
			"Los campos de abajo están cifrados y solo se pueden revelar con reautenticación.",
			"下方字段已加密，仅可通过重新验证后查看。",
		),
		clearSecretHint: text(
			"Marque apenas se quiser remover o segredo já armazenado no banco.",
			"Check only if you want to remove the secret currently stored in the database.",
			"Marca solo si quieres eliminar el secreto ya almacenado en la base.",
			"仅当你要删除数据库中已存储的密钥时勾选。",
		),
		sensitiveMetadataCollapsedHint: text(
			"Expandir apenas quando precisar registrar ou ajustar credenciais.",
			"Expand only when you need to register or adjust credentials.",
			"Expandir solo cuando necesites registrar o ajustar credenciales.",
			"仅在需要登记或调整凭据时展开。",
		),
		deleteAccountAria: (name: string) =>
			text(
				`Excluir conta ${name}`,
				`Delete account ${name}`,
				`Eliminar cuenta ${name}`,
				`删除账号 ${name}`,
			),
		accountArchived: (name: string) =>
			text(
				`Conta "${name}" arquivada.`,
				`Account "${name}" archived.`,
				`Cuenta "${name}" archivada.`,
				`账号“${name}”已归档。`,
			),
		accountDeleted: (name: string) =>
			text(
				`Conta "${name}" excluída.`,
				`Account "${name}" deleted.`,
				`Cuenta "${name}" eliminada.`,
				`账号“${name}”已删除。`,
			),
		statusActive: text("Ativa", "Active", "Activa", "活跃"),
		statusWarning: text("Atenção", "Warning", "Advertencia", "警告"),
		statusLimited: text("Limitada", "Limited", "Limitada", "受限"),
		statusExhausted: text("Esgotada", "Exhausted", "Agotada", "已耗尽"),
		statusDisabled: text("Desativada", "Disabled", "Desactivada", "已禁用"),
		statusError: text("Erro", "Error", "Error", "错误"),
		statusArchived: text("Arquivada", "Archived", "Archivada", "已归档"),
		activeInApp: text(
			"Ativa no app",
			"Active in app",
			"Activa en app",
			"应用中激活",
		),
		useThisAccount: text(
			"Usar esta conta",
			"Use this account",
			"Usar esta cuenta",
			"使用此账号",
		),
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
	const [activeAccountMap, setActiveAccountMap] = useState<
		Record<string, string>
	>({});
	const sensitiveDetailsRef = useRef<HTMLDetailsElement>(null);
	const passwordOrTokenInputRef = useRef<HTMLInputElement>(null);
	/** Ref to the form panel — used to scroll-to + highlight on edit */
	const formPanelRef = useRef<HTMLElement>(null);

	// Fase F — sort, quota config, selection, groups
	const [sortConfig, setSortConfig] = useState<SortConfig>(loadSortFromStorage);
	const [quotaConfig, setQuotaConfig] =
		useState<QuotaConfig>(DEFAULT_QUOTA_CONFIG);
	const [groups, setGroups] = useState<AccountGroup[]>([]);
	/** Group the account currently belongs to (populated on startEdit) */
	const [editingGroupId, setEditingGroupId] = useState<string>("");
	const [isBulkLoading, setIsBulkLoading] = useState(false);
	const [pendingBulkAction, setPendingBulkAction] = useState<
		"archive" | "delete" | null
	>(null);

	const selection = useAccountSelection();

	// Persist sort config to localStorage
	function applySort(cfg: SortConfig) {
		setSortConfig(cfg);
		try {
			localStorage.setItem(SORT_LS_KEY, JSON.stringify(cfg));
		} catch {
			/* ignore */
		}
	}

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

	// Load active account map
	useEffect(() => {
		fetch("/api/settings/active-account-map")
			.then((res) => res.json())
			.then((data: { map?: Record<string, string> }) => {
				if (data.map) setActiveAccountMap(data.map);
			})
			.catch(() => {
				/* silent */
			});
	}, []);

	// Load quota config from API
	useEffect(() => {
		fetch("/api/settings/quota-config")
			.then((r) => r.json())
			.then((d: { config?: QuotaConfig }) => {
				if (d.config) setQuotaConfig(d.config);
			})
			.catch(() => {
				/* silent */
			});
	}, []);

	// Load groups
	useEffect(() => {
		fetch("/api/settings/account-groups")
			.then((r) => r.json())
			.then((d: { groups?: AccountGroup[] }) => {
				if (d.groups) setGroups(d.groups);
			})
			.catch(() => {
				/* silent */
			});
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: selection.clearAll is stable (useCallback with no deps)
	useEffect(() => {
		void baseQueryString;
		setRequestCursor(null);
		setNextCursor(null);
		setHasMore(false);
		setAccounts([]);
		selection.clearAll();
	}, [baseQueryString]);

	useEffect(() => {
		void reloadToken;
		void loadAccounts();
	}, [loadAccounts, reloadToken]);

	// Auto-refresh hook
	const { isRefreshing, sinceLabel } = useAccountsAutoRefresh({
		intervalMinutes: quotaConfig.refreshIntervalMinutes,
		skipInitial: true,
		onRefresh: useCallback(async () => {
			setReloadToken((v) => v + 1);
		}, []),
	});

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
		// Pre-select the group this account currently belongs to
		const currentGroup = groups.find((g) => g.accountIds.includes(account.id));
		setEditingGroupId(currentGroup?.id ?? "");
		// Scroll the form panel into view and flash-highlight it
		window.setTimeout(() => scrollToForm(formPanelRef), 60);
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

			// ── Assign to group (if editing and a group was selected/changed) ───────────
			if (editingId) {
				const currentGroup = groups.find((g) =>
					g.accountIds.includes(editingId),
				);
				const targetGroupId = editingGroupId || "";

				if (currentGroup && currentGroup.id !== targetGroupId) {
					// Remove from old group
					await fetch(`/api/settings/account-groups/${currentGroup.id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							accountIds: currentGroup.accountIds.filter(
								(id) => id !== editingId,
							),
						}),
					});
				}

				if (targetGroupId && targetGroupId !== currentGroup?.id) {
					// Add to new group
					const targetGroup = groups.find((g) => g.id === targetGroupId);
					if (targetGroup) {
						const nextIds = Array.from(
							new Set([...targetGroup.accountIds, editingId]),
						);
						await fetch(`/api/settings/account-groups/${targetGroup.id}`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ accountIds: nextIds }),
						});
					}
				}
				// Refresh groups silently after group change
				const gRes = await fetch("/api/settings/account-groups");
				if (gRes.ok) {
					const gData = (await gRes.json()) as {
						groups?: AccountGroup[];
					};
					if (gData.groups) setGroups(gData.groups);
				}
			}
			// ──────────────────────────────────────────────────────────────────

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
				message: ui.accountArchived(account.displayName),
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
				message: ui.accountDeleted(account.displayName),
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

	function isActiveInApp(account: AccountView) {
		return activeAccountMap[account.providerId] === account.id;
	}

	// Bulk action handler
	async function executeBulkAction(action: "archive" | "delete") {
		const ids = Array.from(selection.selectedIds);
		if (ids.length === 0) return;
		setIsBulkLoading(true);
		try {
			const res = await fetch("/api/accounts/bulk", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action, ids }),
			});
			if (!res.ok) throw new Error("Falha na operação em lote.");
			selection.clearAll();
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setAccounts([]);
			setReloadToken((v) => v + 1);
			setFeedback({
				tone: "success",
				message:
					action === "archive"
						? `${ids.length} conta(s) arquivada(s).`
						: `${ids.length} conta(s) excluída(s).`,
			});
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : "Erro desconhecido.",
			});
		} finally {
			setIsBulkLoading(false);
			setPendingBulkAction(null);
		}
	}

	// Export selected accounts as JSON download
	function exportSelectedAsJson() {
		const ids = Array.from(selection.selectedIds);
		const selected = accounts.filter((a) => ids.includes(a.id));
		const data = JSON.stringify(selected, null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `accounts-export-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Bulk move selected accounts to a group
	async function executeBulkMoveToGroup(targetGroupId: string) {
		const ids = Array.from(selection.selectedIds);
		if (!ids.length || !targetGroupId) return;
		setIsBulkLoading(true);
		try {
			// Update each group: add ids to targetGroup, remove from all others
			const targetGroup = groups.find((g) => g.id === targetGroupId);
			if (!targetGroup) throw new Error();

			const mergedIds = Array.from(
				new Set([...targetGroup.accountIds, ...ids]),
			);
			const res = await fetch(`/api/settings/account-groups/${targetGroupId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ accountIds: mergedIds }),
			});
			if (!res.ok) throw new Error();

			// Remove ids from all other groups in one pass
			await Promise.all(
				groups
					.filter(
						(g) =>
							g.id !== targetGroupId &&
							ids.some((id) => g.accountIds.includes(id)),
					)
					.map((g) =>
						fetch(`/api/settings/account-groups/${g.id}`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								accountIds: g.accountIds.filter((id) => !ids.includes(id)),
							}),
						}),
					),
			);

			// Refresh groups state locally
			setGroups((prev) =>
				prev.map((g) => {
					if (g.id === targetGroupId) return { ...g, accountIds: mergedIds };
					return {
						...g,
						accountIds: g.accountIds.filter((id) => !ids.includes(id)),
					};
				}),
			);

			selection.clearAll();
			const groupName = targetGroup.name;
			setFeedback({
				tone: "success",
				message: `${ids.length} conta(s) movida(s) para "${groupName}".`,
			});
		} catch {
			setFeedback({
				tone: "error",
				message: "Falha ao mover contas para o grupo.",
			});
		} finally {
			setIsBulkLoading(false);
		}
	}

	// Handle pre-filled import from local session
	// Uses POST /api/accounts/import-local for atomic create + encrypted secret storage.
	// Falls back to form pre-fill if the API call fails.
	async function handleLocalImport(detected: DetectedLocalAccount) {
		try {
			const res = await fetch("/api/accounts/import-local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					identifier: detected.identifier,
					displayName: detected.displayName,
					providerSlug: detected.providerSlug,
					planName: detected.planName,
					// tokenPreview is masked — full token not available in web mode.
					// In Tauri mode the dialog passes the full token if present.
					rawToken: undefined,
				}),
			});
			if (res.ok) {
				const data = (await res.json()) as {
					account: { id: string };
					secretStored: boolean;
				};
				// Reload accounts list to include the newly created account
				const accountsRes = await fetch("/api/accounts?limit=200");
				if (accountsRes.ok) {
					const accountsData = (await accountsRes.json()) as {
						accounts: (typeof accounts)[number][];
					};
					setAccounts(
						(accountsData.accounts ?? []).map(
							(a) => a as (typeof accounts)[number],
						),
					);
				}
				// Briefly show success on the form area
				setEditingId(data.account.id);
				return;
			}
		} catch {
			// Silent — fall through to form pre-fill
		}
		// Fallback: pre-fill the creation form
		const provider = providers.find((p) =>
			p.name.toLowerCase().includes(detected.providerSlug),
		);
		setForm((prev) => ({
			...emptyForm,
			providerId: provider?.id ?? prev.providerId,
			displayName: detected.displayName,
			identifier: detected.identifier,
			planName: detected.planName ?? "",
		}));
		setEditingId(null);
	}

	// Sorted accounts (client-side sort applied after API results)
	const sortedAccounts = useMemo(() => {
		const filtered = filters.groupId
			? accounts.filter((a) => {
					const group = groups.find((g) => g.id === filters.groupId);
					return group?.accountIds.includes(a.id) ?? false;
				})
			: accounts;

		return [...filtered].sort((a, b) => {
			let valA: string | number = a.displayName;
			let valB: string | number = b.displayName;

			if (sortConfig.field === "priority") {
				valA = a.priority;
				valB = b.priority;
			} else if (sortConfig.field === "status") {
				valA = a.status;
				valB = b.status;
			} else if (sortConfig.field === "usedPercent") {
				valA = a.latestUsage?.usedPercent ?? 0;
				valB = b.latestUsage?.usedPercent ?? 0;
			}

			if (valA < valB) return sortConfig.dir === "asc" ? -1 : 1;
			if (valA > valB) return sortConfig.dir === "asc" ? 1 : -1;
			return 0;
		});
	}, [accounts, sortConfig, filters.groupId, groups]);

	async function unarchiveAccount(account: AccountView) {
		try {
			const response = await fetch(`/api/accounts/${account.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "active" }),
			});
			if (!response.ok) throw new Error("Falha ao desarquivar.");
			setFeedback({
				tone: "success",
				message: `Conta "${account.displayName}" restaurada.`,
			});
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setAccounts([]);
			setReloadToken((v) => v + 1);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : "Erro desconhecido.",
			});
		}
	}

	async function setActiveAccount(account: AccountView) {
		try {
			const response = await fetch("/api/settings/active-account-map", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					providerId: account.providerId,
					accountId: account.id,
				}),
			});
			if (response.ok) {
				setActiveAccountMap((prev) => ({
					...prev,
					[account.providerId]: account.id,
				}));
			}
		} catch {
			/* silent failure — non-critical UX feature */
		}
	}

	return (
		<section className="space-y-5">
			{/* Quota Alert Banner */}
			<QuotaAlertBanner
				accounts={accounts}
				thresholdPercent={quotaConfig.alertThresholdPercent}
				locale={locale}
			/>

			<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold">{ui.filterTitle}</h2>
						{/* Auto-refresh status */}
						{sinceLabel && (
							<span className="text-[10px] text-muted-foreground">
								{isRefreshing ? "↻ atualizando..." : `↻ ${sinceLabel}`}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<LocalImportDialog locale={locale} onImport={handleLocalImport} />
						<QuickAddAccountDialog
							locale={locale}
							providers={providers}
							onSuccess={() => {
								setRequestCursor(null);
								setNextCursor(null);
								setHasMore(false);
								setAccounts([]);
								setReloadToken((value) => value + 1);
							}}
						/>
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
				</div>
				<div className="grid gap-3 md:grid-cols-6">
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
					{/* Group filter dropdown */}
					<select
						aria-label="Filtrar por grupo"
						value={filters.groupId}
						onChange={(event) =>
							setFilters((previous) => ({
								...previous,
								groupId: event.target.value,
							}))
						}
						className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						<option value="">Todos os grupos</option>
						{groups.map((g) => (
							<option key={g.id} value={g.id}>
								{g.name}
							</option>
						))}
					</select>
					{/* Archived filter — styled toggle button for discoverability */}
					<button
						type="button"
						onClick={() =>
							setFilters((previous) => ({
								...previous,
								includeArchived: !previous.includeArchived,
							}))
						}
						className={`h-10 rounded-md border px-3 text-sm font-medium transition ${
							filters.includeArchived
								? "border-primary/50 bg-primary/10 text-primary"
								: "border-border bg-card text-muted-foreground hover:bg-muted"
						}`}
						title={
							filters.includeArchived
								? "Ocultar arquivadas"
								: "Ver arquivadas (ocultas por default)"
						}
						aria-pressed={filters.includeArchived}
					>
						📦 {ui.includeArchived}
					</button>
				</div>
			</article>

			<div className="grid gap-5 lg:grid-cols-[minmax(300px,370px),1fr]">
				<article
					ref={formPanelRef as React.RefObject<HTMLElement>}
					className="h-fit rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur transition-[box-shadow]"
				>
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
						{/* Group assignment — only shown when editing an existing account */}
						{editingId && groups.length > 0 && (
							<div className="space-y-1">
								<label
									htmlFor="account-group-select"
									className="text-xs text-muted-foreground"
								>
									{locale === "pt_BR" || locale === "pt_PT" ? "Grupo" : "Group"}
								</label>
								<select
									id="account-group-select"
									value={editingGroupId}
									onChange={(e) => setEditingGroupId(e.target.value)}
									className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								>
									<option value="">
										{locale === "pt_BR" || locale === "pt_PT"
											? "Sem grupo"
											: "No group"}
									</option>
									{groups.map((g) => (
										<option key={g.id} value={g.id}>
											{g.name}
										</option>
									))}
								</select>
							</div>
						)}
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
					<div className="mb-3 flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-semibold">{ui.accountsTitle}</h2>
							<span className="text-sm text-muted-foreground">
								{sortedAccounts.length} {ui.totalSuffix}
							</span>
						</div>
						{/* Sort controls */}
						<div className="flex items-center gap-1.5">
							{selection.hasSelection && (
								<button
									type="button"
									onClick={() =>
										selection.selectAll(sortedAccounts.map((a) => a.id))
									}
									className="text-xs text-primary hover:underline"
								>
									Selecionar todos
								</button>
							)}
							<select
								aria-label="Ordenar por"
								value={`${sortConfig.field}:${sortConfig.dir}`}
								onChange={(e) => {
									const [field, dir] = e.target.value.split(":") as [
										SortConfig["field"],
										SortConfig["dir"],
									];
									applySort({ field, dir });
								}}
								className="h-8 rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2"
							>
								<option value="displayName:asc">Nome A→Z</option>
								<option value="displayName:desc">Nome Z→A</option>
								<option value="priority:asc">Prioridade ↑</option>
								<option value="priority:desc">Prioridade ↓</option>
								<option value="usedPercent:desc">Uso alto</option>
								<option value="usedPercent:asc">Uso baixo</option>
								<option value="status:asc">Status</option>
							</select>
						</div>
					</div>

					{/* Bulk action floating toolbar */}
					{selection.hasSelection && (
						<div
							role="toolbar"
							aria-label={`${selection.selectedIds.size} conta(s) selecionada(s)`}
							className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 shadow-token-sm"
						>
							<span className="mr-1 text-xs font-semibold text-primary">
								{selection.selectedIds.size} selecionada(s)
							</span>
							<button
								type="button"
								onClick={() =>
									selection.selectAll(sortedAccounts.map((a) => a.id))
								}
								className="text-xs text-primary underline-offset-2 hover:underline"
								disabled={isBulkLoading}
							>
								Selecionar todas ({sortedAccounts.length})
							</button>
							<button
								type="button"
								onClick={exportSelectedAsJson}
								disabled={isBulkLoading}
								className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
							>
								Exportar JSON
							</button>
							{groups.length > 0 && (
								<select
									aria-label="Mover para grupo"
									defaultValue=""
									onChange={(e) => {
										if (e.target.value)
											void executeBulkMoveToGroup(e.target.value);
										e.target.value = "";
									}}
									disabled={isBulkLoading}
									className="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2 disabled:opacity-50"
								>
									<option value="">Mover para grupo…</option>
									{groups.map((g) => (
										<option key={g.id} value={g.id}>
											{g.name}
										</option>
									))}
								</select>
							)}
							<button
								type="button"
								onClick={() => setPendingBulkAction("archive")}
								disabled={isBulkLoading}
								className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-warning transition hover:bg-warning/10 disabled:opacity-50"
							>
								Arquivar
							</button>
							<button
								type="button"
								onClick={() => setPendingBulkAction("delete")}
								disabled={isBulkLoading}
								className="inline-flex h-7 items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 text-xs font-medium text-danger transition hover:bg-danger/20 disabled:opacity-50"
							>
								Excluir
							</button>
							<button
								type="button"
								onClick={() => selection.clearAll()}
								className="ml-auto text-xs text-muted-foreground hover:text-foreground"
								disabled={isBulkLoading}
							>
								Limpar seleção
							</button>
						</div>
					)}

					{feedback?.tone === "error" ? (
						<p
							role="alert"
							aria-live="assertive"
							className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
						>
							{feedback.message}
						</p>
					) : feedback?.tone === "success" ? (
						<output
							aria-live="polite"
							className="mb-3 block rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
						>
							{feedback.message}
						</output>
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
					) : sortedAccounts.length === 0 ? (
						<p className="text-sm text-muted-foreground">{ui.noAccounts}</p>
					) : viewMode === "cards" ? (
						<div className="grid gap-3 md:grid-cols-2">
							{sortedAccounts.map((account) => (
								<div
									key={account.id}
									className={`rounded-xl border bg-background/40 p-4 transition ${
										selection.isSelected(account.id)
											? "border-primary/60 ring-2 ring-primary/20"
											: isActiveInApp(account)
												? "border-primary/50 ring-1 ring-primary/30"
												: "border-border"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										{/* Selection checkbox */}
										<label className="mt-0.5 shrink-0">
											<input
												type="checkbox"
												checked={selection.isSelected(account.id)}
												onChange={() => selection.toggle(account.id)}
												aria-label={`Selecionar ${account.displayName}`}
												className="h-4 w-4 accent-primary"
											/>
										</label>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												<h3 className="text-base font-semibold">
													<Link
														href={`/accounts/${account.id}`}
														className="hover:underline"
													>
														{account.displayName}
													</Link>
												</h3>
												{isActiveInApp(account) && (
													<span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
														<span
															className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
															aria-hidden
														/>
														{ui.activeInApp}
													</span>
												)}
											</div>
											<p className="text-sm text-muted-foreground">
												{account.identifier}
											</p>
											<div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
												<ProviderBrand
													name={account.provider?.name ?? ui.unknownProvider}
													icon={account.provider?.icon}
													color={account.provider?.color}
													size="sm"
												/>
												<span aria-hidden>•</span>
												<span className="truncate">
													{account.planName ?? ui.noPlan}
												</span>
											</div>
										</div>
										<span
											className={`shrink-0 rounded-md px-2 py-1 text-xs ${
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

									{/* Tags row */}
									<div className="mt-3 flex flex-wrap gap-1">
										{account.tags.map((tag) => (
											<span
												key={`${account.id}-${tag}`}
												className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
											>
												{tag}
											</span>
										))}
										{account.hasSecret ? (
											<span className="rounded-md border border-info/30 bg-info/10 px-2 py-0.5 text-xs text-info">
												{ui.hasSecret}
											</span>
										) : null}
									</div>

									<div className="mt-2 text-xs text-muted-foreground">
										{ui.nextReset}: {formatDateTime(account.nextResetAt)}
									</div>

									{/* Archived notice + restore button */}
									{account.status === "archived" && (
										<div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-muted bg-muted/50 px-3 py-2">
											<span className="text-xs text-muted-foreground">
												📦 Arquivada — não aparece nas operações ativas.
											</span>
											<button
												type="button"
												onClick={() => void unarchiveAccount(account)}
												className="ml-auto shrink-0 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/20"
											>
												↩ Desarquivar
											</button>
										</div>
									)}
									<div className="mt-3 space-y-1">
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>{ui.usage}</span>
											<span>{usagePercent(account).toFixed(1)}%</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-muted">
											<div
												className={`progress-dynamic h-full ${
													usagePercent(account) >= 90
														? "bg-danger"
														: usagePercent(account) >= 70
															? "bg-warning"
															: "bg-success"
												}`}
												style={
													{
														"--pw": `${Math.min(100, Math.max(0, usagePercent(account)))}%`,
													} as React.CSSProperties
												}
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											{ui.lastMeasure}:{" "}
											{formatDateTime(account.latestUsage?.measuredAt ?? null)}
										</p>
									</div>

									{/* Action bar */}
									<div className="mt-4 flex flex-wrap items-center gap-1.5">
										{/* Open detail page */}
										<Link
											href={`/accounts/${account.id}`}
											aria-label={`${ui.open} — ${account.displayName}`}
											title={ui.open}
											className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
										>
											{ui.open}
										</Link>

										{/* Edit */}
										<button
											type="button"
											onClick={() => startEdit(account)}
											aria-label={`${ui.edit} — ${account.displayName}`}
											title={ui.edit}
											className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
										>
											{/* Pencil icon */}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
												className="h-4 w-4"
												role="img"
												aria-label={ui.edit}
											>
												<title>{ui.edit}</title>
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
											</svg>
										</button>

										{/* Tag editor */}
										<TagEditorDialog
											accountId={account.id}
											accountName={account.displayName}
											initialTags={account.tags}
											locale={locale}
											onSaved={(tags) => {
												setAccounts((prev) =>
													prev.map((a) =>
														a.id === account.id ? { ...a, tags } : a,
													),
												);
											}}
										/>

										{/* Quick usage update (icon-only) */}
										{/* Quick usage update — manual entry required (no provider API yet) */}
										<span title="Atualizar cota manualmente (informe total e usado)">
											<QuickUsageUpdate
												accountId={account.id}
												locale={locale}
												iconOnly
												onSaved={(snapshot) =>
													applySnapshotToAccount(account.id, snapshot)
												}
											/>
										</span>

										{/* Export JSON */}
										<ExportJsonDialog account={account} locale={locale} />

										{/* Archive */}
										<button
											type="button"
											onClick={() => void archiveAccount(account)}
											aria-label={`${ui.archive} — ${account.displayName}`}
											title={ui.archive}
											className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
										>
											{/* Archive icon */}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
												className="h-4 w-4"
												role="img"
												aria-label={ui.archive}
											>
												<title>{ui.archive}</title>
												<polyline points="21 8 21 21 3 21 3 8" />
												<rect x="1" y="3" width="22" height="5" />
												<line x1="10" y1="12" x2="14" y2="12" />
											</svg>
										</button>

										{/* Delete */}
										<button
											type="button"
											onClick={() => setPendingDeleteAccount(account)}
											aria-label={ui.deleteAccountAria(account.displayName)}
											title={ui.delete}
											className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 bg-card text-danger transition hover:bg-danger/10"
										>
											{/* Trash icon */}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
												className="h-4 w-4"
												role="img"
												aria-label={ui.delete}
											>
												<title>{ui.delete}</title>
												<polyline points="3 6 5 6 21 6" />
												<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
												<path d="M10 11v6" />
												<path d="M14 11v6" />
												<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
											</svg>
										</button>
									</div>

									{/* Set as active account button */}
									{!isActiveInApp(account) && (
										<button
											type="button"
											onClick={() => void setActiveAccount(account)}
											className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
												className="h-3.5 w-3.5"
												role="img"
												aria-label={ui.useThisAccount}
											>
												<title>{ui.useThisAccount}</title>
												<polyline points="17 1 21 5 17 9" />
												<path d="M3 11V9a4 4 0 0 1 4-4h14" />
												<polyline points="7 23 3 19 7 15" />
												<path d="M21 13v2a4 4 0 0 1-4 4H3" />
											</svg>
											{ui.useThisAccount}
										</button>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="overflow-x-auto rounded-lg border border-border">
							<table className="min-w-[760px] text-sm">
								<thead className="bg-muted/70 text-left text-muted-foreground">
									<tr>
										<th className="w-8 pl-3 pr-1 py-2">
											<input
												type="checkbox"
												aria-label="Selecionar todos"
												checked={
													sortedAccounts.length > 0 &&
													sortedAccounts.every((a) =>
														selection.isSelected(a.id),
													)
												}
												onChange={(e) => {
													if (e.target.checked)
														selection.selectAll(
															sortedAccounts.map((a) => a.id),
														);
													else selection.clearAll();
												}}
												className="h-4 w-4 accent-primary"
											/>
										</th>
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
										<tr
											key={account.id}
											className={`border-t border-border/80 transition-colors ${
												selection.isSelected(account.id)
													? "bg-primary/5"
													: "hover:bg-muted/20"
											}`}
										>
											{/* Row selection checkbox */}
											<td className="w-8 pl-3 pr-1 py-2">
												<input
													type="checkbox"
													checked={selection.isSelected(account.id)}
													onChange={() => selection.toggle(account.id)}
													aria-label={`Selecionar ${account.displayName}`}
													className="h-4 w-4 accent-primary"
												/>
											</td>
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
												<ProviderBrand
													name={account.provider?.name ?? ui.unknownProvider}
													icon={account.provider?.icon}
													color={account.provider?.color}
													size="sm"
												/>
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
