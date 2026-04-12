import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const testDbPath = path.join(repoRoot, "prisma", "test.db");

if (existsSync(testDbPath)) {
	rmSync(testDbPath);
}

const env = {
	...process.env,
	NODE_ENV: "test",
	DATABASE_URL: `file:${testDbPath.replace(/\\/g, "/")}`,
	APP_MASTER_KEY:
		process.env.APP_MASTER_KEY ??
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
	SESSION_SECRET:
		process.env.SESSION_SECRET ??
		"test-session-secret-with-at-least-32-chars",
};

process.env.NODE_ENV = env.NODE_ENV;
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.APP_MASTER_KEY = env.APP_MASTER_KEY;
process.env.SESSION_SECRET = env.SESSION_SECRET;

const migrationsDir = path.join(repoRoot, "prisma", "migrations");
const migrationFiles = readdirSync(migrationsDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && /^\d+_.+/.test(entry.name))
	.map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
	.filter((migrationPath) => existsSync(migrationPath))
	.sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) {
	throw new Error("No migration SQL files were found in prisma/migrations.");
}

const prisma = new PrismaClient();
for (const migrationFile of migrationFiles) {
	const sqlContent = readFileSync(migrationFile, "utf8");
	const statements = sqlContent
		.split(/;\s*\r?\n/g)
		.map((statement) =>
			statement
				.split(/\r?\n/g)
				.filter((line) => !line.trimStart().startsWith("--"))
				.join("\n")
				.trim(),
		)
		.filter((statement) => statement.length > 0);

	for (const statement of statements) {
		await prisma.$executeRawUnsafe(statement);
	}
}
await prisma.$disconnect();

execSync("npm --workspace apps/web run test:run", {
	cwd: repoRoot,
	env,
	stdio: "inherit",
	shell: true,
});
