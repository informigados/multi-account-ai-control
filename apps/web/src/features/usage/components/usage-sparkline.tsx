"use client";

/**
 * UsageSparkline
 *
 * SVG polyline sparkline of usage percentage over time.
 * Fetches data from /api/accounts/[id]/snapshots on mount.
 *
 * Props:
 *  - accountId: string
 *  - currentPercent: number (used as fallback when no history yet)
 *  - height?: number (default 36)
 *  - width?: number (default 120)
 *  - className?: string
 */
import { useEffect, useState } from "react";

type Snapshot = {
	id: string;
	usedPercent: number;
	measuredAt: string;
};

type UsageSparklineProps = {
	accountId: string;
	currentPercent: number;
	height?: number;
	width?: number;
	className?: string;
	limit?: number;
};

function pct2y(pct: number, h: number) {
	// Invert: 0% = bottom, 100% = top
	return h - (Math.min(100, Math.max(0, pct)) / 100) * h;
}

function buildPolyline(
	points: number[],
	w: number,
	h: number,
	padding = 2,
): string {
	if (points.length < 2) return "";
	const innerW = w - padding * 2;
	const step = innerW / Math.max(1, points.length - 1);
	return points
		.map(
			(p, i) => `${(padding + i * step).toFixed(1)},${pct2y(p, h).toFixed(1)}`,
		)
		.join(" ");
}

function colorForPercent(pct: number) {
	if (pct >= 90) return "hsl(var(--danger))";
	if (pct >= 70) return "hsl(var(--warning))";
	return "hsl(var(--success))";
}

export function UsageSparkline({
	accountId,
	currentPercent,
	height = 36,
	width = 120,
	className = "",
	limit = 20,
}: UsageSparklineProps) {
	const [points, setPoints] = useState<number[] | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: accountId/limit stable per render
	useEffect(() => {
		let alive = true;
		async function load() {
			try {
				const res = await fetch(
					`/api/accounts/${accountId}/snapshots?limit=${limit}`,
				);
				if (!res.ok) return;
				const data = (await res.json()) as { snapshots: Snapshot[] };
				if (!alive) return;
				const pcts = data.snapshots.map((s) => s.usedPercent);
				if (pcts.length > 0) setPoints(pcts);
			} catch {
				// Silently fail — fallback to currentPercent
			}
		}
		void load();
		return () => {
			alive = false;
		};
	}, [accountId, limit]);

	// Fallback: render single-value flat line
	const displayPoints = points ?? [currentPercent, currentPercent];
	const lastPct = displayPoints.at(-1) ?? currentPercent;
	const strokeColor = colorForPercent(lastPct);
	const polyStr = buildPolyline(displayPoints, width, height - 2, 3);

	if (displayPoints.length < 2 || !polyStr) return null;

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={`overflow-visible ${className}`}
			aria-label={`Usage trend: ${lastPct.toFixed(1)}%`}
			role="img"
		>
			<title>Usage trend sparkline</title>
			{/* Zero-line guide */}
			<line
				x1={0}
				y1={height - 1}
				x2={width}
				y2={height - 1}
				stroke="hsl(var(--muted-foreground))"
				strokeOpacity={0.15}
				strokeWidth={0.5}
			/>
			{/* Area fill under the line */}
			<defs>
				<linearGradient
					id={`spark-grad-${accountId}`}
					x1="0"
					y1="0"
					x2="0"
					y2="1"
				>
					<stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
					<stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
				</linearGradient>
			</defs>
			<polygon
				points={`3,${height - 1} ${polyStr} ${(width - 3).toFixed(1)},${height - 1}`}
				fill={`url(#spark-grad-${accountId})`}
			/>
			{/* Main line */}
			<polyline
				points={polyStr}
				fill="none"
				stroke={strokeColor}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{ transition: "stroke 0.4s" }}
			/>
			{/* Latest dot */}
			{(() => {
				const innerW = width - 3 * 2;
				const x = (
					3 +
					(displayPoints.length - 1) *
						(innerW / Math.max(1, displayPoints.length - 1))
				).toFixed(1);
				const y = pct2y(lastPct, height - 2).toFixed(1);
				return (
					<circle
						cx={x}
						cy={y}
						r={2.5}
						fill={strokeColor}
						stroke="hsl(var(--card))"
						strokeWidth={1.2}
					/>
				);
			})()}
		</svg>
	);
}
