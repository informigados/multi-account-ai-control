"use client";

import { Button } from "@/components/ui/button";

const LOCK_EVENT = "maac:lock-now";

type LockSessionButtonProps = {
	label?: string;
};

export function LockSessionButton({ label = "Lock" }: LockSessionButtonProps) {
	function onLock() {
		window.dispatchEvent(new CustomEvent(LOCK_EVENT));
	}

	return (
		<Button variant="outline" aria-label={label} onClick={onLock}>
			{label}
		</Button>
	);
}
