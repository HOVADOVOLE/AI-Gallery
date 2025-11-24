/**
 * Global state management for Multi-Select functionality.
 * Allows selecting images across different pages for batch operations.
 */

import { create } from 'zustand';

interface SelectionState {
  isSelectionMode: boolean;
  selectedIds: Set<number>; // Using Set for O(1) lookups
  
  toggleSelectionMode: () => void;
  toggleImageSelection: (id: number) => void;
  clearSelection: () => void;
  selectAll: (ids: number[]) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  isSelectionMode: false,
  selectedIds: new Set(),

  toggleSelectionMode: () => set((state) => {
    // If turning off, clear selection
    if (state.isSelectionMode) {
        return { isSelectionMode: false, selectedIds: new Set() };
    }
    return { isSelectionMode: true };
  }),

  toggleImageSelection: (id: number) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    
    // Auto-enable selection mode if not active
    const isModeActive = state.isSelectionMode || newSet.size > 0;
    
    return { selectedIds: newSet, isSelectionMode: isModeActive };
  }),

  clearSelection: () => set({ selectedIds: new Set(), isSelectionMode: false }),
  
  selectAll: (ids: number[]) => set({ selectedIds: new Set(ids), isSelectionMode: true }),
}));
