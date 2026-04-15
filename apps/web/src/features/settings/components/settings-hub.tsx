"use client";

import { Button } from "@/components/ui/button";
import { TotpManager } from "@/features/auth/components/totp-manager";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import {
	BellRing,
	Globe2,
	LockKeyhole,
	Mail,
	ShieldCheck,
	UserCog,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "admin" | "operator";
type Locale = AppLocale;
type AuditRetentionDays = 30 | 60 | 90 | 180 | 360;

type AuthUser = {
	id: string;
	username: string;
	email: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
	isSystemAdmin: boolean;
};

type ManagedUser = {
	id: string;
	username: string;
	email: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
	isSystemAdmin: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt: string | null;
};

type UserDraft = {
	username: string;
	email: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
};

type CreateUserState = {
	username: string;
	email: string;
	password: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
};

type SettingsHubProps = {
	currentUser: AuthUser;
	locale: AppLocale;
};

type AuditRetentionConfig = {
	enabled: boolean;
	days: AuditRetentionDays | null;
};

type IdleLockConfig = {
	enabled: boolean;
	timeoutMinutes: number;
	requirePasswordOnUnlock: boolean;
};

const initialCreateUserState: CreateUserState = {
	username: "",
	email: "",
	password: "",
	role: "operator",
	locale: "pt_BR",
	isActive: true,
};

const auditRetentionDaysOptions: AuditRetentionDays[] = [30, 60, 90, 180, 360];
const idleLockTimeoutMinMinutes = 1;
const idleLockTimeoutMaxMinutes = 240;
const defaultIdleLockConfig: IdleLockConfig = {
	enabled: false,
	timeoutMinutes: 10,
	requirePasswordOnUnlock: true,
};

function normalizeAuditRetentionDays(value: unknown): AuditRetentionDays {
	if (
		typeof value === "number" &&
		auditRetentionDaysOptions.includes(value as AuditRetentionDays)
	) {
		return value as AuditRetentionDays;
	}

	return auditRetentionDaysOptions[0];
}

function normalizeIdleLockTimeout(value: unknown) {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return defaultIdleLockConfig.timeoutMinutes;
	}

	return Math.min(
		idleLockTimeoutMaxMinutes,
		Math.max(idleLockTimeoutMinMinutes, Math.trunc(value)),
	);
}

function toUserDraft(user: ManagedUser): UserDraft {
	return {
		username: user.username,
		email: user.email,
		role: user.role,
		locale: user.locale,
		isActive: user.isActive,
	};
}

export function SettingsHub({ currentUser, locale }: SettingsHubProps) {
	const t = getDictionary(locale);
	const isPortuguese = locale === "pt_BR" || locale === "pt_PT";
	const isAdmin = currentUser.role === "admin";
	const ui = {
		profilePasswordHint: isPortuguese
			? "Use no mínimo 12 caracteres para manter o padrão de segurança."
			: "Use at least 12 characters to keep the security standard.",
		createPasswordHint: isPortuguese
			? "Senha inicial obrigatória (mínimo de 12 caracteres)."
			: "Initial password is required (minimum 12 characters).",
		roleHint: isPortuguese
			? "operator = operação diária, admin = gestão completa de usuários e configurações."
			: "operator = daily operations, admin = full user and settings management.",
		protectedAdminHint: isPortuguese
			? "Usuário admin protegido: username imutável e exclusão bloqueada por segurança."
			: "Protected admin user: immutable username and blocked deletion for security.",
		roleOperatorLabel: isPortuguese ? "Operador" : "Operator",
		roleAdminLabel: isPortuguese ? "Administrador" : "Administrator",
		loadingUsers: isPortuguese ? "Carregando usuários..." : "Loading users...",
		emptyUsers: isPortuguese
			? "Nenhum usuário cadastrado."
			: "No users registered.",
		failedUpdateProfile: isPortuguese
			? "Falha ao atualizar perfil."
			: "Failed to update profile.",
		failedCreateUser: isPortuguese
			? "Falha ao criar usuário."
			: "Failed to create user.",
		failedUpdateUser: isPortuguese
			? "Falha ao atualizar usuário."
			: "Failed to update user.",
		failedDeleteUser: isPortuguese
			? "Falha ao excluir usuário."
			: "Failed to delete user.",
		failedLoadAuditRetention: isPortuguese
			? "Falha ao carregar política de retenção."
			: "Failed to load retention policy.",
		failedUpdateAuditRetention: isPortuguese
			? "Falha ao atualizar política de retenção."
			: "Failed to update retention policy.",
		failedLoadIdleLock: isPortuguese
			? "Falha ao carregar proteção de inatividade."
			: "Failed to load idle lock configuration.",
		failedUpdateIdleLock: isPortuguese
			? "Falha ao atualizar proteção de inatividade."
			: "Failed to update idle lock configuration.",
	};

	const [profileEmail, setProfileEmail] = useState(currentUser.email);
	const [profilePassword, setProfilePassword] = useState("");
	const [profileLocale, setProfileLocale] = useState<Locale>(
		currentUser.locale,
	);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
	const [profileError, setProfileError] = useState<string | null>(null);

	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
	const [isLoadingUsers, setIsLoadingUsers] = useState(false);
	const [usersFeedback, setUsersFeedback] = useState<string | null>(null);
	const [usersError, setUsersError] = useState<string | null>(null);
	const [createUserState, setCreateUserState] = useState<CreateUserState>(
		initialCreateUserState,
	);
	const [isCreatingUser, setIsCreatingUser] = useState(false);
	const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
	const [deletingRows, setDeletingRows] = useState<Record<string, boolean>>({});
	const [auditRetention, setAuditRetention] = useState<AuditRetentionConfig>({
		enabled: false,
		days: null,
	});
	const [auditRetentionOptions, setAuditRetentionOptions] = useState<
		AuditRetentionDays[]
	>(auditRetentionDaysOptions);
	const [isLoadingAuditRetention, setIsLoadingAuditRetention] = useState(false);
	const [isSavingAuditRetention, setIsSavingAuditRetention] = useState(false);
	const [auditRetentionFeedback, setAuditRetentionFeedback] = useState<
		string | null
	>(null);
	const [auditRetentionError, setAuditRetentionError] = useState<string | null>(
		null,
	);
	const [idleLock, setIdleLock] = useState<IdleLockConfig>(
		defaultIdleLockConfig,
	);
	const [isLoadingIdleLock, setIsLoadingIdleLock] = useState(false);
	const [isSavingIdleLock, setIsSavingIdleLock] = useState(false);
	const [idleLockFeedback, setIdleLockFeedback] = useState<string | null>(null);
	const [idleLockError, setIdleLockError] = useState<string | null>(null);

	const localeOptions = useMemo(
		() => [
			{ value: "pt_BR" as const, label: "Português (Brasil)" },
			{ value: "pt_PT" as const, label: "Português (Portugal)" },
			{ value: "en" as const, label: "English" },
			{ value: "es" as const, label: "Español" },
			{ value: "zh_CN" as const, label: "Chinese (Simplified)" },
		],
		[],
	);

	const loadUsers = useCallback(async () => {
		if (!isAdmin) {
			return;
		}

		setIsLoadingUsers(true);
		setUsersError(null);
		setUsersFeedback(null);

		try {
			const response = await fetch("/api/users?limit=200", { method: "GET" });
			if (response.status === 403) {
				setUsersError(t.settings.forbidden);
				return;
			}
			if (!response.ok) {
				throw new Error(t.settings.loadError);
			}

			const payload = (await response.json()) as { users: ManagedUser[] };
			setUsers(payload.users);
			setDrafts(
				Object.fromEntries(
					payload.users.map((user) => [user.id, toUserDraft(user)]),
				),
			);
		} catch {
			setUsersError(t.settings.loadError);
		} finally {
			setIsLoadingUsers(false);
		}
	}, [isAdmin, t.settings.forbidden, t.settings.loadError]);

	const loadAuditRetention = useCallback(async () => {
		if (!isAdmin) {
			return;
		}

		setIsLoadingAuditRetention(true);
		setAuditRetentionError(null);
		setAuditRetentionFeedback(null);

		try {
			const response = await fetch("/api/settings/audit-retention", {
				method: "GET",
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(
					payload.message ??
						t.settings.auditRetentionLoadError ??
						ui.failedLoadAuditRetention,
				);
			}

			const payload = (await response.json()) as {
				config?: { enabled?: boolean; days?: number | null };
				options?: number[];
			};

			const nextOptions = Array.isArray(payload.options)
				? payload.options
						.map((value) => normalizeAuditRetentionDays(value))
						.filter(
							(value, index, array) =>
								array.findIndex((item) => item === value) === index,
						)
				: auditRetentionDaysOptions;
			const normalizedOptions =
				nextOptions.length > 0 ? nextOptions : auditRetentionDaysOptions;
			setAuditRetentionOptions(normalizedOptions);

			const normalizedDays = normalizeAuditRetentionDays(payload.config?.days);
			const enabled = Boolean(payload.config?.enabled);
			setAuditRetention({
				enabled,
				days: enabled ? normalizedDays : null,
			});
		} catch (error) {
			setAuditRetentionError(
				error instanceof Error
					? error.message
					: (t.settings.auditRetentionLoadError ?? ui.failedLoadAuditRetention),
			);
		} finally {
			setIsLoadingAuditRetention(false);
		}
	}, [
		isAdmin,
		t.settings.auditRetentionLoadError,
		ui.failedLoadAuditRetention,
	]);

	const loadIdleLock = useCallback(async () => {
		if (!isAdmin) {
			return;
		}

		setIsLoadingIdleLock(true);
		setIdleLockError(null);
		setIdleLockFeedback(null);

		try {
			const response = await fetch("/api/settings/idle-lock", {
				method: "GET",
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(
					payload.message ??
						t.settings.idleLockLoadError ??
						ui.failedLoadIdleLock,
				);
			}

			const payload = (await response.json()) as {
				config?: {
					enabled?: boolean;
					timeoutMinutes?: number;
					requirePasswordOnUnlock?: boolean;
				};
			};

			setIdleLock({
				enabled: Boolean(payload.config?.enabled),
				timeoutMinutes: normalizeIdleLockTimeout(
					payload.config?.timeoutMinutes,
				),
				requirePasswordOnUnlock:
					typeof payload.config?.requirePasswordOnUnlock === "boolean"
						? payload.config.requirePasswordOnUnlock
						: true,
			});
		} catch (error) {
			setIdleLockError(
				error instanceof Error
					? error.message
					: (t.settings.idleLockLoadError ?? ui.failedLoadIdleLock),
			);
		} finally {
			setIsLoadingIdleLock(false);
		}
	}, [isAdmin, t.settings.idleLockLoadError, ui.failedLoadIdleLock]);

	useEffect(() => {
		void loadUsers();
	}, [loadUsers]);

	useEffect(() => {
		void loadAuditRetention();
	}, [loadAuditRetention]);

	useEffect(() => {
		void loadIdleLock();
	}, [loadIdleLock]);

	async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSavingProfile(true);
		setProfileFeedback(null);
		setProfileError(null);

		const body: { email?: string; password?: string; locale?: Locale } = {};
		if (profileEmail !== currentUser.email) body.email = profileEmail;
		if (profilePassword.length > 0) body.password = profilePassword;
		if (profileLocale !== currentUser.locale) {
			body.locale = profileLocale;
		}

		if (Object.keys(body).length === 0) {
			setIsSavingProfile(false);
			setProfileFeedback(t.settings.profileSaved);
			return;
		}

		try {
			const response = await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.failedUpdateProfile);
			}

			setProfilePassword("");
			setProfileFeedback(t.settings.profileSaved);
		} catch (error) {
			setProfileError(
				error instanceof Error ? error.message : ui.failedUpdateProfile,
			);
		} finally {
			setIsSavingProfile(false);
		}
	}

	async function createUser(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsCreatingUser(true);
		setUsersFeedback(null);
		setUsersError(null);

		try {
			const response = await fetch("/api/users", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(createUserState),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.failedCreateUser);
			}

			setCreateUserState(initialCreateUserState);
			setUsersFeedback(t.settings.createSuccess);
			await loadUsers();
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : ui.failedCreateUser,
			);
		} finally {
			setIsCreatingUser(false);
		}
	}

	async function saveManagedUser(userId: string) {
		const original = users.find((user) => user.id === userId);
		const draft = drafts[userId];
		if (!original || !draft) return;

		const payload: {
			username?: string;
			email?: string;
			role?: Role;
			locale?: Locale;
			isActive?: boolean;
		} = {};
		if (draft.username !== original.username) payload.username = draft.username;
		if (draft.email !== original.email) payload.email = draft.email;
		if (draft.role !== original.role) payload.role = draft.role;
		if (draft.locale !== original.locale) payload.locale = draft.locale;
		if (draft.isActive !== original.isActive) payload.isActive = draft.isActive;

		if (Object.keys(payload).length === 0) {
			return;
		}

		setSavingRows((previous) => ({ ...previous, [userId]: true }));
		setUsersFeedback(null);
		setUsersError(null);

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorPayload = (await response.json()) as { message?: string };
				throw new Error(errorPayload.message ?? ui.failedUpdateUser);
			}

			const updated = (await response.json()) as { user: ManagedUser };
			setUsers((previous) =>
				previous.map((user) =>
					user.id === updated.user.id ? updated.user : user,
				),
			);
			setDrafts((previous) => ({
				...previous,
				[updated.user.id]: toUserDraft(updated.user),
			}));
			setUsersFeedback(t.settings.updateSuccess);
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : ui.failedUpdateUser,
			);
		} finally {
			setSavingRows((previous) => ({ ...previous, [userId]: false }));
		}
	}

	async function deleteManagedUser(userId: string) {
		if (userId === currentUser.id) {
			setUsersError(t.settings.cannotDeleteSelf);
			return;
		}

		setDeletingRows((previous) => ({ ...previous, [userId]: true }));
		setUsersFeedback(null);
		setUsersError(null);

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.failedDeleteUser);
			}

			setUsers((previous) => previous.filter((user) => user.id !== userId));
			setDrafts((previous) => {
				const nextDrafts = { ...previous };
				delete nextDrafts[userId];
				return nextDrafts;
			});
			setUsersFeedback(t.settings.deleteSuccess);
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : ui.failedDeleteUser,
			);
		} finally {
			setDeletingRows((previous) => ({ ...previous, [userId]: false }));
		}
	}

	async function saveAuditRetention(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isAdmin) {
			return;
		}

		setIsSavingAuditRetention(true);
		setAuditRetentionError(null);
		setAuditRetentionFeedback(null);

		const retentionDaysDefault = auditRetentionOptions[0] ?? 30;
		const body = {
			enabled: auditRetention.enabled,
			days: auditRetention.enabled
				? (auditRetention.days ?? retentionDaysDefault)
				: null,
		};

		try {
			const response = await fetch("/api/settings/audit-retention", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(
					payload.message ??
						t.settings.auditRetentionUpdateError ??
						ui.failedUpdateAuditRetention,
				);
			}

			const payload = (await response.json()) as {
				config?: { enabled?: boolean; days?: number | null };
			};

			const normalizedDays = normalizeAuditRetentionDays(payload.config?.days);
			const enabled = Boolean(payload.config?.enabled);
			setAuditRetention({
				enabled,
				days: enabled ? normalizedDays : null,
			});
			setAuditRetentionFeedback(t.settings.auditRetentionSaved);
		} catch (error) {
			setAuditRetentionError(
				error instanceof Error
					? error.message
					: (t.settings.auditRetentionUpdateError ??
							ui.failedUpdateAuditRetention),
			);
		} finally {
			setIsSavingAuditRetention(false);
		}
	}

	async function saveIdleLock(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isAdmin) {
			return;
		}

		setIsSavingIdleLock(true);
		setIdleLockError(null);
		setIdleLockFeedback(null);

		const body = {
			enabled: idleLock.enabled,
			timeoutMinutes: normalizeIdleLockTimeout(idleLock.timeoutMinutes),
			requirePasswordOnUnlock: idleLock.requirePasswordOnUnlock,
		};

		try {
			const response = await fetch("/api/settings/idle-lock", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(
					payload.message ??
						t.settings.idleLockUpdateError ??
						ui.failedUpdateIdleLock,
				);
			}

			const payload = (await response.json()) as {
				config?: {
					enabled?: boolean;
					timeoutMinutes?: number;
					requirePasswordOnUnlock?: boolean;
				};
			};

			setIdleLock({
				enabled: Boolean(payload.config?.enabled),
				timeoutMinutes: normalizeIdleLockTimeout(
					payload.config?.timeoutMinutes,
				),
				requirePasswordOnUnlock:
					typeof payload.config?.requirePasswordOnUnlock === "boolean"
						? payload.config.requirePasswordOnUnlock
						: true,
			});
			setIdleLockFeedback(t.settings.idleLockSaved);
		} catch (error) {
			setIdleLockError(
				error instanceof Error
					? error.message
					: (t.settings.idleLockUpdateError ?? ui.failedUpdateIdleLock),
			);
		} finally {
			setIsSavingIdleLock(false);
		}
	}

	return (
		<section className="grid min-w-0 gap-5">
			<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
					<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
						<UserCog className="h-4 w-4" />
					</span>
					{t.settings.profileCardTitle}
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{t.settings.profileCardDescription}
				</p>

				<form className="mt-4 space-y-3" onSubmit={saveProfile}>
					<div className="space-y-1.5">
						<label
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
							htmlFor="profile-email"
						>
							<Mail className="h-3.5 w-3.5" />
							{t.settings.emailLabel}
						</label>
						<input
							id="profile-email"
							value={profileEmail}
							onChange={(event) => setProfileEmail(event.target.value)}
							type="email"
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						/>
					</div>
					<div className="space-y-1.5">
						<label
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
							htmlFor="profile-password"
						>
							<LockKeyhole className="h-3.5 w-3.5" />
							{t.settings.passwordLabel}
						</label>
						<input
							id="profile-password"
							value={profilePassword}
							onChange={(event) => setProfilePassword(event.target.value)}
							type="password"
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							placeholder={t.settings.passwordPlaceholder}
						/>
						<p className="text-xs text-muted-foreground">
							{ui.profilePasswordHint}
						</p>
					</div>
					<div className="space-y-1.5">
						<label
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
							htmlFor="profile-locale"
						>
							<Globe2 className="h-3.5 w-3.5" />
							{t.settings.languageLabel}
						</label>
						<select
							id="profile-locale"
							value={profileLocale}
							onChange={(event) =>
								setProfileLocale(event.target.value as Locale)
							}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						>
							{localeOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<Button type="submit" disabled={isSavingProfile}>
						{isSavingProfile ? t.settings.saving : t.settings.saveProfile}
					</Button>
				</form>

				{profileFeedback ? (
					<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
						{profileFeedback}
					</p>
				) : null}
				{profileError ? (
					<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
						{profileError}
					</p>
				) : null}
			</article>

			{isAdmin ? (
				<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
						<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
							<BellRing className="h-4 w-4" />
						</span>
						{t.settings.idleLockCardTitle}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{t.settings.idleLockCardDescription}
					</p>

					<form className="mt-4 space-y-3" onSubmit={saveIdleLock}>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="idle-lock-mode"
							>
								{t.settings.idleLockModeLabel}
							</label>
							<select
								id="idle-lock-mode"
								value={idleLock.enabled ? "enabled" : "disabled"}
								onChange={(event) =>
									setIdleLock((previous) => ({
										...previous,
										enabled: event.target.value === "enabled",
									}))
								}
								disabled={isLoadingIdleLock || isSavingIdleLock}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							>
								<option value="disabled">
									{t.settings.idleLockModeDisabled}
								</option>
								<option value="enabled">
									{t.settings.idleLockModeEnabled}
								</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="idle-lock-timeout-minutes"
							>
								{t.settings.idleLockTimeoutLabel}
							</label>
							<input
								id="idle-lock-timeout-minutes"
								type="number"
								min={idleLockTimeoutMinMinutes}
								max={idleLockTimeoutMaxMinutes}
								step={1}
								value={idleLock.timeoutMinutes}
								onChange={(event) =>
									setIdleLock((previous) => ({
										...previous,
										timeoutMinutes: normalizeIdleLockTimeout(
											Number(event.target.value),
										),
									}))
								}
								disabled={
									!idleLock.enabled || isLoadingIdleLock || isSavingIdleLock
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							/>
							<p className="text-xs text-muted-foreground">
								{t.settings.idleLockTimeoutHint
									.replace("{min}", String(idleLockTimeoutMinMinutes))
									.replace("{max}", String(idleLockTimeoutMaxMinutes))}
							</p>
						</div>

						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="idle-lock-require-password"
							>
								{t.settings.idleLockUnlockLabel}
							</label>
							<select
								id="idle-lock-require-password"
								value={
									idleLock.requirePasswordOnUnlock ? "password" : "continue"
								}
								onChange={(event) =>
									setIdleLock((previous) => ({
										...previous,
										requirePasswordOnUnlock: event.target.value === "password",
									}))
								}
								disabled={
									!idleLock.enabled || isLoadingIdleLock || isSavingIdleLock
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							>
								<option value="password">
									{t.settings.idleLockUnlockPassword}
								</option>
								<option value="continue">
									{t.settings.idleLockUnlockContinue}
								</option>
							</select>
						</div>

						<Button
							type="submit"
							disabled={isLoadingIdleLock || isSavingIdleLock}
						>
							{isSavingIdleLock ? t.settings.saving : t.settings.idleLockSave}
						</Button>
					</form>

					{idleLockFeedback ? (
						<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
							{idleLockFeedback}
						</p>
					) : null}
					{idleLockError ? (
						<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
							{idleLockError}
						</p>
					) : null}
				</article>
			) : null}

			{isAdmin ? (
				<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
						<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
							<ShieldCheck className="h-4 w-4" />
						</span>
						{t.settings.auditRetentionCardTitle}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{t.settings.auditRetentionCardDescription}
					</p>

					<form className="mt-4 space-y-3" onSubmit={saveAuditRetention}>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="audit-retention-mode"
							>
								{t.settings.auditRetentionModeLabel}
							</label>
							<select
								id="audit-retention-mode"
								value={auditRetention.enabled ? "enabled" : "disabled"}
								onChange={(event) =>
									setAuditRetention((previous) => ({
										...previous,
										enabled: event.target.value === "enabled",
										days:
											event.target.value === "enabled"
												? (previous.days ??
													auditRetentionOptions[0] ??
													auditRetentionDaysOptions[0])
												: null,
									}))
								}
								disabled={isLoadingAuditRetention || isSavingAuditRetention}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							>
								<option value="disabled">
									{t.settings.auditRetentionModeDisabled}
								</option>
								<option value="enabled">
									{t.settings.auditRetentionModeEnabled}
								</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="audit-retention-days"
							>
								{t.settings.auditRetentionDaysLabel}
							</label>
							<select
								id="audit-retention-days"
								value={String(
									auditRetention.days ??
										auditRetentionOptions[0] ??
										auditRetentionDaysOptions[0],
								)}
								onChange={(event) =>
									setAuditRetention((previous) => ({
										...previous,
										days: normalizeAuditRetentionDays(
											Number(event.target.value),
										),
									}))
								}
								disabled={
									!auditRetention.enabled ||
									isLoadingAuditRetention ||
									isSavingAuditRetention
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{auditRetentionOptions.map((days) => (
									<option key={days} value={days}>
										{isPortuguese ? `${days} dias` : `${days} days`}
									</option>
								))}
							</select>
							<p className="text-xs text-muted-foreground">
								{t.settings.auditRetentionHint}
							</p>
						</div>

						<Button
							type="submit"
							disabled={isLoadingAuditRetention || isSavingAuditRetention}
						>
							{isSavingAuditRetention
								? t.settings.saving
								: t.settings.auditRetentionSave}
						</Button>
					</form>

					{auditRetentionFeedback ? (
						<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
							{auditRetentionFeedback}
						</p>
					) : null}
					{auditRetentionError ? (
						<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
							{auditRetentionError}
						</p>
					) : null}
				</article>
			) : null}

			{isAdmin ? (
				<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
						<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
							<Users className="h-4 w-4" />
						</span>
						{t.settings.usersCardTitle}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{t.settings.usersCardDescription}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						{ui.protectedAdminHint}
					</p>

					<form
						className="mt-4 grid gap-3 md:grid-cols-2"
						onSubmit={createUser}
					>
						<h3 className="md:col-span-2 text-base font-medium">
							{t.settings.createUserTitle}
						</h3>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-username"
							>
								{t.settings.usernameLabel}
							</label>
							<input
								id="create-username"
								value={createUserState.username}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										username: event.target.value,
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-email"
							>
								{t.settings.emailLabel}
							</label>
							<input
								id="create-email"
								value={createUserState.email}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										email: event.target.value,
									}))
								}
								type="email"
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-password"
							>
								{t.settings.passwordLabel}
							</label>
							<input
								id="create-password"
								value={createUserState.password}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										password: event.target.value,
									}))
								}
								type="password"
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
							<p className="text-xs text-muted-foreground">
								{ui.createPasswordHint}
							</p>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-role"
							>
								{t.settings.userRoleLabel}
							</label>
							<select
								id="create-role"
								value={createUserState.role}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										role: event.target.value as Role,
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								<option value="operator">{ui.roleOperatorLabel}</option>
								<option value="admin">{ui.roleAdminLabel}</option>
							</select>
							<p className="text-xs text-muted-foreground">{ui.roleHint}</p>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-locale"
							>
								{t.settings.languageLabel}
							</label>
							<select
								id="create-locale"
								value={createUserState.locale}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										locale: event.target.value as Locale,
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								{localeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-status"
							>
								{t.settings.userStatusLabel}
							</label>
							<select
								id="create-status"
								value={createUserState.isActive ? "active" : "inactive"}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										isActive: event.target.value === "active",
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								<option value="active">{t.settings.activeStatus}</option>
								<option value="inactive">{t.settings.inactiveStatus}</option>
							</select>
						</div>
						<div className="md:col-span-2">
							<Button type="submit" disabled={isCreatingUser}>
								{isCreatingUser ? t.settings.saving : t.settings.createUser}
							</Button>
						</div>
					</form>

					<div className="mt-6 w-full max-w-full overflow-x-auto rounded-lg border border-border">
						<table className="w-full min-w-[64rem] text-sm">
							<thead className="bg-muted/70 text-left text-muted-foreground">
								<tr>
									<th className="px-3 py-2">{t.settings.usernameLabel}</th>
									<th className="px-3 py-2">{t.settings.usersTableEmail}</th>
									<th className="px-3 py-2">{t.settings.usersTableRole}</th>
									<th className="px-3 py-2">{t.settings.usersTableLocale}</th>
									<th className="px-3 py-2">{t.settings.usersTableStatus}</th>
									<th className="px-3 py-2">
										{t.settings.usersTableProtected}
									</th>
									<th className="px-3 py-2 text-right">
										{t.settings.usersTableActions}
									</th>
								</tr>
							</thead>
							<tbody>
								{isLoadingUsers ? (
									<tr>
										<td className="px-3 py-4 text-muted-foreground" colSpan={7}>
											{ui.loadingUsers}
										</td>
									</tr>
								) : users.length === 0 ? (
									<tr>
										<td className="px-3 py-4 text-muted-foreground" colSpan={7}>
											{ui.emptyUsers}
										</td>
									</tr>
								) : (
									users.map((user) => {
										const draft = drafts[user.id] ?? toUserDraft(user);
										const isSaving = savingRows[user.id] ?? false;
										const isDeleting = deletingRows[user.id] ?? false;
										const disableProtectedFields = user.isSystemAdmin;
										const disableProtectedLocale = false;

										return (
											<tr key={user.id} className="border-t border-border/80">
												<td className="px-3 py-2">
													<input
														value={draft.username}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	username: event.target.value,
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 w-40 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													/>
												</td>
												<td className="px-3 py-2">
													<input
														value={draft.email}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	email: event.target.value,
																},
															}))
														}
														type="email"
														className="h-9 w-56 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2"
													/>
												</td>
												<td className="px-3 py-2">
													<select
														value={draft.role}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	role: event.target.value as Role,
																},
															}))
														}
														disabled={disableProtectedLocale}
														className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													>
														<option value="operator">
															{ui.roleOperatorLabel}
														</option>
														<option value="admin">{ui.roleAdminLabel}</option>
													</select>
												</td>
												<td className="px-3 py-2">
													<select
														value={draft.locale}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	locale: event.target.value as Locale,
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													>
														{localeOptions.map((option) => (
															<option key={option.value} value={option.value}>
																{option.label}
															</option>
														))}
													</select>
												</td>
												<td className="px-3 py-2">
													<select
														value={draft.isActive ? "active" : "inactive"}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	isActive: event.target.value === "active",
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													>
														<option value="active">
															{t.settings.activeStatus}
														</option>
														<option value="inactive">
															{t.settings.inactiveStatus}
														</option>
													</select>
												</td>
												<td className="px-3 py-2">
													{user.isSystemAdmin
														? t.settings.protectedYes
														: t.settings.protectedNo}
												</td>
												<td className="px-3 py-2 text-right">
													<div className="inline-flex gap-2">
														<Button
															size="sm"
															variant="outline"
															disabled={isSaving}
															onClick={() => {
																void saveManagedUser(user.id);
															}}
														>
															{isSaving
																? t.settings.saving
																: t.settings.actionSave}
														</Button>
														{!user.isSystemAdmin ? (
															<Button
																size="sm"
																variant="ghost"
																disabled={isDeleting}
																onClick={() => {
																	void deleteManagedUser(user.id);
																}}
															>
																{isDeleting
																	? t.settings.actionDeleting
																	: t.settings.actionDelete}
															</Button>
														) : null}
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{usersFeedback ? (
						<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
							{usersFeedback}
						</p>
					) : null}
					{usersError ? (
						<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
							{usersError}
						</p>
					) : null}
				</article>
			) : null}

			{/* ── Quota Monitoring settings (admin only) ──────────────────── */}
			{isAdmin ? (
				<QuotaConfigSection locale={locale} isPortuguese={isPortuguese} />
			) : null}

			{/* ── 2FA / TOTP Manager (all users) ──────────────────────────── */}
			<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<TotpManager locale={locale} />
			</article>
		</section>
	);
}

/* ─── Quota Config Section ─────────────────────────────────────────────────── */
type QuotaConfigSectionProps = {
	locale: AppLocale;
	isPortuguese: boolean;
};

function QuotaConfigSection({ isPortuguese }: QuotaConfigSectionProps) {
	const REFRESH_OPTIONS = [5, 10, 15, 30, 60] as const;
	type RefreshInterval = (typeof REFRESH_OPTIONS)[number];

	const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(10);
	const [alertThreshold, setAlertThreshold] = useState(80);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const ui = {
		title: isPortuguese ? "Monitoramento de Cotas" : "Quota Monitoring",
		description: isPortuguese
			? "Configure o intervalo de atualização automática e o limiar de alerta de uso."
			: "Configure the auto-refresh interval and usage alert threshold.",
		refreshLabel: isPortuguese
			? "Intervalo de atualização"
			: "Refresh interval",
		refreshHint: isPortuguese
			? "Com que frequência o sistema verifica o uso das contas em background."
			: "How often the system polls account usage in the background.",
		thresholdLabel: isPortuguese
			? "Limiar de alerta de cota (%)"
			: "Quota alert threshold (%)",
		thresholdHint: isPortuguese
			? "O banner de alerta aparece quando qualquer conta ultrapassa este percentual."
			: "The alert banner appears when any account exceeds this usage percentage.",
		save: isPortuguese ? "Salvar configuração" : "Save configuration",
		saving: isPortuguese ? "Salvando..." : "Saving...",
		saved: isPortuguese ? "Configuração salva." : "Configuration saved.",
		loadError: isPortuguese
			? "Falha ao carregar configuração de cotas."
			: "Failed to load quota configuration.",
		saveError: isPortuguese
			? "Falha ao salvar configuração de cotas."
			: "Failed to save quota configuration.",
		minutesSuffix: isPortuguese ? "min" : "min",
	};

	const loadErrorRef = useRef(ui.loadError);
	loadErrorRef.current = ui.loadError;

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount; loadErrorRef.current is always current
	useEffect(() => {
		async function load() {
			setIsLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/settings/quota-config");
				if (!res.ok) throw new Error(loadErrorRef.current);
				const payload = (await res.json()) as {
					config?: {
						refreshIntervalMinutes?: number;
						alertThresholdPercent?: number;
					};
				};
				const cfg = payload.config ?? {};
				const normalized = REFRESH_OPTIONS.includes(
					cfg.refreshIntervalMinutes as RefreshInterval,
				)
					? (cfg.refreshIntervalMinutes as RefreshInterval)
					: 10;
				setRefreshInterval(normalized);
				setAlertThreshold(
					typeof cfg.alertThresholdPercent === "number"
						? Math.min(100, Math.max(0, cfg.alertThresholdPercent))
						: 80,
				);
			} catch {
				setError(loadErrorRef.current);
			} finally {
				setIsLoading(false);
			}
		}
		void load();
	}, []);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setIsSaving(true);
		setFeedback(null);
		setError(null);
		try {
			const res = await fetch("/api/settings/quota-config", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					refreshIntervalMinutes: refreshInterval,
					alertThresholdPercent: alertThreshold,
				}),
			});
			if (!res.ok) throw new Error(ui.saveError);
			setFeedback(ui.saved);
		} catch {
			setError(ui.saveError);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
			<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
				<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="h-4 w-4"
						aria-hidden="true"
					>
						<title>Quota monitoring icon</title>
						<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
					</svg>
				</span>
				{ui.title}
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">{ui.description}</p>

			{isLoading ? (
				<p className="mt-4 text-sm text-muted-foreground">
					{isPortuguese ? "Carregando..." : "Loading..."}
				</p>
			) : (
				<form className="mt-4 space-y-4" onSubmit={handleSave}>
					{/* Refresh interval */}
					<div className="space-y-1.5">
						<label
							htmlFor="quota-refresh-interval"
							className="text-sm text-muted-foreground"
						>
							{ui.refreshLabel}
						</label>
						<select
							id="quota-refresh-interval"
							value={refreshInterval}
							onChange={(e) =>
								setRefreshInterval(Number(e.target.value) as RefreshInterval)
							}
							disabled={isSaving}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:opacity-70"
						>
							{REFRESH_OPTIONS.map((opt) => (
								<option key={opt} value={opt}>
									{opt} {ui.minutesSuffix}
								</option>
							))}
						</select>
						<p className="text-xs text-muted-foreground">{ui.refreshHint}</p>
					</div>

					{/* Alert threshold */}
					<div className="space-y-1.5">
						<label
							htmlFor="quota-alert-threshold"
							className="flex items-center justify-between text-sm text-muted-foreground"
						>
							<span>{ui.thresholdLabel}</span>
							<span className="font-mono text-foreground">
								{alertThreshold}%
							</span>
						</label>
						<input
							id="quota-alert-threshold"
							type="range"
							min={50}
							max={100}
							step={5}
							value={alertThreshold}
							onChange={(e) => setAlertThreshold(Number(e.target.value))}
							disabled={isSaving}
							className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-70"
						/>
						<div className="flex justify-between text-[10px] text-muted-foreground">
							<span>50%</span>
							<span>75%</span>
							<span>90%</span>
							<span>100%</span>
						</div>
						<p className="text-xs text-muted-foreground">{ui.thresholdHint}</p>
					</div>

					<Button type="submit" disabled={isSaving}>
						{isSaving ? ui.saving : ui.save}
					</Button>
				</form>
			)}

			{feedback ? (
				<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
					{feedback}
				</p>
			) : null}
			{error ? (
				<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
					{error}
				</p>
			) : null}
		</article>
	);
}
