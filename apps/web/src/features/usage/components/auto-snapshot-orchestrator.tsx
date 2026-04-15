"use client";

import type { AccountView } from "@/features/accounts/account-types";
/**
 * AutoSnapshotOrchestrator
 *
 * Invisible component that registers automatic snapshot polling
 * for every account that has latestUsage data.
 *
 * Renders null — purely side-effect driven.
 * Place once at the top level of a page that shows accounts.
 */
import { useAutoSnapshot } from "@/features/usage/hooks/use-auto-snapshot";

type Props = { accounts: AccountView[] };

function AccountPoller({ account }: { account: AccountView }) {
	const usage = account.latestUsage
		? {
				usedTokens: account.latestUsage.usedQuota,
				totalTokens: account.latestUsage.totalQuota,
				usedPercent: account.latestUsage.usedPercent ?? 0,
				resetAt: account.nextResetAt ?? null,
			}
		: null;

	useAutoSnapshot({
		accountId: account.id,
		latestUsage: usage,
	});

	return null;
}

export function AutoSnapshotOrchestrator({ accounts }: Props) {
	return (
		<>
			{accounts.map((a) => (
				<AccountPoller key={a.id} account={a} />
			))}
		</>
	);
}
