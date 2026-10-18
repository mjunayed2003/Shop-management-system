import { create } from 'zustand';

export interface PlanLimitInfo {
  limitType?: string;
  current?: number;
  max?: number;
  message?: string;
}

interface PlanLimitModalState {
  isOpen: boolean;
  limitInfo: PlanLimitInfo | null;
  openPlanLimitModal: (info?: PlanLimitInfo) => void;
  closePlanLimitModal: () => void;
}

export const usePlanLimitModalStore = create<PlanLimitModalState>((set) => ({
  isOpen: false,
  limitInfo: null,
  openPlanLimitModal: (info) => set({ isOpen: true, limitInfo: info || null }),
  closePlanLimitModal: () => set({ isOpen: false, limitInfo: null }),
}));
