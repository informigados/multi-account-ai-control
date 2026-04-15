"use client";

import { Button } from "@/components/ui/button";
import type { UsageSnapshotView } from "@/features/usage/usage-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useId, useMemo, useState } from "react";

type QuickUsageUpdateProps = {
	accountId: string;
	onSaved?: (snapshot: UsageSnapshotView) => void;
	buttonLabel?: string;
	locale?: AppLocale;
};

type FeedbackState = {
	tone: "success" | "error";
	message: string;
};

function toInputDateTime(isoValue: string | null) {
	if (!isoValue) return "";
	const date = new Date(isoValue);
	if (Number.isNaN(date.getTime())) return "";
	const pad = (n: number) => n.toString().padStart(2, "0");
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

export function QuickUsageUpdate({
	accountId,
	onSaved,
	buttonLabel,
	locale = "pt_BR",
}: QuickUsageUpdateProps) {
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });
	const ui = {
		defaultButton: text(
			"Atualizar uso",
			"Update usage",
			"Actualizar uso",
			"更新用量",
		),
		provideMetric: text(
			"Informe pelo menos uma métrica.",
			"Provide at least one metric.",
			"Informa al menos una métrica.",
			"请至少提供一项指标。",
		),
		failedUpdate: text(
			"Falha ao atualizar uso.",
			"Failed to update usage.",
			"Error al actualizar uso.",
			"更新用量失败。",
		),
		usageUpdated: text(
			"Uso atualizado.",
			"Usage updated.",
			"Uso actualizado.",
			"用量已更新。",
		),
		totalQuota: text("Cota total", "Total quota", "Cuota total", "总配额"),
		usedQuota: text("Cota usada", "Used quota", "Cuota usada", "已用配额"),
		resetDateTime: text(
			"Data e hora de reset",
			"Reset date and time",
			"Fecha y hora de reinicio",
			"重置日期和时间",
		),
		comments: text(
			"Comentários de uso",
			"Usage comments",
			"Comentarios de uso",
			"用量备注",
		),
		saveUsage: text("Salvar uso", "Save usage", "Guardar uso", "保存用量"),
		saving: text("Salvando...", "Saving...", "Guardando...", "保存中..."),
		quotaHint: text(
			"Você pode informar apenas os campos disponíveis; o restante permanece inalterado.",
			"You may submit only available fields; the rest remains unchanged.",
			"Puedes enviar solo los campos disponibles; el resto permanece sin cambios.",
			"你可以只提交可用字段，其余字段保持不变。",
		),
		resetHint: text(
			"Preencha a data de reset quando souber a próxima janela real da conta.",
			"Fill reset date when you know the account's next real reset window.",
			"Rellena la fecha de reinicio cuando conozcas la próxima ventana real de la cuenta.",
			"当你知道账号下一次真实重置窗口时再填写重置日期。",
		),
	};
	const idBase = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<FeedbackState | null>(null);
	const [totalQuota, setTotalQuota] = useState("");
	const [usedQuota, setUsedQuota] = useState("");
	const [resetAt, setResetAt] = useState("");
	const [comments, setComments] = useState("");

	const canSubmit = useMemo(() => {
		const total = totalQuota.trim();
		const used = usedQuota.trim();
		return total.length > 0 || used.length > 0 || comments.trim().length > 0;
	}, [comments, totalQuota, usedQuota]);

	async function submitUsage(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!canSubmit) {
			setFeedback({
				tone: "error",
				message: ui.provideMetric,
			});
			return;
		}

		setIsSaving(true);
		setFeedback(null);

		try {
			const response = await fetch(`/api/accounts/${accountId}/usage`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sourceType: "manual",
					totalQuota: totalQuota ? Number(totalQuota) : undefined,
					usedQuota: usedQuota ? Number(usedQuota) : undefined,
					resetAt: resetAt || undefined,
					comments: comments || undefined,
				}),
			});

			const payload = (await response.json()) as {
				snapshot?: UsageSnapshotView;
				message?: string;
			};

			if (!response.ok || !payload.snapshot) {
				throw new Error(payload.message ?? ui.failedUpdate);
			}

			setFeedback({
				tone: "success",
				message: ui.usageUpdated,
			});
			setTotalQuota(payload.snapshot.totalQuota?.toString() ?? "");
			setUsedQuota(payload.snapshot.usedQuota?.toString() ?? "");
			setResetAt(toInputDateTime(payload.snapshot.resetAt));
			setComments(payload.snapshot.comments ?? "");
			onSaved?.(payload.snapshot);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : ui.failedUpdate,
			});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="space-y-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setIsOpen((current) => !current)}
			>
				{buttonLabel ?? ui.defaultButton}
			</Button>

			{isOpen ? (
				<form
					onSubmit={submitUsage}
					className="max-w-sm space-y-2 rounded-md border border-border bg-muted/40 p-3"
				>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label htmlFor={`${idBase}-total-quota`} className="sr-only">
							{ui.totalQuota}
						</label>
						<input
							id={`${idBase}-total-quota`}
							type="number"
							min={0}
							step="0.01"
							value={totalQuota}
							onChange={(event) => setTotalQuota(event.target.value)}
							placeholder={ui.totalQuota}
							className="h-9 rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2"
						/>
						<label htmlFor={`${idBase}-used-quota`} className="sr-only">
							{ui.usedQuota}
						</label>
						<input
							id={`${idBase}-used-quota`}
							type="number"
							min={0}
							step="0.01"
							value={usedQuota}
							onChange={(event) => setUsedQuota(event.target.value)}
							placeholder={ui.usedQuota}
							className="h-9 rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2"
						/>
					</div>
					<p className="text-xs text-muted-foreground">{ui.quotaHint}</p>
					<label htmlFor={`${idBase}-reset-at`} className="sr-only">
						{ui.resetDateTime}
					</label>
					<input
						id={`${idBase}-reset-at`}
						type="datetime-local"
						value={resetAt}
						onChange={(event) => setResetAt(event.target.value)}
						className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2"
					/>
					<p className="text-xs text-muted-foreground">{ui.resetHint}</p>
					<label htmlFor={`${idBase}-comments`} className="sr-only">
						{ui.comments}
					</label>
					<input
						id={`${idBase}-comments`}
						value={comments}
						onChange={(event) => setComments(event.target.value)}
						placeholder={ui.comments}
						className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2"
					/>
					<Button
						type="submit"
						size="sm"
						disabled={isSaving}
						className="w-full"
					>
						{isSaving ? ui.saving : ui.saveUsage}
					</Button>
					{feedback ? (
						<p
							role={feedback.tone === "error" ? "alert" : "status"}
							aria-live="polite"
							className={`rounded border px-2 py-1 text-xs ${
								feedback.tone === "error"
									? "border-danger/30 bg-danger/10 text-danger"
									: "border-success/30 bg-success/10 text-success"
							}`}
						>
							{feedback.message}
						</p>
					) : null}
				</form>
			) : null}
		</div>
	);
}
