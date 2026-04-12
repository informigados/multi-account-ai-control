"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
	label?: string;
};

export function LogoutButton({ label = "Logout" }: LogoutButtonProps) {
	const router = useRouter();

	async function onLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		router.push("/login");
		router.refresh();
	}

	return (
		<Button variant="outline" aria-label={label} onClick={onLogout}>
			{label}
		</Button>
	);
}
