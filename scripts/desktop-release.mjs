import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tauriRoot = path.join(repoRoot, "desktop", "tauri");
const tauriSrcRoot = path.join(tauriRoot, "src-tauri");
const tauriConfigPath = path.join(tauriSrcRoot, "tauri.conf.json");
const bundleOutputRoot = path.join(tauriSrcRoot, "target", "release", "bundle");
const releaseRoot = path.join(repoRoot, "releases", "desktop");

const args = new Set(process.argv.slice(2));
const skipTests = args.has("--skip-tests");
const bundleOnly = args.has("--bundle-only");
const skipSecurityAudit = args.has("--skip-security-audit");

function runOrThrow(command, commandArgs, cwd) {
	let commandName = command;
	let args = commandArgs;

	if (command === "npm") {
		const npmExecPath = process.env.npm_execpath;
		if (typeof npmExecPath === "string" && npmExecPath.length > 0) {
			commandName = process.execPath;
			args = [npmExecPath, ...commandArgs];
		} else if (process.platform === "win32") {
			commandName = "npm.cmd";
		}
	}

	const result = spawnSync(commandName, args, {
		cwd,
		stdio: "inherit",
		shell: false,
	});

	if (result.error) {
		throw new Error(
			`Command failed to start: ${commandName} ${args.join(" ")} (${result.error.message})`,
		);
	}

	if (result.status !== 0) {
		throw new Error(
			`Command failed: ${commandName} ${args.join(" ")} (exit ${result.status ?? "unknown"})`,
		);
	}
}

function toReleaseStamp(date) {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

async function readTauriVersion() {
	const raw = await readFile(tauriConfigPath, "utf8");
	const parsed = JSON.parse(raw);
	const version = typeof parsed.version === "string" ? parsed.version : null;
	if (!version) {
		throw new Error("Unable to resolve version from tauri.conf.json.");
	}
	return version;
}

async function collectFilesRecursive(rootDir) {
	const found = [];
	const entries = await readdir(rootDir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(rootDir, entry.name);
		if (entry.isDirectory()) {
			found.push(...(await collectFilesRecursive(fullPath)));
			continue;
		}
		if (entry.isFile()) {
			found.push(fullPath);
		}
	}
	return found;
}

async function sha256File(filePath) {
	const content = await readFile(filePath);
	return createHash("sha256").update(content).digest("hex");
}

function isReleaseArtifact(filePath) {
	const extension = path.extname(filePath).toLowerCase();
	return [".msi", ".exe", ".zip", ".sig", ".dmg", ".appimage", ".deb", ".rpm"].includes(extension);
}

async function ensureDirectory(directoryPath) {
	await mkdir(directoryPath, { recursive: true });
}

async function copyAndIndexArtifacts(sourceFiles, destinationRoot, sourceRoot) {
	const artifactEntries = [];
	for (const sourceFile of sourceFiles) {
		const relativePath = path.relative(sourceRoot, sourceFile);
		const destination = path.join(destinationRoot, relativePath);
		await ensureDirectory(path.dirname(destination));
		await copyFile(sourceFile, destination);
		const fileStats = await stat(destination);
		const sha256 = await sha256File(destination);
		artifactEntries.push({
			relativePath: relativePath.replace(/\\/g, "/"),
			sizeBytes: fileStats.size,
			sha256,
		});
	}
	return artifactEntries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function writeChecksums(outputDir, artifacts) {
	const lines = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.relativePath}`);
	const checksumPath = path.join(outputDir, "SHA256SUMS.txt");
	await writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");
	return checksumPath;
}

async function writeManifest(outputDir, payload) {
	const manifestPath = path.join(outputDir, "release-manifest.json");
	await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	return manifestPath;
}

async function main() {
	if (!bundleOnly && !skipSecurityAudit) {
		runOrThrow("npm", ["run", "security:audit"], repoRoot);
	}

	if (!bundleOnly && !skipTests) {
		runOrThrow("npm", ["run", "test:critical"], repoRoot);
	}

	runOrThrow("cargo", ["tauri", "build"], tauriSrcRoot);

	if (!existsSync(bundleOutputRoot)) {
		throw new Error(`Bundle output directory not found: ${bundleOutputRoot}`);
	}

	const version = await readTauriVersion();
	const releaseStamp = toReleaseStamp(new Date());
	const releaseDir = path.join(releaseRoot, `v${version}-${releaseStamp}`);
	await ensureDirectory(releaseDir);

	const allFiles = await collectFilesRecursive(bundleOutputRoot);
	const artifactFiles = allFiles.filter(isReleaseArtifact);
	if (artifactFiles.length === 0) {
		throw new Error("No desktop artifacts found in Tauri bundle output.");
	}

	const artifacts = await copyAndIndexArtifacts(artifactFiles, releaseDir, bundleOutputRoot);
	const checksumsPath = await writeChecksums(releaseDir, artifacts);
	const manifestPath = await writeManifest(releaseDir, {
		version,
		releaseStamp,
		generatedAt: new Date().toISOString(),
		artifacts,
	});

	console.log("\nDesktop release package created successfully.");
	console.log(`- Output directory: ${releaseDir}`);
	console.log(`- Artifacts: ${artifacts.length}`);
	console.log(`- Checksums: ${checksumsPath}`);
	console.log(`- Manifest: ${manifestPath}`);
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\nDesktop release failed: ${message}`);
	process.exit(1);
});
