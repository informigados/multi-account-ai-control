import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tauriSrcRoot = path.join(repoRoot, "desktop", "tauri", "src-tauri");

function resolveCommand(command, args) {
	if (command !== "npm") {
		return { command, args, shell: false };
	}

	const npmExecPath = process.env.npm_execpath;
	if (typeof npmExecPath === "string" && npmExecPath.length > 0) {
		return {
			command: process.execPath,
			args: [npmExecPath, ...args],
			shell: false,
		};
	}

	if (process.platform === "win32") {
		const npmCliPath = path.join(
			path.dirname(process.execPath),
			"node_modules",
			"npm",
			"bin",
			"npm-cli.js",
		);
		if (existsSync(npmCliPath)) {
			return {
				command: process.execPath,
				args: [npmCliPath, ...args],
				shell: false,
			};
		}
	}

	if (process.platform !== "win32") {
		return {
			command: "npm",
			args,
			shell: false,
		};
	}

	throw new Error(
		"Unable to locate npm CLI path. Ensure command is run via npm scripts or Node installation includes npm-cli.js.",
	);
}

function run(command, args, cwd, options = {}) {
	const { printOutput = true } = options;
	const resolved = resolveCommand(command, args);
	const result = spawnSync(resolved.command, resolved.args, {
		cwd,
		shell: resolved.shell,
		encoding: "utf8",
	});

	if (printOutput && result.stdout) process.stdout.write(result.stdout);
	if (printOutput && result.stderr) process.stderr.write(result.stderr);

	if (result.error) {
		throw new Error(
			`Command failed to start: ${resolved.command} ${resolved.args.join(" ")} (${result.error.message})`,
		);
	}

	return result;
}

function runOrThrow(command, args, cwd, failureMessage) {
	const result = run(command, args, cwd);
	if (result.status !== 0) {
		throw new Error(failureMessage);
	}
}

function includesUnknownOptionOutput(result) {
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
	return output.includes("unknown option");
}

function runNpmAudit() {
	console.log("\n[security] Running npm audit (high/critical, prod deps)...");

	const commonArgs = ["audit", "--omit=dev", "--audit-level=high"];
	const workspaceArgs = [
		...commonArgs,
		"--workspaces",
		"--include-workspace-root",
	];

	const workspaceResult = run("npm", workspaceArgs, repoRoot);
	if (workspaceResult.status === 0) {
		return;
	}

	if (!includesUnknownOptionOutput(workspaceResult)) {
		throw new Error(
			"npm audit found vulnerabilities at high/critical severity or failed to run.",
		);
	}

	console.log(
		"[security] npm CLI does not support --workspaces audit flags. Falling back to per-scope checks...",
	);
	runOrThrow(
		"npm",
		commonArgs,
		repoRoot,
		"npm audit failed for repository root dependencies.",
	);
	runOrThrow(
		"npm",
		[...commonArgs, "--workspace", "apps/web"],
		repoRoot,
		"npm audit failed for workspace apps/web dependencies.",
	);
}

function ensureCargoAuditAvailable() {
	const result = run("cargo", ["audit", "--version"], tauriSrcRoot);
	if (result.status !== 0) {
		throw new Error(
			'cargo-audit is required for desktop release security gate. Install it with: cargo install cargo-audit --locked',
		);
	}
}

function runCargoAudit() {
	console.log("\n[security] Running cargo audit (Rust dependencies)...");
	ensureCargoAuditAvailable();
	const result = run("cargo", ["audit", "--json"], tauriSrcRoot, {
		printOutput: false,
	});
	if (result.status !== 0) {
		throw new Error("cargo audit detected vulnerable Rust dependencies.");
	}

	const raw = `${result.stdout ?? ""}`.trim();
	if (!raw) {
		console.log("[security] cargo audit completed with no report output.");
		return;
	}

	let report;
	try {
		report = JSON.parse(raw);
	} catch (error) {
		throw new Error("cargo audit returned invalid JSON output.");
	}

	const vulnerabilityCount =
		typeof report?.vulnerabilities?.count === "number"
			? report.vulnerabilities.count
			: 0;
	if (vulnerabilityCount > 0) {
		throw new Error(
			`cargo audit detected ${vulnerabilityCount} Rust vulnerability(ies).`,
		);
	}

	const warningGroups =
		report?.warnings && typeof report.warnings === "object"
			? report.warnings
			: {};
	const warningEntries = Object.values(warningGroups).filter(Array.isArray).flat();
	if (warningEntries.length === 0) {
		console.log("[security] cargo audit found no advisory warnings.");
		return;
	}

	const ids = Array.from(
		new Set(
			warningEntries
				.map((entry) => entry?.advisory?.id)
				.filter((id) => typeof id === "string"),
		),
	).sort((left, right) => left.localeCompare(right));
	console.log(
		`[security] cargo audit reported ${warningEntries.length} advisory warning(s) across ${ids.length} advisory ID(s): ${ids.join(", ")}`,
	);
	console.log(
		"[security] Gate policy: advisory warnings are tracked, but only confirmed vulnerabilities fail release.",
	);
}

function main() {
	runNpmAudit();
	runCargoAudit();
	console.log("\n[security] Dependency vulnerability gate passed.");
}

try {
	main();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\n[security] Dependency vulnerability gate failed: ${message}`);
	process.exit(1);
}
