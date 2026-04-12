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
      create: provider,
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

  if (defaultAdminPassword.length < 12) {
    throw new Error("DEFAULT_ADMIN_PASSWORD must have at least 12 characters.");
  }

  const existingSystemAdmin = await prisma.user.findFirst({
    where: { isSystemAdmin: true },
    select: { id: true },
  });

  const passwordHash = await bcrypt.hash(defaultAdminPassword, 12);

  if (existingSystemAdmin) {
    await prisma.user.update({
      where: { id: existingSystemAdmin.id },
      data: {
        username: defaultAdminUsername,
        email: defaultAdminEmail,
        role: UserRole.admin,
        locale: UserLocale.pt_BR,
        isActive: true,
        isSystemAdmin: true,
      },
    });
  } else {
    await prisma.user.upsert({
      where: { username: defaultAdminUsername },
      update: {
        email: defaultAdminEmail,
        passwordHash,
        role: UserRole.admin,
        locale: UserLocale.pt_BR,
        isActive: true,
        isSystemAdmin: true,
      },
      create: {
        username: defaultAdminUsername,
        email: defaultAdminEmail,
        passwordHash,
        role: UserRole.admin,
        locale: UserLocale.pt_BR,
        isActive: true,
        isSystemAdmin: true,
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
