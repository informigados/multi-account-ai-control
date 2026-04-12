export default function GlobalLoading() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 pb-16 pt-10 md:px-10">
				<div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
				<div className="h-28 animate-pulse rounded-xl bg-muted/70" />
				<div className="grid gap-3 md:grid-cols-2">
					<div className="h-32 animate-pulse rounded-xl bg-muted/70" />
					<div className="h-32 animate-pulse rounded-xl bg-muted/70" />
				</div>
			</div>
		</main>
	);
}
