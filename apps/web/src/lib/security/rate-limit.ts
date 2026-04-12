import type { NextRequest } from "next/server";

type RateLimitEntry = {
	count: number;
	resetAt: number;
};

type RateLimitOptions = {
	key: string;
	limit: number;
	windowMs: number;
};

type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds: number;
};

const RATE_LIMIT_STORE = new Map<string, RateLimitEntry>();
const MAX_TRACKED_KEYS = 5000;

function cleanupIfNeeded(now: number) {
	if (RATE_LIMIT_STORE.size <= MAX_TRACKED_KEYS) return;

	for (const [key, entry] of RATE_LIMIT_STORE.entries()) {
		if (entry.resetAt <= now) {
			RATE_LIMIT_STORE.delete(key);
		}
	}
}

export function consumeRateLimit({
	key,
	limit,
	windowMs,
}: RateLimitOptions): RateLimitResult {
	const now = Date.now();
	cleanupIfNeeded(now);

	const existing = RATE_LIMIT_STORE.get(key);
	if (!existing || existing.resetAt <= now) {
		RATE_LIMIT_STORE.set(key, {
			count: 1,
			resetAt: now + windowMs,
		});

		return {
			allowed: true,
			remaining: Math.max(0, limit - 1),
			retryAfterSeconds: Math.ceil(windowMs / 1000),
		};
	}

	if (existing.count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds: Math.max(
				1,
				Math.ceil((existing.resetAt - now) / 1000),
			),
		};
	}

	existing.count += 1;
	RATE_LIMIT_STORE.set(key, existing);

	return {
		allowed: true,
		remaining: Math.max(0, limit - existing.count),
		retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
	};
}

export function getClientAddress(request: NextRequest) {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		const firstAddress = forwardedFor.split(",")[0]?.trim();
		if (firstAddress) return firstAddress;
	}

	const realIp = request.headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	return "local";
}

export function resetRateLimitStoreForTests() {
	RATE_LIMIT_STORE.clear();
}
