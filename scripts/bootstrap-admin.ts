import bcrypt from "bcryptjs";
import { PrismaClient, UserLocale, UserRole } from "@prisma/client";

type CliArgs = {
  email?: string;
  password?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith("--")) continue;
    if (!value || value.startsWith("--")) continue;

    const normalizedKey = key.slice(2) as keyof CliArgs;
    parsed[normalizedKey] = value;
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = "admin";
  const email = args.email?.trim();
  const password = args.password;

  if (!email || !password) {
    console.error(
      "Usage: npm run auth:bootstrap-admin -- --email <email> --password <password>",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);

  const existingSystemAdmin = await prisma.user.findFirst({
    where: { isSystemAdmin: true },
    select: { id: true },
  });

  if (existingSystemAdmin) {
    await prisma.user.update({
      where: { id: existingSystemAdmin.id },
      data: {
        username,
        email,
        passwordHash,
        role: UserRole.admin,
        locale: UserLocale.pt_BR,
        isActive: true,
        isSystemAdmin: true,
      },
    });
    console.log("Updated protected default admin user 'admin'.");
  } else {
    await prisma.user.upsert({
      where: { username },
      create: {
        username,
        email,
        passwordHash,
        role: UserRole.admin,
        locale: UserLocale.pt_BR,
        isActive: true,
        isSystemAdmin: true,
      },
      update: {
        email,
        passwordHash,
        role: UserRole.admin,
        locale: UserLocale.pt_BR,
        isActive: true,
        isSystemAdmin: true,
      },
    });
    console.log("Created protected default admin user 'admin'.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Admin bootstrap failed:", error);
  process.exit(1);
});
