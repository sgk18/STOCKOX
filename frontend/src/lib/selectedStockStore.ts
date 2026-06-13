import { create } from "zustand";

export interface CompanyProfile {
	name: string;
	ticker: string;
	logo: string;
	industry: string;
	sector: string;
	marketCap: number;
	website: string;
	description: string;
	ceo: string;
	employees: number;
	country: string;
	exchange: string;
	currentPrice: number;
	dailyChange: number;
	dailyChangePercent: number;
	fiftyTwoWHigh: number;
	fiftyTwoWLow: number;
	volume: number;
	avgVolume: number;
}

export interface FinancialMetrics {
	ticker: string;
	pe: number;
	eps: number;
	roe: number;
	revenue: number;
	revenueGrowth: number;
	profitMargin: number;
	debtRatio: number;
	currentRatio: number;
	cashFlow: number;
}

export interface Candle {
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	timestamp: number;
}

export interface CompanyNews {
	title: string;
	source: string;
	date: string;
	url: string;
	summary: string;
}

interface SelectedStockState {
	selectedStock: CompanyProfile | null;
	metrics: FinancialMetrics | null;
	history: Candle[];
	news: CompanyNews[];
	isLoadingStock: boolean;
	isLoadingMetrics: boolean;
	isLoadingHistory: boolean;
	isLoadingNews: boolean;
	error: string | null;

	// Actions
	setSelectedStock: (stock: CompanyProfile | null) => void;
	fetchStockDetails: (ticker: string, token: string | null) => Promise<void>;
	fetchMetrics: (ticker: string, token: string | null) => Promise<void>;
	fetchHistory: (ticker: string, token: string | null, resolution?: string) => Promise<void>;
	fetchNews: (ticker: string, token: string | null) => Promise<void>;
	clearSelectedStock: () => void;
}

export const useSelectedStockStore = create<SelectedStockState>((set) => ({
	selectedStock: null,
	metrics: null,
	history: [],
	news: [],
	isLoadingStock: false,
	isLoadingMetrics: false,
	isLoadingHistory: false,
	isLoadingNews: false,
	error: null,

	setSelectedStock: (stock) => set({ selectedStock: stock }),

	fetchStockDetails: async (ticker, token) => {
		set({ isLoadingStock: true, error: null });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const res = await fetch(`/api/v1/stocks/${ticker}`, { headers });
			if (res.ok) {
				const data = await res.json();
				set({ selectedStock: data, error: null });
			} else {
				set({ error: `Advisory ticker ${ticker} could not be resolved.` });
			}
		} catch (err) {
			set({ error: "Failed to connect to advisory index." });
		} finally {
			set({ isLoadingStock: false });
		}
	},

	fetchMetrics: async (ticker, token) => {
		set({ isLoadingMetrics: true });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const res = await fetch(`/api/v1/stocks/${ticker}/metrics`, { headers });
			if (res.ok) {
				const data = await res.json();
				set({ metrics: data });
			}
		} catch (err) {
			console.error("Failed to fetch financial metrics:", err);
		} finally {
			set({ isLoadingMetrics: false });
		}
	},

	fetchHistory: async (ticker, token, resolution = "D") => {
		set({ isLoadingHistory: true });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const res = await fetch(`/api/v1/stocks/${ticker}/history?resolution=${resolution}`, { headers });
			if (res.ok) {
				const data = await res.json();
				set({ history: data });
			}
		} catch (err) {
			console.error("Failed to fetch historical candles:", err);
		} finally {
			set({ isLoadingHistory: false });
		}
	},

	fetchNews: async (ticker, token) => {
		set({ isLoadingNews: true });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const res = await fetch(`/api/v1/stocks/${ticker}/news`, { headers });
			if (res.ok) {
				const data = await res.json();
				set({ news: data });
			}
		} catch (err) {
			console.error("Failed to fetch news feed:", err);
		} finally {
			set({ isLoadingNews: false });
		}
	},

	clearSelectedStock: () => set({ selectedStock: null, metrics: null, history: [], news: [], error: null }),
}));
