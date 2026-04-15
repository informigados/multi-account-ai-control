type ProviderBrandProps = {
	name: string;
	icon: string | null | undefined;
	color: string | null | undefined;
	size?: "sm" | "md";
	showName?: boolean;
	className?: string;
};

export function ProviderBrand({
	name,
	icon,
	color,
	size = "sm",
	showName = true,
	className,
}: ProviderBrandProps) {
	const sizeClass =
		size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";
	const safeColor = color ?? "#334155";
	const resolvedIcon = icon ?? "/providers/provider-fallback.svg";

	return (
		<span
			className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}
		>
			<span
				className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted ${sizeClass}`}
				style={{ borderColor: safeColor }}
			>
				<img
					src={resolvedIcon}
					alt={`${name} logo`}
					className="h-full w-full object-cover"
					loading="lazy"
					decoding="async"
				/>
			</span>
			{showName ? <span className="truncate">{name}</span> : null}
		</span>
	);
}
