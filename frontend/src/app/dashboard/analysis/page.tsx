"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useAnalysisStore, StockDetails } from "@/lib/analysisStore";
import Navbar from "@/components/dashboard/Navbar";
import SearchBar from "@/components/features/search/SearchBar";
import SearchResults from "@/components/features/search/SearchResults";
import CompanyMetrics from "@/components/features/analysis/CompanyMetrics";
import AgentProgress from "@/components/features/analysis/AgentProgress";
import AgentTimeline from "@/components/features/analysis/AgentTimeline";
import RecommendationPanel from "@/components/features/analysis/RecommendationPanel";
import WatchlistButton from "@/components/features/watchlist/WatchlistButton";
import Button from "@/components/ui/Button";
import { BarChart3, Bot, Compass, AlertCircle, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

function AnalysisWorkspaceContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get("ticker");

  // Zustand state
  const selectedStock = useAnalysisStore((state) => state.selectedStock);
  const setSelectedStock = useAnalysisStore((state) => state.setSelectedStock);
  const searchResults = useAnalysisStore((state) => state.searchResults);
  const setSearchResults = useAnalysisStore((state) => state.setSearchResults);
  const setWatchlist = useAnalysisStore((state) => state.setWatchlist);
  const analysisSession = useAnalysisStore((state) => state.analysisSession);
  const agentStates = useAnalysisStore((state) => state.agentStates);
  const timelineMessages = useAnalysisStore((state) => state.timelineMessages);
  const startAnalysis = useAnalysisStore((state) => state.startAnalysis);
  const addTimelineMessage = useAnalysisStore((state) => state.addTimelineMessage);
  const updateAgentState = useAnalysisStore((state) => state.updateAgentState);
  const completeAnalysis = useAnalysisStore((state) => state.completeAnalysis);
  const resetWorkspace = useAnalysisStore((state) => state.resetWorkspace);

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<"quick" | "full" | "risk">("quick");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch watchlist from API on mount
  useEffect(() => {
    async function fetchWatchlist() {
      if (isSignedIn) {
        try {
          const token = await getToken();
          const headers: HeadersInit = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch("/api/v1/watchlist", { headers });
          if (res.ok) {
            const data = await res.json();
            setWatchlist(data.map((item: any) => ({
              ticker: item.Ticker || item.ticker,
              company_name: item.CompanyName || item.company_name,
            })));
          }
        } catch (err) {
          console.error("Watchlist lookup failed:", err);
        }
      }
    }
    fetchWatchlist();
  }, [isSignedIn, getToken, setWatchlist]);

  // Load stock details if ticker param is set in URL
  useEffect(() => {
    async function loadTickerDetails() {
      if (!tickerParam) return;
      setIsLoadingDetails(true);
      setErrorText(null);
      try {
        const token = await getToken();
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/v1/stocks/${tickerParam.toUpperCase()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSelectedStock(data);
        } else {
          setErrorText(`Ticker ${tickerParam} could not be resolved in our database.`);
        }
      } catch (err) {
        setErrorText("Network connectivity failure. Unable to fetch stock details.");
      } finally {
        setIsLoadingDetails(false);
      }
    }
    loadTickerDetails();
  }, [tickerParam, getToken, setSelectedStock]);

  // WebSocket connection management for agent simulation
  useEffect(() => {
    if (!isSignedIn) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[WS-CLIENT] Connection established with Stockox Stream Server");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload.type) return;

        // Ensure we only process events for our currently selected ticker
        switch (payload.type) {
          case "agent_started":
            updateAgentState(payload.payload.agent_id, "thinking");
            addTimelineMessage({
              id: Math.random().toString(),
              agentName: payload.payload.agent_name,
              message: `STARTED TASK: ${payload.payload.task}`,
              type: "research",
              timestamp: payload.payload.timestamp || new Date().toISOString(),
            });
            break;

          case "agent_message":
            updateAgentState(payload.payload.agent_id, "analyzing");
            addTimelineMessage({
              id: Math.random().toString(),
              agentName: payload.payload.agent_name,
              message: payload.payload.message,
              type: "analysis",
              timestamp: payload.payload.timestamp || new Date().toISOString(),
            });
            break;

          case "agent_completed":
            updateAgentState(payload.payload.agent_id, "completed");
            addTimelineMessage({
              id: Math.random().toString(),
              agentName: payload.payload.agent_name,
              message: `AUDIT COMPLETE: ${payload.payload.result}`,
              type: "decision",
              timestamp: payload.payload.timestamp || new Date().toISOString(),
            });
            break;

          case "analysis_completed":
            const currentPrice = selectedStock?.current_price || 150;
            const rec = payload.payload.recommendation;
            const confidence = payload.payload.confidence_score;
            const risk = payload.payload.risk_level;
            const target = currentPrice * (rec === "BUY" ? 1.15 : rec === "SELL" ? 0.85 : 1.02);

            completeAnalysis(rec, confidence, risk, target);
            break;
        }
      } catch (err) {
        console.error("Error parsing websocket message:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("[WS-CLIENT-ERR] WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("[WS-CLIENT] Connection closed");
    };

    return () => {
      socket.close();
    };
  }, [isSignedIn, selectedStock, updateAgentState, addTimelineMessage, completeAnalysis]);

  const handleStockSelect = (stock: StockDetails) => {
    setSelectedStock(stock);
    setErrorText(null);
    router.push(`/dashboard/analysis?ticker=${stock.ticker}`);
  };

  const handleRunAnalysis = async () => {
    if (!selectedStock) return;
    try {
      const token = await getToken();
      await startAnalysis(selectedStock.ticker, token);
    } catch (err) {
      console.error("Failed to run analysis:", err);
    }
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

  const isPositive = selectedStock ? selectedStock.daily_change >= 0 : true;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-44 flex flex-col font-sans text-[#0F172A]">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-6 flex flex-col gap-8 mt-8">
        
        {/* Search Section */}
        <section className="bg-white border-4 border-black p-8 rounded-2xl shadow-[6px_6px_0px_#000000] text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black mb-2 flex items-center justify-center gap-2">
            <Compass className="w-8 h-8 text-[#2563EB]" />
            <span>AI Committee Advisory Workspace</span>
          </h2>
          <p className="text-xs font-bold text-black/50 uppercase tracking-wider mb-6">
            Bloomberg Terminal Intelligence + Federated AI Investment Board
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

        {/* Autocomplete Quick Matches Grid */}
        {!selectedStock && searchResults.length > 0 && (
          <SearchResults results={searchResults} onAnalyze={handleStockSelect} />
        )}

        {/* Skeleton Loader */}
        {isLoadingDetails && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-[60%_40%] gap-8 mt-4">
            <div className="bg-white border-4 border-black rounded-2xl h-96 p-6 animate-pulse shadow-[4px_4px_0px_#000000]">
              <div className="h-6 bg-black/10 rounded w-1/3 mb-4" />
              <div className="h-4 bg-black/10 rounded w-full mb-2" />
              <div className="h-4 bg-black/10 rounded w-5/6 mb-6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-black/10 rounded" />
                <div className="h-12 bg-black/10 rounded" />
              </div>
            </div>
            <div className="bg-white border-4 border-black rounded-2xl h-96 p-6 animate-pulse shadow-[4px_4px_0px_#000000]">
              <div className="h-6 bg-black/10 rounded w-1/2 mb-4" />
              <div className="h-10 bg-black/10 rounded w-full mb-6" />
              <div className="space-y-3">
                <div className="h-6 bg-black/10 rounded" />
                <div className="h-6 bg-black/10 rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        {selectedStock && !isLoadingDetails && (
          <div className="flex flex-col gap-8">
            
            {/* Company Header Card */}
            <section className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-[8px_8px_0px_#000000] transition-shadow duration-200">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#2563EB] border-4 border-black rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-[3px_3px_0px_#000000]">
                  {selectedStock.ticker.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                      {selectedStock.company_name}
                    </h3>
                    <span className="font-mono font-bold text-xs bg-black text-[#FACC15] px-2 py-0.5 rounded border-2 border-black shadow-[2px_2px_0px_#000000]">
                      {selectedStock.ticker}
                    </span>
                  </div>
                  <p className="text-xs text-black/50 font-black uppercase tracking-wider mt-1.5">
                    {selectedStock.sector} • {selectedStock.industry}
                  </p>
                </div>
              </div>

              {/* Price Details */}
              <div className="flex flex-wrap items-center gap-4 md:text-right">
                <div className="flex flex-col md:items-end">
                  <span className="text-2xl md:text-3xl font-black tracking-tight">
                    ${selectedStock.current_price.toFixed(2)}
                  </span>
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
                    {selectedStock.daily_change_pct.toFixed(2)}%
                  </span>
                </div>

                <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#000000] flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">
                    AI Score
                  </span>
                  <span className="text-base font-black text-[#2563EB]">
                    {selectedStock.ai_score}/100
                  </span>
                </div>

                <WatchlistButton ticker={selectedStock.ticker} companyName={selectedStock.company_name} />
              </div>
            </section>

            {/* Two-Column split workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
              
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                <CompanyMetrics stock={selectedStock} />
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6">
                
                {/* Controls board */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-black" />
                    <span>Committee Controls</span>
                  </h4>

                  {/* Mode Toggles */}
                  <div className="grid grid-cols-3 gap-2 mb-6 font-mono text-[10px]">
                    <button
                      onClick={() => setActiveAnalysisMode("quick")}
                      disabled={analysisSession.status === "analyzing"}
                      className={`py-2 px-1 text-center font-black uppercase rounded-lg border-2 border-black cursor-pointer transition-colors ${
                        activeAnalysisMode === "quick"
                          ? "bg-black text-[#FACC15] shadow-[1.5px_1.5px_0px_rgba(255,255,255,0.25)]"
                          : "bg-white hover:bg-black/5 shadow-[1.5px_1.5px_0px_#000000]"
                      }`}
                    >
                      Quick Review
                    </button>
                    <button
                      onClick={() => setActiveAnalysisMode("full")}
                      disabled={analysisSession.status === "analyzing"}
                      className={`py-2 px-1 text-center font-black uppercase rounded-lg border-2 border-black cursor-pointer transition-colors ${
                        activeAnalysisMode === "full"
                          ? "bg-black text-[#FACC15] shadow-[1.5px_1.5px_0px_rgba(255,255,255,0.25)]"
                          : "bg-white hover:bg-black/5 shadow-[1.5px_1.5px_0px_#000000]"
                      }`}
                    >
                      Full Audit
                    </button>
                    <button
                      onClick={() => setActiveAnalysisMode("risk")}
                      disabled={analysisSession.status === "analyzing"}
                      className={`py-2 px-1 text-center font-black uppercase rounded-lg border-2 border-black cursor-pointer transition-colors ${
                        activeAnalysisMode === "risk"
                          ? "bg-black text-[#FACC15] shadow-[1.5px_1.5px_0px_rgba(255,255,255,0.25)]"
                          : "bg-white hover:bg-black/5 shadow-[1.5px_1.5px_0px_#000000]"
                      }`}
                    >
                      Risk Analysis
                    </button>
                  </div>

                  {/* Run Analysis Button */}
                  <Button
                    variant="primary"
                    onClick={handleRunAnalysis}
                    isLoading={analysisSession.status === "analyzing" || analysisSession.status === "thinking"}
                    leftIcon={<Bot className="w-5 h-5" />}
                    className="w-full text-sm font-extrabold uppercase shadow-[4px_4px_0px_#000000] border-3"
                  >
                    {analysisSession.status === "analyzing" || analysisSession.status === "thinking"
                      ? "Committee Auditing..."
                      : "Deploy Investment Committee"}
                  </Button>
                </div>

                {/* Agent diagnostics progress trackers */}
                {(analysisSession.status !== "idle" || timelineMessages.length > 0) && (
                  <AgentProgress agentStates={agentStates} />
                )}

                {/* Consens Timeline Logger Console */}
                <AgentTimeline messages={timelineMessages} />

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Sticky recommendation flying sheet */}
      <RecommendationPanel session={analysisSession} onReset={resetWorkspace} />
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
            Loading Committee Workspace...
          </span>
        </div>
      </div>
    }>
      <AnalysisWorkspaceContent />
    </Suspense>
  );
}
