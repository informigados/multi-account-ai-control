"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: "default" | "danger";
	isLoading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	tone = "default",
	isLoading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const confirmButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) return;
		confirmButtonRef.current?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onCancel();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [onCancel, open]);

	if (!open) return null;

	return (
		<dialog
			open
			className="fixed inset-0 z-[120] m-0 h-full w-full max-w-none border-0 bg-transparent p-0"
			aria-labelledby="confirm-dialog-title"
			aria-describedby="confirm-dialog-description"
			onClose={onCancel}
		>
			<div className="flex min-h-full items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
				<div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
					<h2 id="confirm-dialog-title" className="text-lg font-semibold">
						{title}
					</h2>
					<p
						id="confirm-dialog-description"
						className="mt-2 text-sm text-muted-foreground"
					>
						{description}
					</p>

					<div className="mt-4 flex justify-end gap-2">
						<Button variant="outline" onClick={onCancel} disabled={isLoading}>
							{cancelLabel}
						</Button>
						<Button
							ref={confirmButtonRef}
							onClick={onConfirm}
							disabled={isLoading}
							className={
								tone === "danger"
									? "bg-danger text-white hover:bg-danger/90"
									: undefined
							}
						>
							{isLoading ? "Processing..." : confirmLabel}
						</Button>
					</div>
				</div>
			</div>
		</dialog>
	);
}
