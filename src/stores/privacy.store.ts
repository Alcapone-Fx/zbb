"use client";

import { create } from "zustand";

interface PrivacyStore {
  hidden: boolean;
  toggle: () => void;
}

export const usePrivacyStore = create<PrivacyStore>()((set) => ({
  hidden: true,
  toggle: () => set((s) => ({ hidden: !s.hidden })),
}));
