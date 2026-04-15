"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderBrand } from "@/features/providers/components/provider-brand";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import {
	HIGH_RISK_CONNECTOR_CONFIRMATION_PHRASE,
	SENSITIVE_CONNECTOR_CONFIRMATION_HEADER,
} from "@/lib/security/connector-gate";
import { useCallback, useEffect, useState } from "react";

type ConnectorType =
	| "manual"
	| "api"
	| "cookie_session"
	| "web_automation"
	| "custom_script";

type Provider = {
	id: string;
	name: string;
	slug: string;
	icon: string | null;
	color: string | null;
	description: string | null;
	connectorType: ConnectorType;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

type ProviderFormState = {
	name: string;
	slug: string;
	icon: string;
	color: string;
	description: string;
	connectorType: ConnectorType;
	isActive: boolean;
};

type FeedbackState = {
	tone: "success" | "error";
	message: string;
};

type ProvidersPageResponse = {
	providers: Provider[];
	page?: {
		limit: number;
		nextCursor: string | null;
	};
};

const initialForm: ProviderFormState = {
	name: "",
	slug: "",
	icon: "",
	color: "#3B82F6",
	description: "",
	connectorType: "manual",
	isActive: true,
};

type ProvidersManagerProps = {
	locale: AppLocale;
};

export function ProvidersManager({ locale }: ProvidersManagerProps) {
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });
	const ui = {
		failedFetch: text(
			"Falha ao carregar provedores.",
			"Failed to load providers.",
			"Error al cargar proveedores.",
			"加载服务商失败。",
		),
		failedSave: text(
			"Falha ao salvar provedor.",
			"Failed to save provider.",
			"Error al guardar proveedor.",
			"保存服务商失败。",
		),
		failedDelete: text(
			"Falha ao excluir provedor.",
			"Failed to delete provider.",
			"Error al eliminar proveedor.",
			"删除服务商失败。",
		),
		providerUpdated: text(
			"Provedor atualizado.",
			"Provider updated.",
			"Proveedor actualizado.",
			"服务商已更新。",
		),
		providerCreated: text(
			"Provedor criado.",
			"Provider created.",
			"Proveedor creado.",
			"服务商已创建。",
		),
		providerRemoved: text(
			"Provedor removido.",
			"Provider removed.",
			"Proveedor eliminado.",
			"服务商已删除。",
		),
		editProvider: text(
			"Editar Provedor",
			"Edit Provider",
			"Editar Proveedor",
			"编辑服务商",
		),
		createProvider: text(
			"Criar Provedor",
			"Create Provider",
			"Crear Proveedor",
			"创建服务商",
		),
		newButton: text("Novo", "New", "Nuevo", "新建"),
		name: text("Nome", "Name", "Nombre", "名称"),
		slugOptional: text(
			"Slug (opcional)",
			"Slug (optional)",
			"Slug (opcional)",
			"Slug（可选）",
		),
		slugPlaceholder: text(
			"gerado-automaticamente-se-vazio",
			"auto-generated-if-empty",
			"autogenerado-si-está-vacío",
			"留空自动生成",
		),
		slugHint: text(
			"Use um slug estável para integrações, importação e automações.",
			"Use a stable slug for integrations, import, and automations.",
			"Usa un slug estable para integraciones, importación y automatizaciones.",
			"请使用稳定的 slug 以支持集成、导入和自动化。",
		),
		color: text("Cor", "Color", "Color", "颜色"),
		colorHint: text(
			"Aceita hexadecimal (#RRGGBB) para identificação visual consistente.",
			"Accepts hexadecimal (#RRGGBB) for consistent visual identification.",
			"Acepta hexadecimal (#RRGGBB) para una identificación visual consistente.",
			"支持十六进制 (#RRGGBB) 以保持视觉一致性。",
		),
		icon: "Icon",
		iconPlaceholder: text(
			"nome lucide / url",
			"lucide name / url",
			"nombre lucide / url",
			"lucide 名称 / url",
		),
		iconHint: text(
			"Informe nome de ícone Lucide ou URL de ícone customizado.",
			"Provide a Lucide icon name or a custom icon URL.",
			"Indica un nombre de icono Lucide o URL de icono personalizado.",
			"请输入 Lucide 图标名或自定义图标 URL。",
		),
		iconPreview: text("Pré-visualização", "Preview", "Vista previa", "预览"),
		connectorType: text(
			"Tipo de Conector",
			"Connector Type",
			"Tipo de Conector",
			"连接器类型",
		),
		connectorHint: text(
			"Define como as contas deste provedor serão operadas no sistema.",
			"Defines how accounts for this provider are operated in the system.",
			"Define cómo se operan en el sistema las cuentas de este proveedor.",
			"定义该服务商账号在系统中的运行方式。",
		),
		description: text("Descrição", "Description", "Descripción", "描述"),
		descriptionHint: text(
			"Documente limites, pré-requisitos ou observações operacionais.",
			"Document limits, prerequisites, or operational notes.",
			"Documenta límites, requisitos previos u observaciones operativas.",
			"记录限制、前置条件或运营说明。",
		),
		activeProvider: text(
			"Provedor ativo",
			"Active provider",
			"Proveedor activo",
			"启用服务商",
		),
		saving: text("Salvando...", "Saving...", "Guardando...", "保存中..."),
		updateProvider: text(
			"Atualizar Provedor",
			"Update Provider",
			"Actualizar Proveedor",
			"更新服务商",
		),
		createProviderAction: text(
			"Criar Provedor",
			"Create Provider",
			"Crear Proveedor",
			"创建服务商",
		),
		providersTitle: text("Provedores", "Providers", "Proveedores", "服务商"),
		providersSubtitle: text(
			"Organize contas por provedor e estratégia de conector.",
			"Group accounts by provider and connector strategy.",
			"Organiza cuentas por proveedor y estrategia de conector.",
			"按服务商和连接器策略组织账号。",
		),
		loadingProviders: text(
			"Carregando provedores",
			"Loading providers",
			"Cargando proveedores",
			"正在加载服务商",
		),
		noProviders: text(
			"Nenhum provedor cadastrado.",
			"No providers registered.",
			"No hay proveedores registrados.",
			"暂无服务商。",
		),
		thName: text("Nome", "Name", "Nombre", "名称"),
		thSlug: "Slug",
		thConnector: text("Conector", "Connector", "Conector", "连接器"),
		thStatus: "Status",
		thActions: text("Ações", "Actions", "Acciones", "操作"),
		statusActive: text("Ativo", "Active", "Activo", "启用"),
		statusInactive: text("Inativo", "Inactive", "Inactivo", "停用"),
		edit: text("Editar", "Edit", "Editar", "编辑"),
		delete: text("Excluir", "Delete", "Eliminar", "删除"),
		loadMore: text("Carregar mais", "Load more", "Cargar más", "加载更多"),
		loadingMore: text(
			"Carregando...",
			"Loading...",
			"Cargando...",
			"加载中...",
		),
		deleteProviderTitle: text(
			"Excluir provedor",
			"Delete provider",
			"Eliminar proveedor",
			"删除服务商",
		),
		deleteProviderDescription: (providerName: string) =>
			text(
				`Excluir o provedor "${providerName}"? Esta ação não pode ser desfeita.`,
				`Delete provider "${providerName}"? This action cannot be undone.`,
				`¿Eliminar el proveedor "${providerName}"? Esta acción no se puede deshacer.`,
				`要删除服务商“${providerName}”吗？此操作不可撤销。`,
			),
		sensitiveConnectorTitle: text(
			"Confirmação de Conector Sensível",
			"Sensitive Connector Confirmation",
			"Confirmación de conector sensible",
			"敏感连接器确认",
		),
		sensitiveConnectorHint: text(
			"Para Automação Web ou Script Customizado, confirme explicitamente a alteração.",
			"For Web Automation or Custom Script, explicitly confirm this change.",
			"Para Automatización Web o Script Personalizado, confirma explícitamente este cambio.",
			"对于网页自动化或自定义脚本，请明确确认此更改。",
		),
		sensitiveConnectorPhraseLabel: text(
			'Digite a frase: "ENABLE HIGH-RISK CONNECTOR"',
			'Type phrase: "ENABLE HIGH-RISK CONNECTOR"',
			'Escribe la frase: "ENABLE HIGH-RISK CONNECTOR"',
			'输入短语："ENABLE HIGH-RISK CONNECTOR"',
		),
	};
	const connectorOptions: Array<{ value: ConnectorType; label: string }> = [
		{ value: "manual", label: "Manual" },
		{ value: "api", label: "API" },
		{
			value: "cookie_session",
			label: text(
				"Sessão por Cookie",
				"Cookie Session",
				"Sesión por Cookie",
				"Cookie 会话",
			),
		},
		{
			value: "web_automation",
			label: text(
				"Automação Web",
				"Web Automation",
				"Automatización Web",
				"网页自动化",
			),
		},
		{
			value: "custom_script",
			label: text(
				"Script Customizado",
				"Custom Script",
				"Script Personalizado",
				"自定义脚本",
			),
		},
	];

	function connectorLabel(value: ConnectorType) {
		if (value === "manual") return "Manual";
		if (value === "api") return "API";
		if (value === "cookie_session")
			return text(
				"Sessão por Cookie",
				"Cookie Session",
				"Sesión por Cookie",
				"Cookie 会话",
			);
		if (value === "web_automation")
			return text(
				"Automação Web",
				"Web Automation",
				"Automatización Web",
				"网页自动化",
			);
		return text(
			"Script Customizado",
			"Custom Script",
			"Script Personalizado",
			"自定义脚本",
		);
	}

	const [providers, setProviders] = useState<Provider[]>([]);
	const [form, setForm] = useState<ProviderFormState>(initialForm);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<FeedbackState | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Provider | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [requestCursor, setRequestCursor] = useState<string | null>(null);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [reloadToken, setReloadToken] = useState(0);
	const [sensitiveConfirmPhrase, setSensitiveConfirmPhrase] = useState("");
	const [editingOriginalConnector, setEditingOriginalConnector] =
		useState<ConnectorType | null>(null);

	const isHighRiskConnector =
		form.connectorType === "web_automation" ||
		form.connectorType === "custom_script";
	const isSensitiveConnectorChange =
		isHighRiskConnector &&
		(editingId === null || editingOriginalConnector !== form.connectorType);

	const loadProviders = useCallback(async () => {
		void reloadToken;
		const isPaginating = requestCursor !== null;
		if (isPaginating) {
			setIsLoadingMore(true);
		} else {
			setIsLoading(true);
		}
		setFeedback(null);

		try {
			const query = new URLSearchParams();
			query.set("limit", "20");
			if (requestCursor) query.set("cursor", requestCursor);
			const response = await fetch(`/api/providers?${query}`, {
				method: "GET",
			});
			if (!response.ok) {
				throw new Error(ui.failedFetch);
			}

			const payload = (await response.json()) as ProvidersPageResponse;
			const pageNextCursor = payload.page?.nextCursor ?? null;

			setNextCursor(pageNextCursor);
			setHasMore(Boolean(pageNextCursor));
			setProviders((previous) =>
				isPaginating ? [...previous, ...payload.providers] : payload.providers,
			);
		} catch {
			setFeedback({ tone: "error", message: ui.failedFetch });
		} finally {
			if (isPaginating) {
				setIsLoadingMore(false);
			} else {
				setIsLoading(false);
			}
		}
	}, [requestCursor, reloadToken, ui.failedFetch]);

	useEffect(() => {
		void loadProviders();
	}, [loadProviders]);

	function updateForm(
		key: keyof ProviderFormState,
		value: string | boolean | ConnectorType,
	) {
		setForm((previous) => ({
			...previous,
			[key]: value,
		}));
	}

	function startCreate() {
		setEditingId(null);
		setForm(initialForm);
		setSensitiveConfirmPhrase("");
		setEditingOriginalConnector(null);
	}

	function startEdit(provider: Provider) {
		setEditingId(provider.id);
		setForm({
			name: provider.name,
			slug: provider.slug,
			icon: provider.icon ?? "",
			color: provider.color ?? "#3B82F6",
			description: provider.description ?? "",
			connectorType: provider.connectorType,
			isActive: provider.isActive,
		});
		setSensitiveConfirmPhrase("");
		setEditingOriginalConnector(provider.connectorType);
	}

	async function saveProvider(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setFeedback(null);

		const body = {
			name: form.name,
			slug: form.slug || undefined,
			icon: form.icon || undefined,
			color: form.color || undefined,
			description: form.description || undefined,
			connectorType: form.connectorType,
			isActive: form.isActive,
		};

		try {
			const response = await fetch(
				editingId ? `/api/providers/${editingId}` : "/api/providers",
				{
					method: editingId ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
						...(sensitiveConfirmPhrase.trim().length > 0
							? {
									[SENSITIVE_CONNECTOR_CONFIRMATION_HEADER]:
										sensitiveConfirmPhrase.trim(),
								}
							: {}),
					},
					body: JSON.stringify(body),
				},
			);

			if (!response.ok) {
				const errorPayload = (await response.json()) as { message?: string };
				throw new Error(errorPayload.message ?? ui.failedSave);
			}

			setFeedback({
				tone: "success",
				message: editingId ? ui.providerUpdated : ui.providerCreated,
			});
			setForm(initialForm);
			setEditingId(null);
			setSensitiveConfirmPhrase("");
			setEditingOriginalConnector(null);
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setProviders([]);
			setReloadToken((value) => value + 1);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : ui.failedSave,
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function removeProvider(provider: Provider) {
		setFeedback(null);
		setIsDeleting(true);

		try {
			const response = await fetch(`/api/providers/${provider.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorPayload = (await response.json()) as { message?: string };
				throw new Error(errorPayload.message ?? ui.failedDelete);
			}

			setFeedback({ tone: "success", message: ui.providerRemoved });
			setPendingDelete(null);
			setRequestCursor(null);
			setNextCursor(null);
			setHasMore(false);
			setProviders([]);
			setReloadToken((value) => value + 1);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : ui.failedDelete,
			});
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(300px,360px),1fr]">
			<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">
						{editingId ? ui.editProvider : ui.createProvider}
					</h2>
					{editingId ? (
						<Button variant="ghost" onClick={startCreate}>
							{ui.newButton}
						</Button>
					) : null}
				</div>

				<form className="space-y-3" onSubmit={saveProvider}>
					<div className="space-y-1.5">
						<label
							htmlFor="provider-name"
							className="text-sm text-muted-foreground"
						>
							{ui.name}
						</label>
						<input
							id="provider-name"
							value={form.name}
							onChange={(event) => updateForm("name", event.target.value)}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="provider-slug"
							className="text-sm text-muted-foreground"
						>
							{ui.slugOptional}
						</label>
						<input
							id="provider-slug"
							value={form.slug}
							onChange={(event) => updateForm("slug", event.target.value)}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							placeholder={ui.slugPlaceholder}
						/>
						<p className="text-xs text-muted-foreground">{ui.slugHint}</p>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label
								htmlFor="provider-color"
								className="text-sm text-muted-foreground"
							>
								{ui.color}
							</label>
							<input
								id="provider-color"
								value={form.color}
								onChange={(event) => updateForm("color", event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							/>
							<p className="text-xs text-muted-foreground">{ui.colorHint}</p>
						</div>
						<div className="space-y-1.5">
							<label
								htmlFor="provider-icon"
								className="text-sm text-muted-foreground"
							>
								{ui.icon}
							</label>
							<input
								id="provider-icon"
								value={form.icon}
								onChange={(event) => updateForm("icon", event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								placeholder={ui.iconPlaceholder}
							/>
							<p className="text-xs text-muted-foreground">{ui.iconHint}</p>
							<div className="pt-1">
								<ProviderBrand
									name={form.name || ui.iconPreview}
									icon={form.icon || null}
									color={form.color || null}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="provider-connector"
							className="text-sm text-muted-foreground"
						>
							{ui.connectorType}
						</label>
						<select
							id="provider-connector"
							value={form.connectorType}
							onChange={(event) =>
								updateForm("connectorType", event.target.value as ConnectorType)
							}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						>
							{connectorOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<p className="text-xs text-muted-foreground">{ui.connectorHint}</p>
					</div>

					{isHighRiskConnector ? (
						<div className="space-y-1.5 rounded-md border border-warning/40 bg-warning/10 p-3">
							<p className="text-sm font-medium text-warning">
								{ui.sensitiveConnectorTitle}
							</p>
							<p className="text-xs text-muted-foreground">
								{ui.sensitiveConnectorHint}
							</p>
							<label
								htmlFor="provider-sensitive-confirm"
								className="text-xs text-muted-foreground"
							>
								{ui.sensitiveConnectorPhraseLabel}
							</label>
							<input
								id="provider-sensitive-confirm"
								value={sensitiveConfirmPhrase}
								onChange={(event) =>
									setSensitiveConfirmPhrase(event.target.value)
								}
								placeholder={HIGH_RISK_CONNECTOR_CONFIRMATION_PHRASE}
								required={isSensitiveConnectorChange}
								className="h-10 w-full rounded-md border border-warning/40 bg-card px-3 text-sm outline-none ring-warning transition focus:ring-2"
							/>
						</div>
					) : null}

					<div className="space-y-1.5">
						<label
							htmlFor="provider-description"
							className="text-sm text-muted-foreground"
						>
							{ui.description}
						</label>
						<textarea
							id="provider-description"
							value={form.description}
							onChange={(event) =>
								updateForm("description", event.target.value)
							}
							className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none ring-primary transition focus:ring-2"
						/>
						<p className="text-xs text-muted-foreground">
							{ui.descriptionHint}
						</p>
					</div>

					<label className="flex items-center gap-2 text-sm text-muted-foreground">
						<input
							type="checkbox"
							checked={form.isActive}
							onChange={(event) => updateForm("isActive", event.target.checked)}
						/>
						{ui.activeProvider}
					</label>

					<Button type="submit" className="w-full" disabled={isSaving}>
						{isSaving
							? ui.saving
							: editingId
								? ui.updateProvider
								: ui.createProviderAction}
					</Button>
				</form>

				{feedback ? (
					<p
						role={feedback.tone === "error" ? "alert" : "status"}
						aria-live="polite"
						className={`mt-3 rounded-md border px-3 py-2 text-sm ${
							feedback.tone === "success"
								? "border-success/30 bg-success/10 text-success"
								: "border-danger/30 bg-danger/10 text-danger"
						}`}
					>
						{feedback.message}
					</p>
				) : null}
			</article>

			<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<h2 className="text-lg font-semibold">{ui.providersTitle}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{ui.providersSubtitle}
				</p>

				{isLoading && providers.length === 0 ? (
					<output
						aria-live="polite"
						aria-label={ui.loadingProviders}
						className="mt-4 space-y-2"
					>
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</output>
				) : providers.length === 0 ? (
					<p className="mt-4 text-sm text-muted-foreground">{ui.noProviders}</p>
				) : (
					<div className="mt-4 space-y-3">
						<div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
							<table className="w-full min-w-[44rem] text-sm">
								<thead className="bg-muted/70 text-left text-muted-foreground">
									<tr>
										<th className="px-3 py-2">{ui.thName}</th>
										<th className="px-3 py-2">{ui.thSlug}</th>
										<th className="px-3 py-2">{ui.thConnector}</th>
										<th className="px-3 py-2">{ui.thStatus}</th>
										<th className="px-3 py-2 text-right">{ui.thActions}</th>
									</tr>
								</thead>
								<tbody>
									{providers.map((provider) => (
										<tr key={provider.id} className="border-t border-border/80">
											<td className="px-3 py-2 font-medium">
												<ProviderBrand
													name={provider.name}
													icon={provider.icon}
													color={provider.color}
												/>
											</td>
											<td className="px-3 py-2 text-muted-foreground">
												{provider.slug}
											</td>
											<td className="px-3 py-2 text-muted-foreground">
												{connectorLabel(provider.connectorType)}
											</td>
											<td className="px-3 py-2">
												<span
													className={`rounded-md px-2 py-1 text-xs ${
														provider.isActive
															? "bg-success/15 text-success"
															: "bg-muted text-muted-foreground"
													}`}
												>
													{provider.isActive
														? ui.statusActive
														: ui.statusInactive}
												</span>
											</td>
											<td className="px-3 py-2 text-right">
												<div className="inline-flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => startEdit(provider)}
													>
														{ui.edit}
													</Button>
													<Button
														variant="ghost"
														size="sm"
														aria-label={text(
															`Excluir provedor ${provider.name}`,
															`Delete provider ${provider.name}`,
															`Eliminar proveedor ${provider.name}`,
															`删除服务商 ${provider.name}`,
														)}
														onClick={() => setPendingDelete(provider)}
													>
														{ui.delete}
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{hasMore ? (
							<div className="flex justify-end">
								<Button
									variant="outline"
									size="sm"
									disabled={isLoadingMore}
									onClick={() => {
										if (nextCursor) {
											setRequestCursor(nextCursor);
											setReloadToken((value) => value + 1);
										}
									}}
								>
									{isLoadingMore ? ui.loadingMore : ui.loadMore}
								</Button>
							</div>
						) : null}
					</div>
				)}
			</article>
			<ConfirmDialog
				open={Boolean(pendingDelete)}
				title={ui.deleteProviderTitle}
				description={
					pendingDelete ? ui.deleteProviderDescription(pendingDelete.name) : ""
				}
				confirmLabel={ui.delete}
				tone="danger"
				isLoading={isDeleting}
				onCancel={() => {
					if (!isDeleting) {
						setPendingDelete(null);
					}
				}}
				onConfirm={() => {
					if (pendingDelete) {
						void removeProvider(pendingDelete);
					}
				}}
			/>
		</section>
	);
}
