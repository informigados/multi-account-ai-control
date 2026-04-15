import type { CSSProperties } from "react";

type ProviderBrandProps = {
	name: string;
	icon: string | null | undefined;
	color: string | null | undefined;
	size?: "sm" | "md" | "lg" | "xl";
	showName?: boolean;
	className?: string;
};

/**
 * Perceived luminance (ITU-R BT.709) — tells us if a hex color is dark
 * so we can choose white (inverted) or black icon on top of brand bg.
 * Only used for SVG icons.
 */
function isColorDark(hex: string): boolean {
	const clean = hex.replace("#", "");
	if (clean.length !== 6) return true;
	const r = Number.parseInt(clean.slice(0, 2), 16);
	const g = Number.parseInt(clean.slice(2, 4), 16);
	const b = Number.parseInt(clean.slice(4, 6), 16);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

export function ProviderBrand({
	name,
	icon,
	color,
	size = "sm",
	showName = true,
	className,
}: ProviderBrandProps) {
	const containerClass =
		size === "sm"
			? "h-5 w-5"
			: size === "md"
				? "h-8 w-8"
				: size === "lg"
					? "h-10 w-10"
					: "h-12 w-12";

	const safeColor = color ?? "#1e293b";
	const resolvedIcon = icon ?? "/providers/provider-fallback.svg";

	/**
	 * Rendering strategy by file type:
	 *
	 * • SVG (SimpleIcons-style monochromatic paths):
	 *   – Container background = brand color
	 *   – Icon tinted white (dark bg) or black (light bg) via CSS filter
	 *   – Slight inset padding so the icon doesn't bleed to edge
	 *
	 * • Raster — ICO / PNG / WEBP (already carry full-color pixel data):
	 *   – Container background = brand color
	 *   – NO CSS filter: filter destroys color data → invisible icons
	 *   – h-full w-full so the icon fills the container naturally;
	 *     transparent areas in the raster reveal the brand color underneath
	 */
	const isSvg = resolvedIcon.toLowerCase().endsWith(".svg");

	const iconFilter: string | undefined = isSvg
		? isColorDark(safeColor)
			? "brightness(0) invert(1)" // → white icon on dark brand bg
			: "brightness(0)" // → black icon on light brand bg
		: undefined; // → raster: no filter, show original colors

	// SVGs get a small internal padding; rasters fill the container fully
	const imgClass = isSvg
		? size === "sm"
			? "h-3.5 w-3.5 object-contain"
			: size === "md"
				? "h-5 w-5 object-contain"
				: size === "lg"
					? "h-7 w-7 object-contain"
					: "h-9 w-9 object-contain"
		: "h-full w-full object-contain";

	return (
		<span
			className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}
		>
			<span
				className={`provider-brand-icon relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md ${containerClass}`}
				style={{ backgroundColor: safeColor } as CSSProperties}
			>
				<img
					src={resolvedIcon}
					alt={`${name} logo`}
					className={imgClass}
					style={iconFilter ? { filter: iconFilter } : undefined}
					loading="lazy"
					decoding="async"
				/>
			</span>
			{showName ? <span className="truncate">{name}</span> : null}
		</span>
	);
}
