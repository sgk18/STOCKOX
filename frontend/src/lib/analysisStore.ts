import { create } from "zustand";

export interface StockDetails {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;
  market_cap: string;
  current_price: number;
  daily_change: number;
  daily_change_pct: number;
  volume: string;
  fifty_two_w_high: number;
  fifty_two_w_low: number;
  pe_ratio: number;
  eps: number;
  revenue: string;
  debt_ratio: number;
  ai_score: number;
  recommendation: string;
  logo: string;
  overview: string;
}

export interface AnalysisSessionState {
  id: string | null;
  ticker: string | null;
  status: "idle" | "thinking" | "analyzing" | "completed" | "error";
  recommendation: "BUY" | "SELL" | "HOLD" | null;
  confidenceScore: number;
  targetPrice: number;
  riskLevel: string | null;
  summary: string | null;
}

export interface AgentTimelineMessage {
  id: string;
  agentName: string;
  message: string;
  type: string;
  timestamp: string;
}

export interface LocalWatchlistItem {
  ticker: string;
  company_name: string;
}

interface AnalysisStoreState {
  selectedStock: StockDetails | null;
  searchQuery: string;
  searchResults: StockDetails[];
  searchHistory: string[];
  watchlist: LocalWatchlistItem[];
  analysisSession: AnalysisSessionState;
  agentStates: Record<string, "idle" | "thinking" | "analyzing" | "completed">;
  timelineMessages: AgentTimelineMessage[];
  isLoadingStock: boolean;
  isAnalyzing: boolean;

  // Actions
  setSelectedStock: (stock: StockDetails | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: StockDetails[]) => void;
  loadSearchHistory: () => void;
  addToSearchHistory: (ticker: string) => void;
  clearSearchHistory: () => void;
  setWatchlist: (items: LocalWatchlistItem[]) => void;
  toggleWatchlistItem: (ticker: string, companyName?: string, token?: string | null) => Promise<void>;
  startAnalysis: (ticker: string, token: string | null) => Promise<string | null>;
  addTimelineMessage: (msg: AgentTimelineMessage) => void;
  updateAgentState: (agentId: string, state: "idle" | "thinking" | "analyzing" | "completed") => void;
  completeAnalysis: (recommendation: "BUY" | "SELL" | "HOLD", confidence: number, risk: string, targetPrice?: number) => void;
  resetWorkspace: () => void;
}

const initialSessionState: AnalysisSessionState = {
  id: null,
  ticker: null,
  status: "idle",
  recommendation: null,
  confidenceScore: 0,
  targetPrice: 0,
  riskLevel: null,
  summary: null,
};

const initialAgentStates = {
  research: "idle" as const,
  news: "idle" as const,
  fundamental: "idle" as const,
  technical: "idle" as const,
  risk: "idle" as const,
  committee: "idle" as const,
};

export const useAnalysisStore = create<AnalysisStoreState>((set, get) => ({
  selectedStock: null,
  searchQuery: "",
  searchResults: [],
  searchHistory: [],
  watchlist: [],
  analysisSession: initialSessionState,
  agentStates: initialAgentStates,
  timelineMessages: [],
  isLoadingStock: false,
  isAnalyzing: false,

  setSelectedStock: (stock) => set({ selectedStock: stock }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),

  loadSearchHistory: () => {
    if (typeof window !== "undefined") {
      const history = localStorage.getItem("stockox_search_history");
      if (history) {
        try {
          set({ searchHistory: JSON.parse(history) });
        } catch {
          set({ searchHistory: [] });
        }
      }
    }
  },

  addToSearchHistory: (ticker) => {
    set((state) => {
      const filtered = state.searchHistory.filter((t) => t !== ticker);
      const newHistory = [ticker, ...filtered].slice(0, 5);
      if (typeof window !== "undefined") {
        localStorage.setItem("stockox_search_history", JSON.stringify(newHistory));
      }
      return { searchHistory: newHistory };
    });
  },

  clearSearchHistory: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stockox_search_history");
    }
    set({ searchHistory: [] });
  },

  setWatchlist: (items) => set({ watchlist: items }),

  toggleWatchlistItem: async (ticker, companyName = "", token = null) => {
    const { watchlist } = get();
    const isWatchlisted = watchlist.some((w) => w.ticker === ticker);
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (isWatchlisted) {
      // DELETE
      try {
        const res = await fetch(`/api/v1/watchlist/${ticker}`, {
          method: "DELETE",
          headers,
        });
        if (res.ok) {
          set({ watchlist: watchlist.filter((w) => w.ticker !== ticker) });
        }
      } catch (err) {
        console.error("Failed to remove watchlist item:", err);
      }
    } else {
      // POST
      try {
        const res = await fetch("/api/v1/watchlist", {
          method: "POST",
          headers,
          body: JSON.stringify({ ticker, company_name: companyName }),
        });
        if (res.ok) {
          const newItem = await res.json();
          set({ watchlist: [...watchlist, { ticker: newItem.ticker, company_name: newItem.company_name }] });
        }
      } catch (err) {
        console.error("Failed to add watchlist item:", err);
      }
    }
  },

  startAnalysis: async (ticker, token) => {
    set({
      isAnalyzing: true,
      timelineMessages: [],
      agentStates: initialAgentStates,
      analysisSession: {
        ...initialSessionState,
        ticker,
        status: "thinking",
      },
    });

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch("/api/v1/analysis/start", {
        method: "POST",
        headers,
        body: JSON.stringify({ ticker }),
      });

      if (!res.ok) {
        set({
          isAnalyzing: false,
          analysisSession: {
            ...get().analysisSession,
            status: "error",
            summary: "Failed to initialize investment committee connection.",
          },
        });
        return null;
      }

      const data = await res.json();
      set({
        analysisSession: {
          ...get().analysisSession,
          id: data.session_id,
          status: "analyzing",
        },
      });

      return data.session_id;
    } catch (err) {
      set({
        isAnalyzing: false,
        analysisSession: {
          ...get().analysisSession,
          status: "error",
          summary: "Network error occurred while connecting to investment committee.",
        },
      });
      return null;
    }
  },

  addTimelineMessage: (msg) => {
    set((state) => ({
      timelineMessages: [...state.timelineMessages, msg],
    }));
  },

  updateAgentState: (agentId, state) => {
    set((stateObj) => ({
      agentStates: {
        ...stateObj.agentStates,
        [agentId]: state,
      },
    }));
  },

  completeAnalysis: (recommendation, confidence, risk, targetPrice = 0) => {
    set((state) => ({
      isAnalyzing: false,
      analysisSession: {
        ...state.analysisSession,
        status: "completed",
        recommendation,
        confidenceScore: confidence,
        riskLevel: risk,
        targetPrice,
        summary: `The Investment Committee consensus review for ${state.analysisSession.ticker} is complete. Final consensus score is ${confidence}% with a general rating of ${recommendation}. Standard technical overlays and sentiment indicators confirm risk metrics align within ${risk.toLowerCase()} variance bounds.`,
      },
      agentStates: {
        research: "completed" as const,
        news: "completed" as const,
        fundamental: "completed" as const,
        technical: "completed" as const,
        risk: "completed" as const,
        committee: "completed" as const,
      },
    }));
  },

  resetWorkspace: () => {
    set({
      selectedStock: null,
      searchQuery: "",
      searchResults: [],
      analysisSession: initialSessionState,
      agentStates: initialAgentStates,
      timelineMessages: [],
      isAnalyzing: false,
    });
  },
}));
