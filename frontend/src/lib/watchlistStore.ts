import { create } from "zustand";

export interface WatchlistRecord {
	ticker: string;
	company_name: string;
}

interface WatchlistState {
	watchlist: WatchlistRecord[];
	isLoadingWatchlist: boolean;

	// Actions
	fetchWatchlist: (token: string | null) => Promise<void>;
	toggleWatchlistItem: (ticker: string, companyName: string, token: string | null) => Promise<void>;
	setWatchlist: (items: WatchlistRecord[]) => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
	watchlist: [],
	isLoadingWatchlist: false,

	setWatchlist: (items) => set({ watchlist: items }),

	fetchWatchlist: async (token) => {
		set({ isLoadingWatchlist: true });
		try {
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;

			const res = await fetch("/api/v1/watchlist", { headers });
			if (res.ok) {
				const data = await res.json();
				set({
					watchlist: data.map((item: any) => ({
						ticker: item.Ticker || item.ticker,
						company_name: item.CompanyName || item.company_name,
					})),
				});
			}
		} catch (err) {
			console.error("Failed to load watchlist details:", err);
		} finally {
			set({ isLoadingWatchlist: false });
		}
	},

	toggleWatchlistItem: async (ticker, companyName, token) => {
		const { watchlist } = get();
		const isWatchlisted = watchlist.some((w) => w.ticker === ticker);
		const headers: HeadersInit = { "Content-Type": "application/json" };
		if (token) headers["Authorization"] = `Bearer ${token}`;

		if (isWatchlisted) {
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
			try {
				const res = await fetch("/api/v1/watchlist", {
					method: "POST",
					headers,
					body: JSON.stringify({ ticker, company_name: companyName }),
				});
				if (res.ok) {
					const data = await res.json();
					set({
						watchlist: [...watchlist, {
							ticker: data.ticker || data.Ticker,
							company_name: data.company_name || data.CompanyName || companyName,
						}],
					});
				}
			} catch (err) {
				console.error("Failed to add watchlist item:", err);
			}
		}
	},
}));
