import { Skeleton } from "@/components/ui/skeleton";

export default function AuditPageLoading() {
	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<Skeleton className="h-14 w-full rounded-xl" />
				<div className="space-y-2">
					<Skeleton className="h-9 w-44" />
					<Skeleton className="h-4 w-[520px]" />
				</div>
				<Skeleton className="h-[620px] w-full rounded-xl" />
			</div>
		</main>
	);
}
