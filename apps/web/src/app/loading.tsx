export default function GlobalLoading() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				{/* Header skeleton */}
				<div className="h-24 animate-pulse rounded-xl bg-muted/70" />
				{/* Page title skeleton */}
				<div className="space-y-2">
					<div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
					<div className="h-4 w-80 animate-pulse rounded-md bg-muted/60" />
				</div>
				{/* Metrics widgets - matches sm:grid-cols-2 xl:grid-cols-4 */}
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-20 animate-pulse rounded-xl bg-muted/70" />
				</div>
				{/* Main content - matches xl:grid-cols-[2fr,1fr] */}
				<div className="grid gap-5 xl:grid-cols-[2fr,1fr]">
					<div className="h-96 animate-pulse rounded-xl bg-muted/70" />
					<div className="space-y-5">
						<div className="h-44 animate-pulse rounded-xl bg-muted/70" />
						<div className="h-44 animate-pulse rounded-xl bg-muted/70" />
					</div>
				</div>
			</div>
		</main>
	);
}
