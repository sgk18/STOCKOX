"use client";

import React, { useEffect, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

// Decentralized Stores
import { useSearchStore, SearchStockResult } from "@/lib/searchStore";
import { useSelectedStockStore } from "@/lib/selectedStockStore";
import { useWatchlistStore } from "@/lib/watchlistStore";
import { useAnalysisStore } from "@/lib/analysisStore";

// Components
import Navbar from "@/components/dashboard/Navbar";
import SearchBar from "@/components/features/search/SearchBar";
import SearchResults from "@/components/features/search/SearchResults";
import CompanyMetrics from "@/components/features/analysis/CompanyMetrics";
import WatchlistButton from "@/components/features/watchlist/WatchlistButton";
import LightweightChart from "@/components/features/analysis/LightweightChart";

import Button from "@/components/ui/Button";
import { Bot, Compass, AlertCircle, ArrowUpRight, ArrowDownRight, Newspaper, Calendar, Globe } from "lucide-react";

function AnalysisWorkspaceContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get("ticker");

  // Search Store state
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);
  const searchResults = useSearchStore((state) => state.searchResults);
  const setSearchResults = useSearchStore((state) => state.setSearchResults);
  const addToSearchHistory = useSearchStore((state) => state.addToSearchHistory);

  // Selected Stock Store state
  const selectedStock = useSelectedStockStore((state) => state.selectedStock);
  const metrics = useSelectedStockStore((state) => state.metrics);
  const history = useSelectedStockStore((state) => state.history);
  const news = useSelectedStockStore((state) => state.news);
  const isLoadingStock = useSelectedStockStore((state) => state.isLoadingStock);
  const errorText = useSelectedStockStore((state) => state.error);
  const fetchStockDetails = useSelectedStockStore((state) => state.fetchStockDetails);
  const fetchMetrics = useSelectedStockStore((state) => state.fetchMetrics);
  const fetchHistory = useSelectedStockStore((state) => state.fetchHistory);
  const fetchNews = useSelectedStockStore((state) => state.fetchNews);
  const clearSelectedStock = useSelectedStockStore((state) => state.clearSelectedStock);

  // Watchlist Store
  const fetchWatchlist = useWatchlistStore((state) => state.fetchWatchlist);

  // Analysis Store
  const agents = useAnalysisStore((state) => state.agents);
  const isAnalyzing = useAnalysisStore((state) => state.isAnalyzing);
  const runAnalysis = useAnalysisStore((state) => state.runAnalysis);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch watchlist from API on mount
  useEffect(() => {
    if (isSignedIn) {
      getToken().then((token) => {
        fetchWatchlist(token);
      });
    }
  }, [isSignedIn, getToken, fetchWatchlist]);

  // Sync details / metrics / charts / news on ticker param change
  useEffect(() => {
    async function loadData() {
      if (!tickerParam) {
        clearSelectedStock();
        return;
      }
      const ticker = tickerParam.toUpperCase();
      const token = await getToken();
      
      // Parallel fetches for real-time market provider
      await Promise.all([
        fetchStockDetails(ticker, token),
        fetchMetrics(ticker, token),
        fetchHistory(ticker, token, "D"),
        fetchNews(ticker, token)
      ]);
    }
    loadData();
  }, [tickerParam, getToken, fetchStockDetails, fetchMetrics, fetchHistory, fetchNews, clearSelectedStock]);

  const handleStockSelect = (stock: SearchStockResult) => {
    addToSearchHistory(stock.ticker);
    setSearchQuery("");
    setSearchResults([]);
    router.push(`/dashboard/analysis?ticker=${stock.ticker}`);
  };

  const handleRunAnalysis = async () => {
    if (!selectedStock) return;
    await runAnalysis(selectedStock.ticker);
  };

  const formatLargeNumber = (num: number) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    return num.toLocaleString();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-black/50">
            Consulting Terminal...
          </span>
        </div>
      </div>
    );
  }

  const isPositive = selectedStock ? selectedStock.dailyChange >= 0 : true;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 flex flex-col font-sans text-[#0F172A]">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-6 flex flex-col gap-8 mt-8">
        
        {/* Search Section */}
        <section className="bg-white border-4 border-black p-8 rounded-2xl shadow-[6px_6px_0px_#000000] text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black mb-2 flex items-center justify-center gap-2">
            <Compass className="w-8 h-8 text-[#2563EB]" />
            <span>AI Committee Advisory Workspace</span>
          </h2>
          <p className="text-xs font-bold text-black/50 uppercase tracking-wider mb-6">
            Federated Real-Time Financial API Workspace & Agent Core
          </p>

          <SearchBar onSelect={handleStockSelect} />
        </section>

        {/* Error State */}
        {errorText && (
          <div className="bg-[#EF4444]/15 border-4 border-black p-4 rounded-xl flex items-center gap-3 text-[#EF4444] font-black text-sm max-w-lg mx-auto w-full">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Search Autocomplete Results Board */}
        {!selectedStock && searchResults.length > 0 && (
          <SearchResults results={searchResults} onAnalyze={handleStockSelect} />
        )}

        {/* Selected Stock details and Workspace */}
        {selectedStock && !isLoadingStock && (
          <div className="flex flex-col gap-8 animate-fadeIn">
            
            {/* Company Header Card */}
            <section className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-[8px_8px_0px_#000000] transition-shadow duration-200">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#2563EB] border-4 border-black rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-[3px_3px_0px_#000000]">
                  {selectedStock.ticker.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                      {selectedStock.name}
                    </h3>
                    <span className="font-mono font-bold text-xs bg-black text-[#FACC15] px-2 py-0.5 rounded border-2 border-black shadow-[2px_2px_0px_#000000]">
                      {selectedStock.ticker}
                    </span>
                  </div>
                  
                  {/* Exchange & Web link */}
                  <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] font-black uppercase text-black/50 tracking-wider">
                    <span>{selectedStock.exchange}</span>
                    <span>•</span>
                    <span>{selectedStock.industry}</span>
                    {selectedStock.website && (
                      <>
                        <span>•</span>
                        <a href={selectedStock.website} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline flex items-center gap-0.5 lowercase font-sans font-bold">
                          <Globe className="w-3.5 h-3.5" />
                          <span>visit</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Details */}
              <div className="flex flex-wrap items-center gap-4 md:text-right">
                <div className="flex flex-col md:items-end font-mono">
                  <span className="text-2xl md:text-3xl font-black tracking-tight text-[#0F172A]">
                    ${selectedStock.currentPrice ? selectedStock.currentPrice.toFixed(2) : "N/A"}
                  </span>
                  
                  {selectedStock.dailyChangePercent !== undefined && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-black uppercase mt-1 px-2.5 py-0.5 border-2 border-black shadow-[1.5px_1.5px_0px_#000000] rounded-lg ${
                        isPositive
                          ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30"
                          : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {isPositive ? "+" : ""}
                      {selectedStock.dailyChangePercent.toFixed(2)}%
                    </span>
                  )}
                </div>

                <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#000000] flex flex-col items-center min-w-[70px]">
                  <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">
                    Cap
                  </span>
                  <span className="text-xs font-black text-[#2563EB]">
                    {formatLargeNumber(selectedStock.marketCap)}
                  </span>
                </div>

                <WatchlistButton ticker={selectedStock.ticker} companyName={selectedStock.name} />
              </div>
            </section>

            {/* Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
              
              {/* Left Column: Metrics & Business Profile */}
              <div className="flex flex-col gap-6">
                <CompanyMetrics profile={selectedStock} metrics={metrics} />
              </div>

              {/* Right Column: Chart, News & AI Agent Placeholders */}
              <div className="flex flex-col gap-6">
                
                {/* Candlestick TradingView Chart */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4">
                    Price History (TradingView Charts)
                  </h4>
                  {history.length === 0 ? (
                    <div className="h-60 flex items-center justify-center text-xs font-mono text-black/30 uppercase tracking-wider">
                      Loading stock timeline...
                    </div>
                  ) : (
                    <LightweightChart data={history} />
                  )}
                </div>

                {/* AI Agents Placeholder Board */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000] font-sans">
                  <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                      <Bot className="w-5 h-5 text-[#2563EB]" />
                      <span>Investment Committee Room</span>
                    </h4>
                    <span className="bg-[#EF4444]/10 text-[#EF4444] text-[8px] font-black uppercase px-2 py-0.5 rounded border border-[#EF4444]/30 shadow-[1px_1px_0px_#000000]">
                      Inactive
                    </span>
                  </div>

                  <div className="flex flex-col gap-3.5 font-mono">
                    {agents.map((agent) => (
                      <div
                        key={agent.name}
                        className="bg-[#F8FAFC] border-2 border-black p-3.5 rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#000000] opacity-80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-black/5 border border-black rounded-lg text-black/50 font-black text-xs flex items-center justify-center">
                            {agent.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs block text-[#0F172A]">
                              {agent.name}
                            </span>
                            <span className="text-[9px] text-black/45 block">
                              {agent.message}
                            </span>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase bg-black/5 px-2 py-0.5 rounded border border-black/10 text-black/45">
                          {agent.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <Button
                      variant="primary"
                      onClick={handleRunAnalysis}
                      isLoading={isAnalyzing}
                      className="w-full text-xs font-black uppercase border-2 shadow-[2px_2px_0px_#000000] py-3.5 cursor-pointer"
                    >
                      Audit Session Placeholder
                    </Button>
                  </div>
                </div>

                {/* News Feed Stream */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4 flex items-center gap-2">
                    <Newspaper className="w-4.5 h-4.5 text-black" />
                    <span>Real-Time Market News</span>
                  </h4>

                  {news.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-black/30 uppercase tracking-wider">
                      No recent news articles detected.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
                      {news.map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#F8FAFC] border-2 border-black p-4 rounded-xl shadow-[2px_2px_0px_#000000] hover:shadow-[3.5px_3.5px_0px_#000000] hover:-translate-y-0.5 transition-all block text-left"
                        >
                          <h5 className="font-extrabold text-xs md:text-sm text-[#0F172A] leading-tight mb-2 hover:text-[#2563EB]">
                            {item.title}
                          </h5>
                          <p className="text-[10px] font-bold text-black/60 line-clamp-2 leading-relaxed mb-3">
                            {item.summary}
                          </p>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase text-black/40 font-mono tracking-wider">
                            <span className="bg-black/5 px-1.5 py-0.5 rounded border border-black/5">
                              {item.source}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{item.date}</span>
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default function AnalysisWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-black/50">
            Connecting Real-Time Data Feeds...
          </span>
        </div>
      </div>
    }>
      <AnalysisWorkspaceContent />
    </Suspense>
  );
}
