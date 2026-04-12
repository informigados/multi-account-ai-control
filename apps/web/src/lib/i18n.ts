export const SUPPORTED_LOCALES = ["pt_BR", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt_BR";

export function normalizeLocale(value: string | null | undefined): AppLocale {
	if (value === "en") {
		return "en";
	}
	return DEFAULT_LOCALE;
}

export function toHtmlLang(locale: AppLocale): "pt-BR" | "en" {
	return locale === "pt_BR" ? "pt-BR" : "en";
}

type AppDictionary = {
	shell: {
		productName: string;
		loggedInAs: string;
		nav: {
			dashboard: string;
			providers: string;
			accounts: string;
			data: string;
			audit: string;
			settings: string;
			about: string;
		};
		actions: {
			logout: string;
			lock: string;
			openMenu: string;
			closeMenu: string;
		};
	};
	pages: {
		dashboard: {
			title: string;
			description: string;
		};
		providers: {
			title: string;
			description: string;
		};
		accounts: {
			title: string;
			description: string;
		};
		data: {
			title: string;
			description: string;
		};
		audit: {
			title: string;
			description: string;
		};
		settings: {
			title: string;
			description: string;
		};
		about: {
			title: string;
			description: string;
		};
	};
	footer: {
		designedBy: string;
	};
	login: {
		localAuth: string;
		title: string;
		badge: string;
		identifierLabel: string;
		identifierPlaceholder: string;
		passwordLabel: string;
		errorInvalidCredentials: string;
		errorLoginFailed: string;
		submit: string;
		submitting: string;
	};
	idleLock: {
		title: string;
		subtitle: string;
		passwordPlaceholder: string;
		errorExpired: string;
		errorGeneric: string;
		unlock: string;
		unlocking: string;
		logout: string;
	};
	settings: {
		profileCardTitle: string;
		profileCardDescription: string;
		emailLabel: string;
		passwordLabel: string;
		passwordPlaceholder: string;
		languageLabel: string;
		saveProfile: string;
		saving: string;
		profileSaved: string;
		usersCardTitle: string;
		usersCardDescription: string;
		createUserTitle: string;
		usernameLabel: string;
		userRoleLabel: string;
		userStatusLabel: string;
		activeStatus: string;
		inactiveStatus: string;
		createUser: string;
		usersTableTitle: string;
		usersTableEmail: string;
		usersTableRole: string;
		usersTableLocale: string;
		usersTableStatus: string;
		usersTableProtected: string;
		usersTableActions: string;
		protectedYes: string;
		protectedNo: string;
		actionSave: string;
		actionDelete: string;
		actionDeleting: string;
		loadError: string;
		createSuccess: string;
		updateSuccess: string;
		deleteSuccess: string;
		forbidden: string;
		cannotDeleteSelf: string;
		auditRetentionCardTitle: string;
		auditRetentionCardDescription: string;
		auditRetentionModeLabel: string;
		auditRetentionModeDisabled: string;
		auditRetentionModeEnabled: string;
		auditRetentionDaysLabel: string;
		auditRetentionHint: string;
		auditRetentionSave: string;
		auditRetentionSaved: string;
		auditRetentionLoadError: string;
		auditRetentionUpdateError: string;
	};
};

const dictionaryByLocale: Record<AppLocale, AppDictionary> = {
	pt_BR: {
		shell: {
			productName: "Multi Account AI Control",
			loggedInAs: "Logado como",
			nav: {
				dashboard: "Dashboard",
				providers: "Provedores",
				accounts: "Contas",
				data: "Dados",
				audit: "Auditoria",
				settings: "Configurações",
				about: "Sobre",
			},
			actions: {
				logout: "Sair",
				lock: "Bloquear",
				openMenu: "Abrir menu",
				closeMenu: "Fechar menu",
			},
		},
		pages: {
			dashboard: {
				title: "Dashboard Operacional",
				description:
					"Visão de comando em tempo real para cotas, janelas de reset e saúde das contas.",
			},
			providers: {
				title: "Provedores",
				description:
					"Gerencie catálogo de provedores, estratégia de conectores e status de ciclo de vida.",
			},
			accounts: {
				title: "Contas",
				description:
					"Cadastre, filtre e opere o inventário de contas com segredos mascarados.",
			},
			data: {
				title: "Operações de Dados",
				description:
					"Fluxos de importação, exportação e restauração com rastreabilidade de auditoria.",
			},
			audit: {
				title: "Log de Auditoria",
				description:
					"Rastreabilidade operacional global em autenticação, contas, uso, notas e operações de dados.",
			},
			settings: {
				title: "Configurações",
				description:
					"Ajuste perfil, idioma da interface e gestão de usuários do sistema.",
			},
			about: {
				title: "Sobre o Sistema",
				description:
					"Conheça os princípios, segurança e evolução do Multi Account AI Control.",
			},
		},
		footer: {
			designedBy: "Projetado por",
		},
		login: {
			localAuth: "Autenticação local",
			title: "Multi Account AI Control",
			badge: "Acesso local-first seguro",
			identifierLabel: "Usuário ou e-mail",
			identifierPlaceholder: "admin ou admin@local",
			passwordLabel: "Senha",
			errorInvalidCredentials: "Credenciais inválidas.",
			errorLoginFailed: "Falha no login. Tente novamente.",
			submit: "Entrar",
			submitting: "Entrando...",
		},
		idleLock: {
			title: "Sessão bloqueada",
			subtitle: "Digite sua senha novamente para desbloquear este workspace.",
			passwordPlaceholder: "Senha da conta",
			errorExpired: "Sessão expirada ou credenciais inválidas.",
			errorGeneric: "Falha ao desbloquear sessão.",
			unlock: "Desbloquear",
			unlocking: "Desbloqueando...",
			logout: "Sair",
		},
		settings: {
			profileCardTitle: "Perfil",
			profileCardDescription:
				"Atualize e-mail, senha e idioma da interface para o usuário logado.",
			emailLabel: "E-mail",
			passwordLabel: "Nova senha (opcional)",
			passwordPlaceholder: "Mínimo de 12 caracteres",
			languageLabel: "Idioma",
			saveProfile: "Salvar perfil",
			saving: "Salvando...",
			profileSaved: "Perfil atualizado com sucesso.",
			usersCardTitle: "Usuários",
			usersCardDescription:
				"Crie e gerencie usuários. O admin protegido não pode ser excluído e não permite alteração de username.",
			createUserTitle: "Adicionar usuário",
			usernameLabel: "Nome de usuário",
			userRoleLabel: "Função",
			userStatusLabel: "Status",
			activeStatus: "Ativo",
			inactiveStatus: "Inativo",
			createUser: "Criar usuário",
			usersTableTitle: "Usuários cadastrados",
			usersTableEmail: "E-mail",
			usersTableRole: "Função",
			usersTableLocale: "Idioma",
			usersTableStatus: "Status",
			usersTableProtected: "Admin protegido",
			usersTableActions: "Ações",
			protectedYes: "Sim",
			protectedNo: "Não",
			actionSave: "Salvar",
			actionDelete: "Excluir",
			actionDeleting: "Excluindo...",
			loadError: "Falha ao carregar usuários.",
			createSuccess: "Usuário criado com sucesso.",
			updateSuccess: "Usuário atualizado com sucesso.",
			deleteSuccess: "Usuário excluído com sucesso.",
			forbidden: "Apenas administradores podem gerenciar usuários.",
			cannotDeleteSelf: "Você não pode excluir seu próprio usuário.",
			auditRetentionCardTitle: "Retenção de logs de auditoria",
			auditRetentionCardDescription:
				"Controle a exclusão automática para evitar crescimento excessivo do histórico.",
			auditRetentionModeLabel: "Exclusão automática",
			auditRetentionModeDisabled: "Desativada",
			auditRetentionModeEnabled: "Ativada",
			auditRetentionDaysLabel: "Excluir logs com mais de",
			auditRetentionHint:
				"Quando ativado, os logs antigos serão removidos automaticamente conforme a janela selecionada.",
			auditRetentionSave: "Salvar retenção",
			auditRetentionSaved: "Política de retenção atualizada.",
			auditRetentionLoadError: "Falha ao carregar política de retenção.",
			auditRetentionUpdateError: "Falha ao atualizar política de retenção.",
		},
	},
	en: {
		shell: {
			productName: "Multi Account AI Control",
			loggedInAs: "Logged in as",
			nav: {
				dashboard: "Dashboard",
				providers: "Providers",
				accounts: "Accounts",
				data: "Data",
				audit: "Audit",
				settings: "Settings",
				about: "About",
			},
			actions: {
				logout: "Logout",
				lock: "Lock",
				openMenu: "Open menu",
				closeMenu: "Close menu",
			},
		},
		pages: {
			dashboard: {
				title: "Operational Dashboard",
				description:
					"Live command view for quota, reset windows, and account health.",
			},
			providers: {
				title: "Providers",
				description:
					"Manage provider catalog, connector strategy, and lifecycle status.",
			},
			accounts: {
				title: "Accounts",
				description:
					"Register, filter, and operate account inventory with masked secrets.",
			},
			data: {
				title: "Data Operations",
				description:
					"Import, export, and restore workflows with audit traceability.",
			},
			audit: {
				title: "Audit Log",
				description:
					"Global operational traceability across auth, accounts, usage, notes, and data operations.",
			},
			settings: {
				title: "Settings",
				description:
					"Adjust profile, interface language, and system user management.",
			},
			about: {
				title: "About the System",
				description:
					"Understand the principles, security, and evolution of Multi Account AI Control.",
			},
		},
		footer: {
			designedBy: "Designed by",
		},
		login: {
			localAuth: "Local auth",
			title: "Multi Account AI Control",
			badge: "Local-first secure access",
			identifierLabel: "Username or email",
			identifierPlaceholder: "admin or admin@local",
			passwordLabel: "Password",
			errorInvalidCredentials: "Invalid credentials.",
			errorLoginFailed: "Login failed. Please try again.",
			submit: "Sign in",
			submitting: "Signing in...",
		},
		idleLock: {
			title: "Session locked",
			subtitle: "Re-enter your password to unlock this workspace.",
			passwordPlaceholder: "Account password",
			errorExpired: "Session expired or invalid credentials.",
			errorGeneric: "Failed to unlock session.",
			unlock: "Unlock",
			unlocking: "Unlocking...",
			logout: "Logout",
		},
		settings: {
			profileCardTitle: "Profile",
			profileCardDescription:
				"Update email, password, and interface language for the current user.",
			emailLabel: "Email",
			passwordLabel: "New password (optional)",
			passwordPlaceholder: "At least 12 characters",
			languageLabel: "Language",
			saveProfile: "Save profile",
			saving: "Saving...",
			profileSaved: "Profile updated successfully.",
			usersCardTitle: "Users",
			usersCardDescription:
				"Create and manage users. The protected admin cannot be deleted and does not allow username changes.",
			createUserTitle: "Add user",
			usernameLabel: "Username",
			userRoleLabel: "Role",
			userStatusLabel: "Status",
			activeStatus: "Active",
			inactiveStatus: "Inactive",
			createUser: "Create user",
			usersTableTitle: "Registered users",
			usersTableEmail: "Email",
			usersTableRole: "Role",
			usersTableLocale: "Language",
			usersTableStatus: "Status",
			usersTableProtected: "Protected admin",
			usersTableActions: "Actions",
			protectedYes: "Yes",
			protectedNo: "No",
			actionSave: "Save",
			actionDelete: "Delete",
			actionDeleting: "Deleting...",
			loadError: "Failed to load users.",
			createSuccess: "User created successfully.",
			updateSuccess: "User updated successfully.",
			deleteSuccess: "User deleted successfully.",
			forbidden: "Only administrators can manage users.",
			cannotDeleteSelf: "You cannot delete your own user.",
			auditRetentionCardTitle: "Audit log retention",
			auditRetentionCardDescription:
				"Control automatic deletion to avoid excessive growth of audit history.",
			auditRetentionModeLabel: "Automatic deletion",
			auditRetentionModeDisabled: "Disabled",
			auditRetentionModeEnabled: "Enabled",
			auditRetentionDaysLabel: "Delete logs older than",
			auditRetentionHint:
				"When enabled, old logs are automatically removed according to the selected window.",
			auditRetentionSave: "Save retention",
			auditRetentionSaved: "Retention policy updated.",
			auditRetentionLoadError: "Failed to load retention policy.",
			auditRetentionUpdateError: "Failed to update retention policy.",
		},
	},
};

export function getDictionary(locale: AppLocale): AppDictionary {
	return dictionaryByLocale[locale];
}
