'use client'

import { create } from 'zustand'

interface RefreshState {
  transactionsVersion: number
  bumpTransactions: () => void
}

export const useRefreshStore = create<RefreshState>((set) => ({
  transactionsVersion: 0,
  bumpTransactions: () => set((s) => ({ transactionsVersion: s.transactionsVersion + 1 })),
}))
