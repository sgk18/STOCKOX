import { create } from "zustand";

export interface SearchStockResult {
	ticker: string;
	name: string;
	exchange: string;
	industry: string;
	logo?: string;
	price?: number;
	marketCap?: number;
}

interface SearchState {
	searchQuery: string;
	searchResults: SearchStockResult[];
	searchHistory: string[];
	isLoadingSearch: boolean;

	// Actions
	setSearchQuery: (query: string) => void;
	setSearchResults: (results: SearchStockResult[]) => void;
	searchStocks: (query: string, token: string | null) => Promise<void>;
	loadSearchHistory: () => void;
	addToSearchHistory: (ticker: string) => void;
	clearSearchHistory: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
	searchQuery: "",
	searchResults: [],
	searchHistory: [],
	isLoadingSearch: false,

	setSearchQuery: (query) => set({ searchQuery: query }),
	setSearchResults: (results) => set({ searchResults: results }),

	searchStocks: async (query, token) => {
		if (query.trim() === "") {
			set({ searchResults: [] });
			return;
		}
		set({ isLoadingSearch: true });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const res = await fetch(`/api/v1/stocks/search?q=${encodeURIComponent(query)}`, { headers });
			if (res.ok) {
				const data = await res.json();
				set({ searchResults: data });
			}
		} catch (err) {
			console.error("Failed to run autocomplete search:", err);
		} finally {
			set({ isLoadingSearch: false });
		}
	},

	loadSearchHistory: () => {
		if (typeof window !== "undefined") {
			const hist = localStorage.getItem("stockox_market_search_history");
			if (hist) {
				try {
					set({ searchHistory: JSON.parse(hist) });
				} catch {
					set({ searchHistory: [] });
				}
			}
		}
	},

	addToSearchHistory: (ticker) => {
		const { searchHistory } = get();
		const filtered = searchHistory.filter((item) => item !== ticker);
		const newHistory = [ticker, ...filtered].slice(0, 5);
		if (typeof window !== "undefined") {
			localStorage.setItem("stockox_market_search_history", JSON.stringify(newHistory));
		}
		set({ searchHistory: newHistory });
	},

	clearSearchHistory: () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem("stockox_market_search_history");
		}
		set({ searchHistory: [] });
	},
}));
