import { create } from "zustand";

export interface MarketIndex {
	name: string;
	value: number;
	changePercent: number;
}

interface MarketState {
	indices: MarketIndex[];
	isLoadingIndices: boolean;
	setIndices: (indices: MarketIndex[]) => void;
	fetchIndices: (token: string | null) => Promise<void>;
}

export const useMarketStore = create<MarketState>((set) => ({
	indices: [
		{ name: "S&P 500", value: 5431.60, changePercent: 0.85 },
		{ name: "NASDAQ", value: 16920.45, changePercent: 1.42 },
		{ name: "NIFTY 50", value: 23501.10, changePercent: 0.55 },
		{ name: "Gold", value: 2320.15, changePercent: -0.32 },
		{ name: "Bitcoin", value: 67450.00, changePercent: 3.84 },
	],
	isLoadingIndices: false,
	setIndices: (indices) => set({ indices }),
	fetchIndices: async (token) => {
		set({ isLoadingIndices: true });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const res = await fetch("/api/market-overview", { headers });
			if (res.ok) {
				const data = await res.json();
				set({
					indices: data.map((item: any) => ({
						name: item.name || item.symbol,
						value: item.price || item.value || 0,
						changePercent: item.change_percent || item.changePercent || 0,
					})),
				});
			}
		} catch (err) {
			console.error("Failed to fetch market indices:", err);
		} finally {
			set({ isLoadingIndices: false });
		}
	},
}));
