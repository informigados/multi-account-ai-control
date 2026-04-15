"use client";

/**
 * Pagination — reusable page-based navigation bar.
 *
 * Works on top of cursor-based APIs by maintaining a cursor stack:
 *   - cursorStack[0] = null  (page 1)
 *   - cursorStack[1] = cursor returned by page 1 (page 2)
 *   - etc.
 *
 * Usage:
 *   const { page, cursorStack, goNext, goPrev, goToPage, resetPagination } = usePagination();
 *   // On data load: call pushCursor(nextCursor) after each page fetch.
 */

import { useCallback, useState } from "react";

// ─── Hook ──────────────────────────────────────────────────────────────────────

export type PaginationState = {
	/** 1-indexed current page */
	page: number;
	/** Cursor to use for the current fetch (null = first page) */
	currentCursor: string | null;
	/** Whether a previous page exists */
	hasPrev: boolean;
	/** Whether a next page exists (set after fetching) */
	hasNext: boolean;
	/** Go to next page. Call with the nextCursor returned by the API. */
	goNext: (nextCursor: string) => void;
	/** Go to previous page */
	goPrev: () => void;
	/** Jump to a specific page index (1-indexed). Only works for already-visited pages. */
	goToPage: (p: number) => void;
	/** Reset to page 1 */
	resetPagination: () => void;
	/** Total pages seen so far */
	totalPagesSeen: number;
};

export function usePagination(): PaginationState {
	// Stack of cursors. Index 0 = cursor for page 1 (always null).
	// Index N = cursor fetched at end of page N (to load page N+1).
	const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);

	const currentCursor = cursorStack[page - 1] ?? null;
	const hasPrev = page > 1;
	const totalPagesSeen = cursorStack.length;

	const goNext = useCallback(
		(nextCursor: string) => {
			setCursorStack((prev) => {
				const next = [...prev];
				// Only push if we haven't visited this page yet
				if (next.length <= page) {
					next.push(nextCursor);
				}
				return next;
			});
			setPage((p) => p + 1);
			setHasNext(false); // will be updated after next fetch
		},
		[page],
	);

	const goPrev = useCallback(() => {
		if (page > 1) {
			setPage((p) => p - 1);
			setHasNext(true);
		}
	}, [page]);

	const goToPage = useCallback(
		(p: number) => {
			if (p >= 1 && p <= cursorStack.length) {
				setPage(p);
			}
		},
		[cursorStack.length],
	);

	const resetPagination = useCallback(() => {
		setCursorStack([null]);
		setPage(1);
		setHasNext(false);
	}, []);

	return {
		page,
		currentCursor,
		hasPrev,
		hasNext,
		goNext,
		goPrev,
		goToPage,
		resetPagination,
		totalPagesSeen,
	};
}

// ─── Component ─────────────────────────────────────────────────────────────────

type PaginationBarProps = {
	page: number;
	hasPrev: boolean;
	hasNext: boolean;
	isLoading?: boolean;
	totalPagesSeen: number;
	onPrev: () => void;
	onNext: () => void;
	onGoToPage?: (p: number) => void;
	labelPrev?: string;
	labelNext?: string;
	labelPage?: string;
};

export function PaginationBar({
	page,
	hasPrev,
	hasNext,
	isLoading = false,
	totalPagesSeen,
	onPrev,
	onNext,
	onGoToPage,
	labelPrev = "Anterior",
	labelNext = "Próxima",
	labelPage = "Página",
}: PaginationBarProps) {
	const maxVisible = 7;
	const pages = Array.from({ length: totalPagesSeen }, (_, i) => i + 1);

	// Windowed page numbers around current page
	let visiblePages = pages;
	if (pages.length > maxVisible) {
		const half = Math.floor(maxVisible / 2);
		const start = Math.max(1, page - half);
		const end = Math.min(totalPagesSeen, start + maxVisible - 1);
		visiblePages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
	}

	return (
		<nav
			aria-label={`${labelPage} ${page}`}
			className="flex items-center justify-center gap-1 py-3"
		>
			{/* Previous */}
			<button
				type="button"
				onClick={onPrev}
				disabled={!hasPrev || isLoading}
				aria-label={labelPrev}
				className="flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
			>
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3 w-3"
					aria-hidden="true"
				>
					<path d="M10 4L6 8l4 4" />
				</svg>
				<span className="hidden sm:inline">{labelPrev}</span>
			</button>

			{/* First page + ellipsis */}
			{visiblePages[0] !== undefined && visiblePages[0] > 1 && (
				<>
					<PageButton p={1} current={page} onClick={onGoToPage} />
					{visiblePages[0] > 2 && (
						<span className="px-1 text-xs text-muted-foreground">…</span>
					)}
				</>
			)}

			{/* Visible page numbers */}
			{visiblePages.map((p) => (
				<PageButton key={p} p={p} current={page} onClick={onGoToPage} />
			))}

			{/* Last page + ellipsis */}
			{visiblePages.at(-1) !== undefined &&
				visiblePages.at(-1)! < totalPagesSeen && (
					<>
						{visiblePages.at(-1)! < totalPagesSeen - 1 && (
							<span className="px-1 text-xs text-muted-foreground">…</span>
						)}
						<PageButton
							p={totalPagesSeen}
							current={page}
							onClick={onGoToPage}
						/>
					</>
				)}

			{/* Next */}
			<button
				type="button"
				onClick={onNext}
				disabled={!hasNext || isLoading}
				aria-label={labelNext}
				className="flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
			>
				<span className="hidden sm:inline">{labelNext}</span>
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3 w-3"
					aria-hidden="true"
				>
					<path d="M6 4l4 4-4 4" />
				</svg>
			</button>
		</nav>
	);
}

function PageButton({
	p,
	current,
	onClick,
}: {
	p: number;
	current: number;
	onClick?: (p: number) => void;
}) {
	const isActive = p === current;
	return (
		<button
			type="button"
			onClick={() => onClick?.(p)}
			disabled={isActive || !onClick}
			aria-label={`Página ${p}`}
			aria-current={isActive ? "page" : undefined}
			className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition ${
				isActive
					? "border-primary bg-primary text-primary-foreground cursor-default"
					: "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
			}`}
		>
			{p}
		</button>
	);
}
