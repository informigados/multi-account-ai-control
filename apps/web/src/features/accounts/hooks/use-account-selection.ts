"use client";

import { useCallback, useState } from "react";

export type AccountSelectionState = {
	selectedIds: Set<string>;
	isSelected: (id: string) => boolean;
	toggle: (id: string) => void;
	selectAll: (ids: string[]) => void;
	clearAll: () => void;
	hasSelection: boolean;
	count: number;
};

export function useAccountSelection(): AccountSelectionState {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const isSelected = useCallback(
		(id: string) => selectedIds.has(id),
		[selectedIds],
	);

	const toggle = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const selectAll = useCallback((ids: string[]) => {
		setSelectedIds(new Set(ids));
	}, []);

	const clearAll = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	return {
		selectedIds,
		isSelected,
		toggle,
		selectAll,
		clearAll,
		hasSelection: selectedIds.size > 0,
		count: selectedIds.size,
	};
}
