"use client";

import { Button } from "@/components/ui/button";

type GlobalErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

const isDev = process.env.NODE_ENV === "development";

export default function GlobalError({ error, reset }: GlobalErrorProps) {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 pb-16 pt-12">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Application Error
				</p>
				<h1 className="text-3xl font-semibold">Something went wrong</h1>
				<p className="text-sm text-muted-foreground">
					{isDev
						? error.message || "Unexpected error while loading the application."
						: "An unexpected error occurred. Please try again or contact support."}
				</p>
				{error.digest && (
					<p className="text-xs text-muted-foreground/60">
						Error ID: {error.digest}
					</p>
				)}
				<div>
					<Button onClick={reset}>Try again</Button>
				</div>
			</div>
		</main>
	);
}
