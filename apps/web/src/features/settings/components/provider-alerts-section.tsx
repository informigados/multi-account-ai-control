"use client";

/**
 * ProviderAlertsSection
 *
 * Allows admins to configure per-provider quota alert thresholds,
 * overriding the global threshold configured in QuotaConfigSection.
 *
 * Displayed inside SettingsHub for admins only.
 */
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";

type ProviderSummary = {
	id: string;
	name: string;
	icon?: string | null;
	color?: string | null;
	isActive: boolean;
};

type OverrideMap = Record<string, { threshold: number }>;

type ProviderAlertsSectionProps = {
	locale: AppLocale;
	isPortuguese: boolean;
	globalThreshold: number;
};

export function ProviderAlertsSection({
	locale: _locale,
	isPortuguese,
	globalThreshold,
}: ProviderAlertsSectionProps) {
	const [providers, setProviders] = useState<ProviderSummary[]>([]);
	const [overrides, setOverrides] = useState<OverrideMap>({});
	const [isLoading, setIsLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
	const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(
		null,
	);

	const loadErrRef = useRef(
		isPortuguese
			? "Falha ao carregar alertas por provedor."
			: "Failed to load provider alerts.",
	);

	const ui = {
		title: isPortuguese
			? "Alerta de Cota por Provedor"
			: "Per-Provider Quota Alert",
		desc: isPortuguese
			? "Defina um limiar individual por provedor. Vazio = usa o limiar global."
			: "Set an individual threshold per provider. Empty = uses the global threshold.",
		colProvider: isPortuguese ? "Provedor" : "Provider",
		colThreshold: isPortuguese ? "Limiar (%)" : "Threshold (%)",
		colStatus: isPortuguese ? "Config" : "Config",
		global: isPortuguese ? "Global" : "Global",
		custom: isPortuguese ? "Individual" : "Custom",
		save: isPortuguese ? "Salvar" : "Save",
		reset: isPortuguese ? "Resetar" : "Reset",
		saving: isPortuguese ? "..." : "...",
	};

	useEffect(() => {
		async function load() {
			setIsLoading(true);
			try {
				const [provRes, alertRes] = await Promise.all([
					fetch("/api/providers?limit=100"),
					fetch("/api/settings/provider-alerts"),
				]);
				if (!provRes.ok || !alertRes.ok) throw new Error();
				const provData = (await provRes.json()) as {
					providers: ProviderSummary[];
				};
				const alertData = (await alertRes.json()) as { overrides: OverrideMap };
				setProviders(provData.providers ?? []);
				setOverrides(alertData.overrides ?? {});
				// Seed localEdits from existing overrides
				const seeds: Record<string, string> = {};
				for (const [id, v] of Object.entries(alertData.overrides ?? {})) {
					seeds[id] = String(v.threshold);
				}
				setLocalEdits(seeds);
			} catch {
				// silent — error handled by global feedback
				void loadErrRef.current;
			} finally {
				setIsLoading(false);
			}
		}
		void load();
	}, []);

	async function handleSave(providerId: string) {
		const raw = localEdits[providerId];
		const threshold =
			raw?.trim() === "" ? null : Number.parseInt(raw ?? "", 10);
		setSavingId(providerId);
		setFeedback(null);

		try {
			if (threshold === null || Number.isNaN(threshold)) {
				// Empty → reset (DELETE)
				const res = await fetch(
					`/api/settings/provider-alerts?providerId=${providerId}`,
					{ method: "DELETE" },
				);
				if (!res.ok) throw new Error();
				const data = (await res.json()) as { overrides: OverrideMap };
				setOverrides(data.overrides);
				setLocalEdits((prev) => {
					const n = { ...prev };
					delete n[providerId];
					return n;
				});
			} else {
				const res = await fetch("/api/settings/provider-alerts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ providerId, threshold }),
				});
				if (!res.ok) throw new Error();
				const data = (await res.json()) as { overrides: OverrideMap };
				setOverrides(data.overrides);
			}
			setFeedback({ id: providerId, ok: true });
		} catch {
			setFeedback({ id: providerId, ok: false });
		} finally {
			setSavingId(null);
		}
	}

	async function handleReset(providerId: string) {
		setSavingId(providerId);
		try {
			const res = await fetch(
				`/api/settings/provider-alerts?providerId=${providerId}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error();
			const data = (await res.json()) as { overrides: OverrideMap };
			setOverrides(data.overrides);
			setLocalEdits((prev) => {
				const n = { ...prev };
				delete n[providerId];
				return n;
			});
		} catch {
			/* silent */
		} finally {
			setSavingId(null);
		}
	}

	if (isLoading) {
		return (
			<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<p className="text-sm text-muted-foreground">
					{isPortuguese ? "Carregando..." : "Loading..."}
				</p>
			</article>
		);
	}

	return (
		<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
			<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
				<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning/10 text-warning">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="h-4 w-4"
						aria-hidden="true"
					>
						<title>Alert icon</title>
						<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
				</span>
				{ui.title}
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">{ui.desc}</p>
			<p className="mt-0.5 text-xs text-muted-foreground">
				{isPortuguese
					? `Limiar global atual: ${globalThreshold}%`
					: `Current global threshold: ${globalThreshold}%`}
			</p>

			{providers.length === 0 ? (
				<p className="mt-4 text-sm text-muted-foreground">
					{isPortuguese ? "Nenhum provedor cadastrado." : "No providers found."}
				</p>
			) : (
				<div className="mt-4 overflow-hidden rounded-xl border border-border">
					<table className="min-w-full text-sm">
						<thead className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground">
							<tr>
								<th className="px-4 py-2.5 font-medium">{ui.colProvider}</th>
								<th className="px-4 py-2.5 font-medium">{ui.colThreshold}</th>
								<th className="px-4 py-2.5 font-medium">{ui.colStatus}</th>
								<th className="px-4 py-2.5 font-medium" />
							</tr>
						</thead>
						<tbody>
							{providers.map((p) => {
								const hasOverride = Boolean(overrides[p.id]);
								const isCustom = hasOverride;
								const displayThreshold = hasOverride
									? overrides[p.id]?.threshold
									: globalThreshold;
								const inputVal =
									localEdits[p.id] ??
									(hasOverride ? String(overrides[p.id]?.threshold ?? "") : "");
								const isSaving = savingId === p.id;
								const fb = feedback?.id === p.id ? feedback : null;

								return (
									<tr
										key={p.id}
										className="border-b border-border/60 hover:bg-muted/20"
									>
										<td className="px-4 py-3">
											<span className="font-medium">{p.name}</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<input
													type="number"
													min={1}
													max={100}
													value={inputVal}
													onChange={(e) =>
														setLocalEdits((prev) => ({
															...prev,
															[p.id]: e.target.value,
														}))
													}
													placeholder={String(globalThreshold)}
													disabled={isSaving}
													className="h-8 w-20 rounded-md border border-border bg-card px-2 text-sm tabular-nums outline-none ring-primary transition focus:ring-2 disabled:opacity-60"
												/>
												<span className="text-xs text-muted-foreground">%</span>
											</div>
										</td>
										<td className="px-4 py-3">
											<span
												className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isCustom ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
											>
												{isCustom
													? `${ui.custom} (${displayThreshold}%)`
													: `${ui.global} (${displayThreshold}%)`}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-end gap-1.5">
												<button
													type="button"
													onClick={() => void handleSave(p.id)}
													disabled={isSaving}
													className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
												>
													{isSaving ? ui.saving : ui.save}
												</button>
												{isCustom && (
													<button
														type="button"
														onClick={() => void handleReset(p.id)}
														disabled={isSaving}
														className="h-7 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
													>
														{ui.reset}
													</button>
												)}
												{fb && (
													<span
														className={`text-xs ${fb.ok ? "text-success" : "text-danger"}`}
													>
														{fb.ok ? "✓" : "✗"}
													</span>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</article>
	);
}
