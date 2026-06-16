/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface AnalysisSessionInfo {
  id: string;
  ticker: string;
  companyName: string;
  recommendation: string;
  confidenceScore: number;
  riskLevel: string;
  summary: string;
  progressPercent: number;
}

interface AnalysisState {
  currentSession: AnalysisSessionInfo | null;
  isAnalyzing: boolean;
  analysisFinished: boolean;
  error: string | null;
  runAnalysis: (ticker: string, token: string | null) => Promise<string | null>;
  fetchSessionStatus: (sessionId: string, token: string | null) => Promise<void>;
  resetAnalysis: () => void;
  setSessionProgress: (progress: number) => void;
  setSessionRecommendation: (rec: string, conf: number, risk: string, summary: string) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentSession: null,
  isAnalyzing: false,
  analysisFinished: false,
  error: null,

  runAnalysis: async (ticker, token) => {
    set({ isAnalyzing: true, analysisFinished: false, error: null });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/api/v1/analysis/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start AI committee analysis");
      }

      const data = await response.json();
      const sessionInfo: AnalysisSessionInfo = {
        id: data.session_id,
        ticker: data.ticker,
        companyName: data.company_name,
        recommendation: "HOLD",
        confidenceScore: 0,
        riskLevel: "MEDIUM",
        summary: "Initiating live advisory committee audit...",
        progressPercent: 0,
      };

      set({ currentSession: sessionInfo });
      return data.session_id;
    } catch (err: any) {
      console.error("[ANALYSIS-STORE-ERR]", err);
      set({ isAnalyzing: false, error: err.message || "Connection failed" });
      return null;
    }
  },

  fetchSessionStatus: async (sessionId, token) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/api/v1/analysis/${sessionId}/status`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to load session status");
      }

      const data = await response.json();
      set((state) => {
        if (!state.currentSession) return state;
        return {
          currentSession: {
            ...state.currentSession,
            recommendation: data.recommendation,
            confidenceScore: data.confidence_score,
            riskLevel: data.risk_level,
            summary: data.status,
            progressPercent: data.progress_percent,
          },
          analysisFinished: data.progress_percent >= 100,
          isAnalyzing: data.progress_percent < 100,
        };
      });
    } catch (err) {
      console.error("[ANALYSIS-STORE-ERR] Error loading session status:", err);
    }
  },

  setSessionProgress: (progress) => set((state) => {
    if (!state.currentSession) return state;
    return {
      currentSession: {
        ...state.currentSession,
        progressPercent: progress,
      },
      analysisFinished: progress >= 100,
      isAnalyzing: progress < 100,
    };
  }),

  setSessionRecommendation: (rec, conf, risk, summary) => set((state) => {
    if (!state.currentSession) return state;
    return {
      currentSession: {
        ...state.currentSession,
        recommendation: rec,
        confidenceScore: conf,
        riskLevel: risk,
        summary: summary,
      },
    };
  }),

  resetAnalysis: () => set({
    currentSession: null,
    isAnalyzing: false,
    analysisFinished: false,
    error: null,
  }),
}));
