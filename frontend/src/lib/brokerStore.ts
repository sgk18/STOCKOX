import { create } from "zustand";
import type { BrokerAccount, Holding, BrokerInsight, AccountHealth } from "./brokerApi";

interface BrokerState {
  connectedAccounts: BrokerAccount[];
  holdings: Record<string, Holding[]>;
  insights: Record<string, BrokerInsight[]>;
  health: Record<string, AccountHealth>;
  syncStatuses: Record<string, "idle" | "syncing" | "error">;
  isLoading: boolean;
  lastFetchedAt: number | null;

  setAccounts: (accounts: BrokerAccount[]) => void;
  setHoldings: (accountId: string, holdings: Holding[]) => void;
  setInsights: (accountId: string, insights: BrokerInsight[]) => void;
  setHealth: (accountId: string, health: AccountHealth) => void;
  setSyncStatus: (accountId: string, status: "idle" | "syncing" | "error") => void;
  setLoading: (loading: boolean) => void;
  removeAccount: (accountId: string) => void;
  addAccount: (account: BrokerAccount) => void;
  updateAccount: (accountId: string, updates: Partial<BrokerAccount>) => void;
}

export const useBrokerStore = create<BrokerState>((set) => ({
  connectedAccounts: [],
  holdings: {},
  insights: {},
  health: {},
  syncStatuses: {},
  isLoading: false,
  lastFetchedAt: null,

  setAccounts: (accounts) => set({ connectedAccounts: accounts, lastFetchedAt: Date.now() }),

  setHoldings: (accountId, holdings) =>
    set((state) => ({ holdings: { ...state.holdings, [accountId]: holdings } })),

  setInsights: (accountId, insights) =>
    set((state) => ({ insights: { ...state.insights, [accountId]: insights } })),

  setHealth: (accountId, health) =>
    set((state) => ({ health: { ...state.health, [accountId]: health } })),

  setSyncStatus: (accountId, status) =>
    set((state) => ({ syncStatuses: { ...state.syncStatuses, [accountId]: status } })),

  setLoading: (isLoading) => set({ isLoading }),

  removeAccount: (accountId) =>
    set((state) => {
      const accounts = state.connectedAccounts.filter((a) => a.id !== accountId);
      const holdings = { ...state.holdings };
      const insights = { ...state.insights };
      const health = { ...state.health };
      const syncStatuses = { ...state.syncStatuses };
      delete holdings[accountId];
      delete insights[accountId];
      delete health[accountId];
      delete syncStatuses[accountId];
      return { connectedAccounts: accounts, holdings, insights, health, syncStatuses };
    }),

  addAccount: (account) =>
    set((state) => ({ connectedAccounts: [...state.connectedAccounts, account] })),

  updateAccount: (accountId, updates) =>
    set((state) => ({
      connectedAccounts: state.connectedAccounts.map((a) =>
        a.id === accountId ? { ...a, ...updates } : a
      ),
    })),
}));
