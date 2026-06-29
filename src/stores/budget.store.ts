'use client'

import { create } from 'zustand'

interface BudgetState {
  staleAfter: string | null
  markStale: (fromMonth: string) => void
  clearStale: () => void
  isStale: (month: string) => boolean
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  staleAfter: null,
  markStale: (fromMonth) => {
    const current = get().staleAfter
    if (!current || fromMonth < current) {
      set({ staleAfter: fromMonth })
    }
  },
  clearStale: () => set({ staleAfter: null }),
  isStale: (month) => {
    const { staleAfter } = get()
    return staleAfter !== null && month >= staleAfter
  },
}))
