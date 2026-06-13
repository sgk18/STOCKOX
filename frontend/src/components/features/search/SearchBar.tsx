"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, History, TrendingUp, Sparkles, X } from "lucide-react";
import { useAnalysisStore, StockDetails } from "@/lib/analysisStore";
import { useAuth } from "@clerk/nextjs";

interface SearchBarProps {
  onSelect: (stock: StockDetails) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const { getToken } = useAuth();
  const searchQuery = useAnalysisStore((state) => state.searchQuery);
  const setSearchQuery = useAnalysisStore((state) => state.setSearchQuery);
  const searchResults = useAnalysisStore((state) => state.searchResults);
  const setSearchResults = useAnalysisStore((state) => state.setSearchResults);
  const searchHistory = useAnalysisStore((state) => state.searchHistory);
  const loadSearchHistory = useAnalysisStore((state) => state.loadSearchHistory);
  const addToSearchHistory = useAnalysisStore((state) => state.addToSearchHistory);
  const clearSearchHistory = useAnalysisStore((state) => state.clearSearchHistory);

  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trendingStocks = [
    { ticker: "NVDA", name: "NVIDIA Corp.", score: 92 },
    { ticker: "AAPL", name: "Apple Inc.", score: 82 },
    { ticker: "TSLA", name: "Tesla Inc.", score: 64 },
    { ticker: "MSFT", name: "Microsoft Corp.", score: 88 },
    { ticker: "AMD", name: "Advanced Micro Devices", score: 71 },
  ];

  // Load search history from local storage on mount
  useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch autocompletion data on query change
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const token = await getToken();
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/v1/stocks/search?q=${encodeURIComponent(searchQuery)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Autocomplete failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, getToken, setSearchResults]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() === "") return;

    // If there is an exact autocomplete match or matching elements, choose the first
    if (searchResults.length > 0) {
      handleStockSelect(searchResults[0]);
    } else {
      // Fallback matching logic on query keyword if API didn't return (already matches natural language in Go)
      alert("No exact advisory stock matches. Try 'NVDA', 'AAPL', or 'TSLA'.");
    }
  };

  const handleStockSelect = (stock: StockDetails) => {
    addToSearchHistory(stock.ticker);
    onSelect(stock);
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
  };

  const handleTrendingClick = async (ticker: string) => {
    try {
      const token = await getToken();
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/stocks/${ticker}`, { headers });
      if (res.ok) {
        const data = await res.json();
        handleStockSelect(data);
      }
    } catch (err) {
      console.error("Failed to load details for " + ticker, err);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto z-40 select-none">
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Search stocks, companies, sectors, ETFs (e.g. 'Should I invest in NVIDIA?')..."
          className={`w-full bg-white border-4 border-black text-[#0F172A] font-black text-md md:text-lg placeholder:text-black/40 rounded-2xl py-4.5 pl-14 pr-12 shadow-[4px_4px_0px_#000000] focus:outline-none transition-all duration-200 ${
            isFocused ? "shadow-[6px_6px_0px_#000000] -translate-y-0.5" : ""
          }`}
        />
        <Search className="w-6 h-6 text-black absolute left-5 pointer-events-none" />
        
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="p-1 hover:bg-black/10 rounded-lg absolute right-4 transition-colors"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        )}
      </form>

      {/* Autocomplete & Suggestions Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000000] overflow-hidden z-50">
          
          {/* Autocomplete search results */}
          {isLoading && (
            <div className="p-4 text-center font-mono text-xs text-black/50 uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB] animate-spin" />
              <span>Consulting advisory index...</span>
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="border-b-3 border-black">
              <div className="p-3 bg-[#F8FAFC] border-b-2 border-black text-[10px] font-black uppercase text-black/40 tracking-wider">
                Advisory Matches
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((stock) => (
                  <button
                    key={stock.ticker}
                    type="button"
                    onClick={() => handleStockSelect(stock)}
                    className="w-full flex items-center justify-between px-5 py-3.5 border-b border-black/10 last:border-b-0 hover:bg-[#2563EB]/10 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm bg-black text-[#FACC15] px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_#000000]">
                        {stock.ticker}
                      </span>
                      <div>
                        <span className="font-extrabold text-[#0F172A] block text-sm leading-tight">
                          {stock.company_name}
                        </span>
                        <span className="text-[10px] font-bold text-black/40 uppercase">
                          {stock.sector} • {stock.industry}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm block">
                        ${stock.current_price.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase ${
                          stock.daily_change >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                        }`}
                      >
                        {stock.daily_change >= 0 ? "+" : ""}
                        {stock.daily_change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <div className="border-b-3 border-black">
              <div className="p-3 bg-[#F8FAFC] border-b-2 border-black text-[10px] font-black uppercase text-black/40 tracking-wider flex items-center justify-between">
                <span>Recent Advisory Lookups</span>
                <button
                  type="button"
                  onClick={clearSearchHistory}
                  className="text-[9px] hover:text-[#EF4444] transition-colors"
                >
                  Clear History
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5 p-4 bg-white">
                {searchHistory.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => handleTrendingClick(ticker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FACC15] rounded-xl text-xs font-black shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{ticker}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending & Suggestions */}
          <div>
            <div className="p-3 bg-[#F8FAFC] border-b-2 border-black text-[10px] font-black uppercase text-black/40 tracking-wider">
              Trending Advisory Coverage
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-white">
              {trendingStocks.map((stock) => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleTrendingClick(stock.ticker)}
                  className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-[#2563EB]/5 hover:-translate-y-0.5 rounded-xl text-left shadow-[2px_2px_0px_#000000] active:translate-y-0 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <span className="font-bold text-xs bg-black text-[#FACC15] px-1.5 py-0.5 rounded mr-1.5">
                        {stock.ticker}
                      </span>
                      <span className="font-extrabold text-xs text-[#0F172A]">{stock.name}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] px-1.5 py-0.5 rounded">
                    Score: {stock.score}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
