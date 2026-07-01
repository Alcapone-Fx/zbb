"use client";

import { create } from "zustand";

interface FeedbackStore {
  isOpen: boolean;
  screenshot: string | null;
  open: (screenshot: string | null) => void;
  close: () => void;
}

export const useFeedbackStore = create<FeedbackStore>()((set) => ({
  isOpen: false,
  screenshot: null,
  open: (screenshot) => set({ isOpen: true, screenshot }),
  close: () => set({ isOpen: false, screenshot: null }),
}));
