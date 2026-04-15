/**
 * GET /api/totp/[id]/code
 *
 * Returns the current 6-digit TOTP code and remaining seconds in the
 * current 30-second window — no external library needed.
 *
 * Algorithm: RFC 6238 (TOTP) using HMAC-SHA1 with Base32 secret.
 */
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

const KEY_TOTP = "app.totp_entries";

type TotpEntry = {
	id: string;
	secret: string;
};

function getTotpEntries(raw: unknown): TotpEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(
		(e) => typeof e?.id === "string" && typeof e?.secret === "string",
	) as TotpEntry[];
}

/** Decode a Base32-encoded string to a Uint8Array. */
function base32Decode(input: string): Uint8Array {
	const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
	const bytes: number[] = [];
	let buffer = 0;
	let bitsLeft = 0;

	for (const char of clean) {
		const val = ALPHABET.indexOf(char);
		if (val < 0) continue;
		buffer = (buffer << 5) | val;
		bitsLeft += 5;
		if (bitsLeft >= 8) {
			bitsLeft -= 8;
			bytes.push((buffer >> bitsLeft) & 0xff);
		}
	}

	return new Uint8Array(bytes);
}

/** Compute a 6-digit HOTP code. */
async function hotp(secretBytes: Uint8Array, counter: bigint): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		secretBytes.buffer.slice(
			secretBytes.byteOffset,
			secretBytes.byteOffset + secretBytes.byteLength,
		) as ArrayBuffer,
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);

	// Counter as 8-byte big-endian buffer
	const counterBuffer = new ArrayBuffer(8);
	const view = new DataView(counterBuffer);
	view.setBigUint64(0, counter, false); // big-endian

	const sig = await crypto.subtle.sign("HMAC", key, counterBuffer);
	const sigBytes = new Uint8Array(sig);

	// Dynamic truncation
	const offset = sigBytes[19] & 0x0f;
	const code =
		((sigBytes[offset] & 0x7f) << 24) |
		((sigBytes[offset + 1] & 0xff) << 16) |
		((sigBytes[offset + 2] & 0xff) << 8) |
		(sigBytes[offset + 3] & 0xff);

	return String(code % 1_000_000).padStart(6, "0");
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const { id } = await context.params;

	const setting = await db.appSetting.findUnique({ where: { key: KEY_TOTP } });
	const entries = getTotpEntries(setting?.valueJson);
	const entry = entries.find((e) => e.id === id);

	if (!entry)
		return NextResponse.json({ message: "Entry not found." }, { status: 404 });

	const nowMs = Date.now();
	const period = 30n;
	const counter = BigInt(Math.floor(nowMs / 1000)) / period;
	const remainingSeconds = 30 - (Math.floor(nowMs / 1000) % 30);

	let secretBytes: Uint8Array;
	try {
		secretBytes = base32Decode(entry.secret);
	} catch {
		return NextResponse.json(
			{ message: "Invalid TOTP secret." },
			{ status: 422 },
		);
	}

	const code = await hotp(secretBytes, counter);

	return NextResponse.json(
		{ code, remainingSeconds, period: 30 },
		{ status: 200 },
	);
}
