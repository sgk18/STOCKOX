import { create } from "zustand";

// Types
export interface User {
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface Portfolio {
  value: number;
  changePercent: number;
  changeAmount: number;
  history: { date: string; value: number }[];
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  aiScore: number;
  risk: "Low" | "Medium" | "High";
  recommendation: "BUY" | "SELL" | "HOLD";
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "Idle" | "Thinking" | "Researching" | "Complete" | "Fetching News" | "Monitoring";
  activity: string;
}

export interface MarketOverview {
  name: string;
  value: number;
  changePercent: number;
  history: { time: string; value: number }[];
}

interface DashboardState {
  user: User;
  portfolio: Portfolio;
  watchlist: WatchlistItem[];
  agents: Agent[];
  market: MarketOverview[];
  
  // Actions
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (ticker: string) => void;
  updateAgentStatus: (id: string, status: Agent["status"], activity: string) => void;
  updatePortfolioValue: (value: number, changePercent: number) => void;
  updateMarketPrice: (name: string, value: number, changePercent: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  user: {
    name: "Surya",
    email: "suryachalam.vm@bsccmh.christuniversity.in",
    avatar: "S",
    role: "Lead Investment Advisor",
  },
  portfolio: {
    value: 125400,
    changePercent: 4.21,
    changeAmount: 5062,
    history: [
      { date: "Mon", value: 121000 },
      { date: "Tue", value: 122400 },
      { date: "Wed", value: 121800 },
      { date: "Thu", value: 123900 },
      { date: "Fri", value: 125400 },
    ],
  },
  watchlist: [
    { ticker: "NVDA", name: "NVIDIA Corp.", price: 187.20, changePercent: 4.20, aiScore: 92, risk: "Low", recommendation: "BUY" },
    { ticker: "AAPL", name: "Apple Inc.", price: 178.45, changePercent: 1.15, aiScore: 82, risk: "Low", recommendation: "BUY" },
    { ticker: "TSLA", name: "Tesla Inc.", price: 210.80, changePercent: -2.40, aiScore: 64, risk: "High", recommendation: "HOLD" },
    { ticker: "MSFT", name: "Microsoft Corp.", price: 415.50, changePercent: 0.85, aiScore: 88, risk: "Low", recommendation: "BUY" },
    { ticker: "AMD", name: "Advanced Micro Devices", price: 162.30, changePercent: -1.95, aiScore: 71, risk: "Medium", recommendation: "HOLD" },
  ],
  agents: [
    { id: "research", name: "Research Agent", role: "Fundamental Valuation", status: "Researching", activity: "Analyzing NVDA earnings report" },
    { id: "news", name: "News Agent", role: "Sentiment & Macro", status: "Fetching News", activity: "Scanning macro policy feeds" },
    { id: "technical", name: "Technical Agent", role: "Pattern Recognition", status: "Thinking", activity: "Testing support lines on TSLA" },
    { id: "risk", name: "Risk Agent", role: "Risk Management & VaR", status: "Monitoring", activity: "Evaluating asset weights allocation" },
    { id: "committee", name: "Committee Agent", role: "Consensus Engine", status: "Idle", activity: "Awaiting consensus triggers" },
  ],
  market: [
    {
      name: "S&P 500",
      value: 5431.60,
      changePercent: 0.85,
      history: [
        { time: "10:00", value: 5390 },
        { time: "11:00", value: 5410 },
        { time: "12:00", value: 5405 },
        { time: "13:00", value: 5420 },
        { time: "14:00", value: 5431 },
      ],
    },
    {
      name: "NASDAQ",
      value: 16920.45,
      changePercent: 1.42,
      history: [
        { time: "10:00", value: 16700 },
        { time: "11:00", value: 16810 },
        { time: "12:00", value: 16790 },
        { time: "13:00", value: 16870 },
        { time: "14:00", value: 16920 },
      ],
    },
    {
      name: "NIFTY 50",
      value: 23501.10,
      changePercent: 0.55,
      history: [
        { time: "10:00", value: 23380 },
        { time: "11:00", value: 23420 },
        { time: "12:00", value: 23450 },
        { time: "13:00", value: 23480 },
        { time: "14:00", value: 23501 },
      ],
    },
    {
      name: "Gold",
      value: 2320.15,
      changePercent: -0.32,
      history: [
        { time: "10:00", value: 2330 },
        { time: "11:00", value: 2325 },
        { time: "12:00", value: 2322 },
        { time: "13:00", value: 2318 },
        { time: "14:00", value: 2320 },
      ],
    },
    {
      name: "Bitcoin",
      value: 67450.00,
      changePercent: 3.84,
      history: [
        { time: "10:00", value: 65100 },
        { time: "11:00", value: 66200 },
        { time: "12:00", value: 65900 },
        { time: "13:00", value: 66800 },
        { time: "14:00", value: 67450 },
      ],
    },
  ],
  
  addToWatchlist: (item) =>
    set((state) => {
      if (state.watchlist.some((w) => w.ticker === item.ticker)) return state;
      return { watchlist: [...state.watchlist, item] };
    }),
    
  removeFromWatchlist: (ticker) =>
    set((state) => ({
      watchlist: state.watchlist.filter((w) => w.ticker !== ticker),
    })),
    
  updateAgentStatus: (id, status, activity) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status, activity } : agent
      ),
    })),
    
  updatePortfolioValue: (value, changePercent) =>
    set((state) => {
      const diff = value - state.portfolio.value;
      return {
        portfolio: {
          ...state.portfolio,
          value,
          changePercent,
          changeAmount: state.portfolio.changeAmount + diff,
        },
      };
    }),

  updateMarketPrice: (name, value, changePercent) =>
    set((state) => ({
      market: state.market.map((m) =>
        m.name === name
          ? {
              ...m,
              value,
              changePercent,
              history: [...m.history.slice(1), { time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), value }],
            }
          : m
      ),
    })),
  }));
