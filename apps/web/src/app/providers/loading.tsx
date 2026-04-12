import { Skeleton } from "@/components/ui/skeleton";

export default function ProvidersPageLoading() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<Skeleton className="h-14 w-full rounded-xl" />
				<div className="space-y-2">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-4 w-80" />
				</div>
				<div className="grid gap-5 lg:grid-cols-[minmax(300px,360px),1fr]">
					<Skeleton className="h-[520px] w-full rounded-xl" />
					<Skeleton className="h-[520px] w-full rounded-xl" />
				</div>
			</div>
		</main>
	);
}
