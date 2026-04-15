export default function AboutLoading() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				{/* Header skeleton */}
				<div className="h-24 animate-pulse rounded-xl bg-muted/70" />
				{/* Page title */}
				<div className="space-y-2">
					<div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
					<div className="h-4 w-72 animate-pulse rounded-md bg-muted/60" />
				</div>
				{/* Content blocks */}
				<div className="space-y-4">
					<div className="h-32 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-56 animate-pulse rounded-xl bg-muted/70" />
				</div>
			</div>
		</main>
	);
}
