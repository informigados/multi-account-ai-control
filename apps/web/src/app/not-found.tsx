import Link from "next/link";

export default function NotFoundPage() {
	return (
		<main className="grid min-h-screen place-items-center px-6">
			<div className="page-enter w-full max-w-lg text-center">
				{/* Giant gradient 404 number */}
				<p
					className="select-none text-[8rem] font-bold leading-none"
					style={{
						background:
							"linear-gradient(135deg, hsl(var(--primary)), hsl(var(--info)))",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						backgroundClip: "text",
					}}
					aria-hidden
				>
					404
				</p>

				<div className="mt-4 space-y-2">
					<h1 className="text-2xl font-semibold">Page not found</h1>
					<p className="text-sm text-muted-foreground">
						The requested page does not exist or is no longer available.
					</p>
				</div>

				<div className="mt-8">
					<Link
						href="/"
						className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-6 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:border-primary/50"
					>
						← Go to dashboard
					</Link>
				</div>
			</div>
		</main>
	);
}
