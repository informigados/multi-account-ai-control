import Link from "next/link";

export default function NotFoundPage() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 pb-16 pt-12">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					404
				</p>
				<h1 className="text-3xl font-semibold">Page not found</h1>
				<p className="text-sm text-muted-foreground">
					The requested page does not exist or is no longer available.
				</p>
				<div>
					<Link
						href="/"
						className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted"
					>
						Go to dashboard
					</Link>
				</div>
			</div>
		</main>
	);
}
