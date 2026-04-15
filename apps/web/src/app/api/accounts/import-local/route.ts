/**
 * POST /api/accounts/import-local
 *
 * Atomically creates an account from a locally detected session and
 * optionally persists the detected token as an encrypted secret blob.
 *
 * This endpoint completes the "Persistir token detectado de forma segura"
 * roadmap item (F.1) — the token never leaves the server unencrypted.
 *
 * Request body:
 *   {
 *     identifier:  string          // detected email / login
 *     displayName: string          // user-friendly name
 *     providerSlug: string         // "gemini-cli" | "codex" | "zed" | "cursor" | "windsurf" | "github-copilot"
 *     planName?:   string          // optional plan label
 *     rawToken?:   string          // full token value to encrypt and store (never echoed back)
 *   }
 *
 * On success: { account: AccountView, secretStored: boolean }
 */
import { presentAccount } from "@/features/accounts/account-presenter";
import { buildSecretBlob } from "@/features/accounts/secret-blob";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	identifier: z.string().min(1).max(255),
	displayName: z.string().min(1).max(255),
	providerSlug: z
		.string()
		.min(1)
		.max(64)
		.transform((s) => s.toLowerCase()),
	planName: z.string().max(128).optional(),
	rawToken: z.string().min(1).max(8192).optional(),
});

// Map provider slug → provider name heuristic (for lookup)
const SLUG_NAME_MAP: Record<string, string> = {
	"gemini-cli": "gemini",
	codex: "openai",
	zed: "zed",
	cursor: "cursor",
	windsurf: "windsurf",
	"github-copilot": "github",
};

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) return csrfError;

	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid payload.", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { identifier, displayName, providerSlug, planName, rawToken } =
		parsed.data;

	// Resolve provider — try exact slug match first, then name contains
	const nameHint = SLUG_NAME_MAP[providerSlug] ?? providerSlug;
	let provider = await db.provider.findFirst({
		where: {
			OR: [{ slug: providerSlug }, { slug: nameHint }],
			isActive: true,
		},
		select: { id: true, name: true },
	});

	// Fallback: name-contains (case-insensitive on the app side)
	if (!provider) {
		const allProviders = await db.provider.findMany({
			where: { isActive: true },
			select: { id: true, name: true },
		});
		provider =
			allProviders.find((p) =>
				p.name.toLowerCase().includes(nameHint.toLowerCase()),
			) ??
			allProviders[0] ??
			null;
	}

	if (!provider) {
		return NextResponse.json(
			{ message: "No active provider found to associate the account with." },
			{ status: 422 },
		);
	}

	// Build encrypted secret blob if token is provided
	const encryptedSecretBlob = rawToken
		? buildSecretBlob({ token: rawToken })
		: null;

	// Create account
	const account = await db.account.create({
		data: {
			identifier,
			displayName,
			providerId: provider.id,
			planName: planName ?? null,
			status: "active",
			priority: 3,
			encryptedSecretBlob: encryptedSecretBlob ?? undefined,
		},
		include: {
			provider: {
				select: { id: true, name: true, slug: true, icon: true, color: true },
			},
			usageSnapshots: { orderBy: { measuredAt: "desc" }, take: 1 },
		},
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		entityId: account.id,
		eventType: "account_created",
		message: `Account imported from local ${providerSlug} session: ${displayName}`,
		metadata: {
			providerSlug,
			secretStored: Boolean(encryptedSecretBlob),
			source: "local_import",
		},
	});

	return NextResponse.json(
		{
			account: presentAccount(account),
			secretStored: Boolean(encryptedSecretBlob),
		},
		{ status: 201 },
	);
}
