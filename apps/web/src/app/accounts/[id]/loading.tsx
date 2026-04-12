import { Skeleton } from "@/components/ui/skeleton";

export default function AccountDetailsLoading() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<Skeleton className="h-14 w-full rounded-xl" />
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-72" />
					</div>
					<Skeleton className="h-10 w-52" />
				</div>
				<Skeleton className="h-48 w-full rounded-xl" />
				<Skeleton className="h-40 w-full rounded-xl" />
				<div className="grid gap-5 xl:grid-cols-2">
					<Skeleton className="h-[420px] w-full rounded-xl" />
					<Skeleton className="h-[420px] w-full rounded-xl" />
				</div>
			</div>
		</main>
	);
}
