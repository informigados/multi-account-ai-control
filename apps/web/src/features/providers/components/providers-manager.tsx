"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppLocale } from "@/lib/i18n";
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
	const isPtBr = locale === "pt_BR";
	const ui = {
		failedFetch: isPtBr
			? "Falha ao carregar provedores."
			: "Failed to load providers.",
		failedSave: isPtBr
			? "Falha ao salvar provedor."
			: "Failed to save provider.",
		failedDelete: isPtBr
			? "Falha ao excluir provedor."
			: "Failed to delete provider.",
		providerUpdated: isPtBr ? "Provedor atualizado." : "Provider updated.",
		providerCreated: isPtBr ? "Provedor criado." : "Provider created.",
		providerRemoved: isPtBr ? "Provedor removido." : "Provider removed.",
		editProvider: isPtBr ? "Editar Provedor" : "Edit Provider",
		createProvider: isPtBr ? "Criar Provedor" : "Create Provider",
		newButton: isPtBr ? "Novo" : "New",
		name: isPtBr ? "Nome" : "Name",
		slugOptional: isPtBr ? "Slug (opcional)" : "Slug (optional)",
		slugPlaceholder: isPtBr
			? "gerado-automaticamente-se-vazio"
			: "auto-generated-if-empty",
		slugHint: isPtBr
			? "Use um slug estável para integrações, importação e automações."
			: "Use a stable slug for integrations, import, and automations.",
		color: isPtBr ? "Cor" : "Color",
		colorHint: isPtBr
			? "Aceita hexadecimal (#RRGGBB) para identificação visual consistente."
			: "Accepts hexadecimal (#RRGGBB) for consistent visual identification.",
		icon: "Icon",
		iconPlaceholder: isPtBr ? "nome lucide / url" : "lucide name / url",
		iconHint: isPtBr
			? "Informe nome de ícone Lucide ou URL de ícone customizado."
			: "Provide a Lucide icon name or a custom icon URL.",
		connectorType: isPtBr ? "Tipo de Conector" : "Connector Type",
		connectorHint: isPtBr
			? "Define como as contas deste provedor serão operadas no sistema."
			: "Defines how accounts for this provider are operated in the system.",
		description: isPtBr ? "Descrição" : "Description",
		descriptionHint: isPtBr
			? "Documente limites, pré-requisitos ou observações operacionais."
			: "Document limits, prerequisites, or operational notes.",
		activeProvider: isPtBr ? "Provedor ativo" : "Active provider",
		saving: isPtBr ? "Salvando..." : "Saving...",
		updateProvider: isPtBr ? "Atualizar Provedor" : "Update Provider",
		createProviderAction: isPtBr ? "Criar Provedor" : "Create Provider",
		providersTitle: isPtBr ? "Provedores" : "Providers",
		providersSubtitle: isPtBr
			? "Organize contas por provedor e estratégia de conector."
			: "Group accounts by provider and connector strategy.",
		loadingProviders: isPtBr ? "Carregando provedores" : "Loading providers",
		noProviders: isPtBr
			? "Nenhum provedor cadastrado."
			: "No providers registered.",
		thName: isPtBr ? "Nome" : "Name",
		thSlug: "Slug",
		thConnector: isPtBr ? "Conector" : "Connector",
		thStatus: "Status",
		thActions: isPtBr ? "Ações" : "Actions",
		statusActive: isPtBr ? "Ativo" : "Active",
		statusInactive: isPtBr ? "Inativo" : "Inactive",
		edit: isPtBr ? "Editar" : "Edit",
		delete: isPtBr ? "Excluir" : "Delete",
		loadMore: isPtBr ? "Carregar mais" : "Load more",
		loadingMore: isPtBr ? "Carregando..." : "Loading...",
		deleteProviderTitle: isPtBr ? "Excluir provedor" : "Delete provider",
		deleteProviderDescription: (providerName: string) =>
			isPtBr
				? `Excluir o provedor "${providerName}"? Esta ação não pode ser desfeita.`
				: `Delete provider "${providerName}"? This action cannot be undone.`,
	};
	const connectorOptions: Array<{ value: ConnectorType; label: string }> = [
		{ value: "manual", label: "Manual" },
		{ value: "api", label: "API" },
		{
			value: "cookie_session",
			label: isPtBr ? "Sessão por Cookie" : "Cookie Session",
		},
		{
			value: "web_automation",
			label: isPtBr ? "Automação Web" : "Web Automation",
		},
		{
			value: "custom_script",
			label: isPtBr ? "Script Customizado" : "Custom Script",
		},
	];

	function connectorLabel(value: ConnectorType) {
		if (value === "manual") return "Manual";
		if (value === "api") return "API";
		if (value === "cookie_session")
			return isPtBr ? "Sessão por Cookie" : "Cookie Session";
		if (value === "web_automation")
			return isPtBr ? "Automação Web" : "Web Automation";
		return isPtBr ? "Script Customizado" : "Custom Script";
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
					headers: { "Content-Type": "application/json" },
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
											<td className="px-3 py-2 font-medium">{provider.name}</td>
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
														aria-label={
															isPtBr
																? `Excluir provedor ${provider.name}`
																: `Delete provider ${provider.name}`
														}
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
