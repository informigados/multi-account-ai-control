import bcrypt from "bcryptjs";
import {
  PrismaClient,
  ProviderConnectorType,
  UserLocale,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_BCRYPT_SALT_ROUNDS = 12;
const rawBcryptSaltRounds = process.env.BCRYPT_SALT_ROUNDS?.trim();
const parsedBcryptSaltRounds =
  rawBcryptSaltRounds && rawBcryptSaltRounds.length > 0
    ? (() => {
        const parsed = Number.parseInt(rawBcryptSaltRounds, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      })()
    : undefined;
const BCRYPT_SALT_ROUNDS =
  parsedBcryptSaltRounds !== undefined &&
  Number.isInteger(parsedBcryptSaltRounds) &&
  parsedBcryptSaltRounds >= 4 &&
  parsedBcryptSaltRounds <= 31
    ? parsedBcryptSaltRounds
    : DEFAULT_BCRYPT_SALT_ROUNDS;

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
    description: "Catch-all provider for miscellaneous accounts.",
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

type AdminUpdateData = AdminBaseData & { passwordHash?: string };
const SEED_TROUBLESHOOTING_STEPS = [
  "- Verify required environment variables are set (e.g., DATABASE_URL, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD).",
  "- Ensure the database is reachable and credentials in DATABASE_URL are correct.",
  "- Ensure Prisma schema changes are applied (try: `npx prisma migrate deploy` or `npx prisma db push`).",
] as const;

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
    throw new Error("Admin password must have at least 12 characters.");
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    throw new Error(
      "Admin password must include uppercase, lowercase, number, and special character.",
    );
  }
}

function validateAdminEmailOrThrow(email: string): void {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new Error(
      "DEFAULT_ADMIN_EMAIL must be a valid email address (e.g., admin@example.com).",
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

async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

async function main() {
  await Promise.all(
    providerSeeds.map((provider) =>
      prisma.provider.upsert({
        where: { slug: provider.slug },
        update: {
          name: provider.name,
          connectorType: provider.connectorType,
          color: provider.color,
          description: provider.description,
          isActive: true,
        },
        create: { ...provider, isActive: true },
      }),
    ),
  );

  await Promise.all([
    prisma.appSetting.upsert({
      where: { key: "ui.theme.default" },
      update: { valueJson: { mode: "system" } },
      create: {
        key: "ui.theme.default",
        valueJson: { mode: "system" },
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "ui.locale.default" },
      update: { valueJson: { locale: "pt_BR" } },
      create: {
        key: "ui.locale.default",
        valueJson: { locale: "pt_BR" },
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "audit.log.retention" },
      update: { valueJson: { enabled: false, days: null } },
      create: {
        key: "audit.log.retention",
        valueJson: { enabled: false, days: null },
      },
    }),
    prisma.appSetting.upsert({
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
    }),
  ]);

  const defaultAdminUsername = "admin";
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD?.trim();
  const defaultAdminLocale = resolveSeedAdminLocale();
  const shouldUpdateAdminPassword = parseBooleanFlag(
    process.env.SEED_UPDATE_ADMIN_PASSWORD,
  );

  if (!defaultAdminEmail) {
    throw new Error(
      "DEFAULT_ADMIN_EMAIL environment variable must be set and non-empty before running seeds.",
    );
  }

  if (!defaultAdminPassword) {
    throw new Error(
      "DEFAULT_ADMIN_PASSWORD environment variable must be set and non-empty before running seeds.",
    );
  }

  validateAdminPasswordOrThrow(defaultAdminPassword);
  validateAdminEmailOrThrow(defaultAdminEmail);

  const adminBaseData = buildAdminBaseData(
    defaultAdminUsername,
    defaultAdminEmail,
    defaultAdminLocale,
  );

  const existingUsersByUsernameOrEmail = await prisma.user.findMany({
    where: {
      OR: [
        { username: defaultAdminUsername },
        { email: defaultAdminEmail },
      ],
    },
    // We only need fields used by conflict checks and ownership comparisons.
    select: { id: true, username: true, email: true, isSystemAdmin: true },
    take: 2,
  });
  const existingUserByUsername =
    existingUsersByUsernameOrEmail.find(
      (user) => user.username === defaultAdminUsername,
    ) ?? null;
  const existingUserByEmail =
    existingUsersByUsernameOrEmail.find(
      (user) => user.email === defaultAdminEmail,
    ) ?? null;

  if (existingUserByUsername && !existingUserByUsername.isSystemAdmin) {
    throw new Error(
      `Cannot bootstrap system admin: username '${defaultAdminUsername}' already exists for a non-system-admin user (id='${existingUserByUsername.id}'). Resolve this conflict manually.`,
    );
  }

  // Email is a conflict when it already exists and is not owned by
  // the same user resolved by the bootstrap username lookup.
  const isEmailConflict = Boolean(
    existingUserByEmail &&
      (!existingUserByUsername ||
        existingUserByEmail.id !== existingUserByUsername.id),
  );
  if (isEmailConflict) {
    throw new Error(
      `Cannot bootstrap system admin: email '${defaultAdminEmail}' already exists for a different user (id='${existingUserByEmail.id}'). Resolve this conflict manually.`,
    );
  }

  // Only update when the bootstrap username already belongs to a system admin.
  // If there is no matching system-admin username, create a new one below.
  // Note: if `existingUserByUsername` exists but is not a system admin, we
  // throw above as a conflict.
  const existingSystemAdminId =
    existingUserByUsername?.isSystemAdmin === true
      ? existingUserByUsername.id
      : undefined;

  if (existingSystemAdminId) {
    // Always reconcile bootstrap profile fields (username/email/role/locale/state)
    // for the system admin. Password hash rotation is optional and only happens
    // when explicitly requested via SEED_UPDATE_ADMIN_PASSWORD.
    const updateData: AdminUpdateData = {
      ...adminBaseData,
      ...(shouldUpdateAdminPassword
        ? {
            passwordHash: await hashAdminPassword(defaultAdminPassword),
          }
        : {}),
    };

    await prisma.user.update({
      where: { id: existingSystemAdminId },
      data: updateData,
    });
  } else {
    const passwordHash = await hashAdminPassword(defaultAdminPassword);

    await prisma.user.create({
      data: {
        ...adminBaseData,
        passwordHash,
      },
    });
  }
}

main()
  .catch(async (error) => {
    const errorSummary =
      error instanceof Error ? error.message : String(error);
    console.error(
      `Seed failed during prisma seed main() execution: ${errorSummary}`,
    );
    if (error instanceof Error) {
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    } else {
      console.error("Non-Error rejection:", error);
    }
    console.error("Troubleshooting steps:");
    for (const step of SEED_TROUBLESHOOTING_STEPS) {
      console.error(step);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
