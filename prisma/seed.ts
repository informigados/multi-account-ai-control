import bcrypt from "bcryptjs";
import {
  PrismaClient,
  ProviderConnectorType,
  UserLocale,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const providerSeeds = [
  {
    name: "OpenAI / ChatGPT",
    slug: "openai-chatgpt",
    connectorType: ProviderConnectorType.manual,
    color: "#0EA5E9",
    description: "OpenAI provider profiles and account controls.",
  },
  {
    name: "Google / Gemini",
    slug: "google-gemini",
    connectorType: ProviderConnectorType.manual,
    color: "#10B981",
    description: "Gemini account and quota tracking.",
  },
  {
    name: "Anthropic / Claude",
    slug: "anthropic-claude",
    connectorType: ProviderConnectorType.manual,
    color: "#F59E0B",
    description: "Claude account and plan management.",
  },
  {
    name: "Custom",
    slug: "custom",
    connectorType: ProviderConnectorType.custom_script,
    color: "#3B82F6",
    description: "Custom internal provider definitions.",
  },
  {
    name: "Other",
    slug: "other",
    connectorType: ProviderConnectorType.manual,
    color: "#6B7280",
    description: "Catch-all provider for misc accounts.",
  },
];

type AdminBaseData = {
  username: string;
  email: string;
  role: UserRole;
  locale: UserLocale;
  isActive: boolean;
  isSystemAdmin: boolean;
};

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function resolveSeedAdminLocale(): UserLocale {
  const localeFromEnv = process.env.SEED_ADMIN_LOCALE?.trim();
  if (!localeFromEnv) {
    return UserLocale.pt_BR;
  }

  const normalizedLocale = localeFromEnv.replace("-", "_");
  const allowedLocales = Object.values(UserLocale) as string[];
  if (allowedLocales.includes(normalizedLocale)) {
    return normalizedLocale as UserLocale;
  }

  throw new Error(
    `SEED_ADMIN_LOCALE must be one of: ${allowedLocales.join(", ")}.`,
  );
}

function validateAdminPasswordOrThrow(password: string): void {
  if (password.length < 12) {
    throw new Error("DEFAULT_ADMIN_PASSWORD must have at least 12 characters.");
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    throw new Error(
      "DEFAULT_ADMIN_PASSWORD must include uppercase, lowercase, number, and special character.",
    );
  }
}

function buildAdminBaseData(
  username: string,
  email: string,
  locale: UserLocale,
): AdminBaseData {
  return {
    username,
    email,
    role: UserRole.admin,
    locale,
    isActive: true,
    isSystemAdmin: true,
  };
}

async function main() {
  for (const provider of providerSeeds) {
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        connectorType: provider.connectorType,
        color: provider.color,
        description: provider.description,
        isActive: true,
      },
      create: { ...provider, isActive: true },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "ui.theme.default" },
    update: { valueJson: { mode: "system" } },
    create: {
      key: "ui.theme.default",
      valueJson: { mode: "system" },
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "ui.locale.default" },
    update: { valueJson: { locale: "pt_BR" } },
    create: {
      key: "ui.locale.default",
      valueJson: { locale: "pt_BR" },
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "audit.log.retention" },
    update: { valueJson: { enabled: false, days: null } },
    create: {
      key: "audit.log.retention",
      valueJson: { enabled: false, days: null },
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "security.idle_lock" },
    update: {
      valueJson: {
        enabled: false,
        timeoutMinutes: 10,
        requirePasswordOnUnlock: true,
      },
    },
    create: {
      key: "security.idle_lock",
      valueJson: {
        enabled: false,
        timeoutMinutes: 10,
        requirePasswordOnUnlock: true,
      },
    },
  });

  const defaultAdminUsername = "admin";
  const defaultAdminEmail =
    process.env.DEFAULT_ADMIN_EMAIL?.trim() || "admin@local";
  const defaultAdminPassword =
    process.env.DEFAULT_ADMIN_PASSWORD?.trim() || "ChangeThisNow!123";
  const defaultAdminLocale = resolveSeedAdminLocale();
  const shouldUpdateAdminPassword = parseBooleanFlag(
    process.env.SEED_UPDATE_ADMIN_PASSWORD,
  );
  const adminBaseData = buildAdminBaseData(
    defaultAdminUsername,
    defaultAdminEmail,
    defaultAdminLocale,
  );

  validateAdminPasswordOrThrow(defaultAdminPassword);

  const [existingSystemAdmin, existingAdminUsernameUser] = await Promise.all([
    prisma.user.findFirst({
      where: { isSystemAdmin: true },
      select: { id: true, passwordHash: true },
    }),
    prisma.user.findUnique({
      where: { username: defaultAdminUsername },
      select: { id: true, isSystemAdmin: true },
    }),
  ]);

  const existingAdminUsernameUserId = existingAdminUsernameUser?.id ?? "unknown";
  const conflictsWithNonSystemAdminUsername =
    existingAdminUsernameUser !== null && !existingAdminUsernameUser.isSystemAdmin;
  const conflictsWithDifferentSystemAdmin =
    existingAdminUsernameUser !== null &&
    existingAdminUsernameUser.isSystemAdmin &&
    (existingSystemAdmin === null ||
      existingAdminUsernameUser.id !== existingSystemAdmin.id);

  if (conflictsWithNonSystemAdminUsername) {
    throw new Error(
      `Cannot bootstrap system admin: username '${defaultAdminUsername}' already exists for a non-system-admin user (id='${existingAdminUsernameUserId}'). Resolve this conflict manually.`,
    );
  }

  if (conflictsWithDifferentSystemAdmin) {
    throw new Error(
      `Cannot bootstrap system admin: username '${defaultAdminUsername}' is tied to a different system admin user (id='${existingAdminUsernameUserId}'). Resolve this conflict manually.`,
    );
  }

  if (existingSystemAdmin) {
    const updateData: AdminBaseData & { passwordHash?: string } = {
      ...adminBaseData,
    };
    if (shouldUpdateAdminPassword) {
      const passwordMatches = await bcrypt.compare(
        defaultAdminPassword,
        existingSystemAdmin.passwordHash,
      );
      if (!passwordMatches) {
        updateData.passwordHash = await bcrypt.hash(defaultAdminPassword, 12);
      }
    }

    await prisma.user.update({
      where: { id: existingSystemAdmin.id },
      data: updateData,
    });
  } else {
    const passwordHash = await bcrypt.hash(defaultAdminPassword, 12);

    await prisma.user.create({
      data: {
        ...adminBaseData,
        passwordHash,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
