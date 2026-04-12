import path from "node:path";
import { getEnv } from "@/lib/env";
import { PrismaClient } from "@prisma/client";

const env = getEnv();

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

function resolveSqliteDatabaseUrl(url: string) {
	if (!url.startsWith("file:")) {
		return url;
	}

	const rawFileUrl = url.slice("file:".length);
	if (!rawFileUrl || rawFileUrl === ":memory:") {
		return url;
	}

	const [rawPath, rawQuery] = rawFileUrl.split("?");
	if (!rawPath) {
		return url;
	}

	if (path.isAbsolute(rawPath)) {
		const normalizedAbsolutePath = rawPath.replace(/\\/g, "/");
		return rawQuery
			? `file:${normalizedAbsolutePath}?${rawQuery}`
			: `file:${normalizedAbsolutePath}`;
	}

	const cwd = process.cwd();
	const normalizedCwd = cwd.replace(/\\/g, "/");
	const isWebWorkspaceCwd = normalizedCwd.endsWith("/apps/web");
	let resolvedPath: string | null = null;

	if (rawPath === "./local.db" || rawPath === "local.db") {
		resolvedPath = isWebWorkspaceCwd
			? path.resolve(cwd, "..", "..", "prisma", "local.db")
			: path.resolve(cwd, "prisma", "local.db");
	} else if (rawPath === "../../prisma/local.db") {
		resolvedPath = isWebWorkspaceCwd
			? path.resolve(cwd, "..", "..", "prisma", "local.db")
			: path.resolve(cwd, "apps", "web", "..", "..", "prisma", "local.db");
	}

	if (!resolvedPath) {
		return url;
	}

	const normalizedPath = resolvedPath.replace(/\\/g, "/");
	return rawQuery
		? `file:${normalizedPath}?${rawQuery}`
		: `file:${normalizedPath}`;
}

const resolvedDatabaseUrl = resolveSqliteDatabaseUrl(env.DATABASE_URL);

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({
		datasources: {
			db: {
				url: resolvedDatabaseUrl,
			},
		},
		log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
	});

if (env.NODE_ENV !== "production") {
	globalForPrisma.prisma = db;
}
