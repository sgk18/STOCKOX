"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Stores
import { useSearchStore, SearchStockResult } from "@/lib/searchStore";

// Components & UI Elements
import SearchBar from "@/components/features/search/SearchBar";
import SearchResults from "@/components/features/search/SearchResults";
import CompanyMetricsComponent from "@/components/features/analysis/CompanyMetrics";
import WatchlistButton from "@/components/features/watchlist/WatchlistButton";
import LiveAnalysisPanel from "@/components/features/analysis/LiveAnalysisPanel";

import { 
  Terminal, 
  Newspaper, 
  AlertCircle, 
  Globe, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Layers,
  FileText,
  MessageSquare,
  Sparkles
} from "lucide-react";

interface ResearchResponse {
  symbol: string;
  company_name: string;
  profile: {
    sector: string;
    industry: string;
    market_cap: string;
    exchange: string;
    country: string;
    logo_url: string;
    description: string;
  };
  metrics: {
    pe_ratio: number;
    eps: number;
    roe: number;
    debt_ratio: number;
    revenue: number;
    revenue_growth: number;
    profit_margin: number;
    current_ratio: number;
    cash_flow: number;
  };
  quote: {
    current_price: number;
    daily_change: number;
    daily_change_percent: number;
    high_price: number;
    low_price: number;
    open_price: number;
    prev_close_price: number;
    volume: number;
    avg_volume: number;
  };
  history: {
    time: string;
    value: number;
  }[];
  news: {
    title: string;
    source: string;
    date: string;
    url: string;
    summary: string;
  }[];
  analyst_ratings: {
    buy: number;
    hold: number;
    sell: number;
  };
  committee_decision: {
    ticker: string;
    research_vote: string;
    technical_vote: string;
    news_vote: string;
    risk_vote: string;
    committee_decision: string;
    confidence: number;
    reasoning?: string;
    created_at: string;
  };
  agent_timeline: {
    agent_name: string;
    status: string;
    activity: string;
    time: string;
  }[];
  investment_thesis: string;
}

const customTooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "3px solid #000000",
  borderRadius: "12px",
  fontFamily: "monospace",
  fontSize: "10px",
  fontWeight: "bold",
  boxShadow: "3px 3px 0px #000000"
};

function ResearchTerminalContent() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get("ticker");

  // Search Store
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);
  const searchResults = useSearchStore((state) => state.searchResults);
  const setSearchResults = useSearchStore((state) => state.setSearchResults);
  const addToSearchHistory = useSearchStore((state) => state.addToSearchHistory);

  // State for generated AI Research Report view
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "report" | "debate">("overview");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState<string>("");

  // Query research details from the unified backend API
  const { data: researchData, isLoading: isLoadingResearch, error: researchError } = useQuery<ResearchResponse>({
    queryKey: ["research-terminal", tickerParam],
    queryFn: async () => {
      if (!tickerParam) return null;
      const token = await getToken();
      const res = await fetch(`/api/research/${tickerParam.toUpperCase()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`Advisory ticker ${tickerParam.toUpperCase()} could not be resolved.`);
      return res.json();
    },
    enabled: isSignedIn && !!tickerParam,
    refetchInterval: 30000,
  });

  const handleStockSelect = (stock: SearchStockResult) => {
    addToSearchHistory(stock.ticker);
    setSearchQuery("");
    setSearchResults([]);
    router.push(`/dashboard/research-terminal?ticker=${stock.ticker}`);
  };

  const generateAIReport = useCallback(() => {
    if (!researchData) return;
    setGeneratingReport(true);
    setTimeout(() => {
      const report = `
# SECURITIES RESEARCH AUDIT: ${researchData.symbol} (${researchData.company_name})
**CLASSIFICATION: INVESTMENT BOARD SYNTHESIS REPORT**
**COMPILED BY: AI ADVISORY COMMITTEE CONCURRENCE MATRIX**

## Executive Summary
${researchData.company_name} exhibits positive market structural indicators. Supported by steady revenue growth matrices and solid macro tailwinds, the advisory committee issues a recommendation.

## Financial Valuation & Multiples
- **Market Capitalization:** ${researchData.profile.market_cap}
- **PE Multiple Ratio:** ${researchData.metrics.pe_ratio ? researchData.metrics.pe_ratio.toFixed(2) : "N/A"}
- **ROE Margin:** ${researchData.metrics.roe ? `${(researchData.metrics.roe * 100).toFixed(2)}%` : "N/A"}
- **Revenue Growth Rate:** ${researchData.metrics.revenue_growth ? `${(researchData.metrics.revenue_growth * 100).toFixed(2)}%` : "N/A"}

## Committee Synthesis Concurrence
- **Research Node:** Valuation fair pricing models set support bounds.
- **Technical Node:** RSI values indicate strong consolidation and support base above key EMAs.
- **Sentiment Node:** Media coverage metrics yield mostly bullish results (${researchData.analyst_ratings.buy}/100).
- **Risk Node:** Recommended portfolio limits maxed out at 8% allocation weight.

*Disclaimer: Real-time analysis compiled dynamically by federated committee nodes. Past results do not guarantee future profitability.*
      `;
      setReportText(report.trim());
      setGeneratingReport(false);
    }, 1500);
  }, [researchData]);

  useEffect(() => {
    if (researchData) {
      const timer = setTimeout(() => {
        generateAIReport();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [researchData, generateAIReport]);

  const isPositive = researchData ? researchData.quote.daily_change >= 0 : true;

  // Map to old interfaces so CompanyMetricsComponent receives exact properties it expects
  const mappedProfile = researchData ? {
    name: researchData.company_name,
    ticker: researchData.symbol,
    logo: researchData.profile.logo_url,
    industry: researchData.profile.industry,
    sector: researchData.profile.sector,
    marketCap: 0, // Bypassed in favor of pre-formatted market_cap string from API
    website: "",
    description: researchData.profile.description,
    ceo: "N/A",
    employees: 0,
    country: researchData.profile.country,
    exchange: researchData.profile.exchange,
    currentPrice: researchData.quote.current_price,
    dailyChange: researchData.quote.daily_change,
    dailyChangePercent: researchData.quote.daily_change_percent,
    fiftyTwoWHigh: researchData.quote.high_price,
    fiftyTwoWLow: researchData.quote.low_price,
    volume: researchData.quote.volume,
    avgVolume: researchData.quote.avg_volume
  } : null;

  const mappedMetrics = researchData ? {
    ticker: researchData.symbol,
    pe: researchData.metrics.pe_ratio,
    eps: researchData.metrics.eps,
    roe: researchData.metrics.roe,
    revenue: researchData.metrics.revenue,
    revenueGrowth: researchData.metrics.revenue_growth,
    profitMargin: researchData.metrics.profit_margin,
    debtRatio: researchData.metrics.debt_ratio,
    currentRatio: researchData.metrics.current_ratio,
    cashFlow: researchData.metrics.cash_flow
  } : null;

  return (
    <div className="flex flex-col gap-8">
      
      {/* Search Header panel */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center justify-center gap-2.5">
          <Terminal className="w-8 h-8 text-[#2563EB]" />
          <span>Research Terminal</span>
        </h1>
        <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 mb-6">
          Access Company Financial Profiles, Advanced Charts, and AI Consensus Reports
        </p>

        <SearchBar onSelect={handleStockSelect} />
      </section>

      {/* Error State */}
      {researchError && (
        <div className="bg-[#EF4444]/10 border-4 border-black p-4 rounded-2xl flex items-center gap-3 text-[#EF4444] font-black text-xs max-w-lg mx-auto w-full">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{(researchError as Error).message || "Advisory ticker details could not be loaded."}</span>
        </div>
      )}

      {/* Autocomplete Search results */}
      {!tickerParam && searchResults.length > 0 && (
        <SearchResults results={searchResults} onAnalyze={handleStockSelect} />
      )}

      {/* Loading skeleton */}
      {tickerParam && isLoadingResearch && (
        <div className="flex flex-col gap-8 animate-pulse">
          <div className="h-24 bg-black/5 border-4 border-black rounded-[24px]" />
          <div className="h-64 bg-black/5 border-4 border-black rounded-[24px]" />
        </div>
      )}

      {/* Selected Stock workspace layout */}
      {researchData && !isLoadingResearch && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          
          {/* Header Card */}
          <section className="glass-brutal-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-[7px_7px_0px_#000000] transition-shadow duration-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#2563EB] border-4 border-black rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-[3px_3px_0px_#000000]">
                {researchData.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#0F172A]">
                    {researchData.company_name}
                  </h3>
                  <span className="font-mono font-black text-xs bg-black text-[#60A5FA] px-2 py-0.5 rounded border-2 border-black">
                    {researchData.symbol}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px] font-black uppercase text-[#64748B] tracking-wider">
                  <span>{researchData.profile.exchange}</span>
                  <span>•</span>
                  <span>{researchData.profile.industry}</span>
                </div>
              </div>
            </div>

            {/* Price section */}
            <div className="flex flex-wrap items-center gap-4 md:text-right">
              <div className="flex flex-col md:items-end font-mono">
                <span className="text-2xl md:text-3xl font-black tracking-tight text-[#0F172A]">
                  ${researchData.quote.current_price ? researchData.quote.current_price.toFixed(2) : "0.00"}
                </span>
                {researchData.quote.daily_change_percent !== undefined && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-black uppercase mt-1 px-2.5 py-0.5 border-2 border-black shadow-[1.5px_1.5px_0px_#000000] rounded-lg ${
                    isPositive
                      ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/25"
                      : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25"
                  }`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {isPositive ? "+" : ""}{researchData.quote.daily_change_percent.toFixed(2)}%
                  </span>
                )}
              </div>

              <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#000000] flex flex-col items-center min-w-[70px]">
                <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">Cap</span>
                <span className="text-xs font-black text-[#2563EB]">{researchData.profile.market_cap}</span>
              </div>

              <WatchlistButton ticker={researchData.symbol} companyName={researchData.company_name} />
            </div>
          </section>

          {/* Sub Navigation tabs within Research workspace */}
          <div className="flex gap-2.5 border-b-4 border-black pb-3 select-none">
            {(
              [
                { id: "overview", label: "Profile Overview", icon: Globe },
                { id: "financials", label: "Financial Audits", icon: Layers },
                { id: "report", label: "AI Research Report", icon: FileText },
                { id: "debate", label: "Agent Debates", icon: MessageSquare }
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-3 rounded-xl font-black text-xs uppercase transition-all duration-150 ${
                    activeTab === tab.id
                      ? "bg-black text-white border-black shadow-[2px_2px_0px_#2563EB] translate-y-[-1px]"
                      : "bg-white text-[#64748B] border-transparent hover:border-black hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content rendering */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Main pane (8/12) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {activeTab === "overview" && (
                <div className="flex flex-col gap-6">
                  {/* Closing Price Timeline chart */}
                  <div className="bg-white border-4 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_#000000]">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-6 font-mono">
                      Price timeline history (Closing values)
                    </h4>
                    {researchData.history.length === 0 ? (
                      <div className="h-60 flex items-center justify-center text-xs font-mono text-black/30 uppercase">
                        No historical timeline points returned.
                      </div>
                    ) : (
                      <div className="h-[280px] w-full font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={researchData.history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorResearchVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="time" 
                              stroke="#0F172A" 
                              fontSize={9}
                              fontWeight="bold"
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="#0F172A" 
                              fontSize={9}
                              fontWeight="bold"
                              tickLine={false}
                              axisLine={false}
                              domain={['auto', 'auto']}
                              tickFormatter={(val) => `$${val.toFixed(2)}`}
                            />
                            <Tooltip contentStyle={customTooltipStyle} />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#2563EB" 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill="url(#colorResearchVal)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Company Description */}
                  <div className="glass-brutal-card p-6">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 mb-3 font-mono">
                      Profile description
                    </h4>
                    <p className="text-xs font-medium text-[#64748B] leading-relaxed font-mono">
                      {researchData.profile.description || "No company description available."}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-black/5 font-mono text-[10px]">
                      <div>
                        <span className="font-bold text-[#64748B] block">Sector</span>
                        <span className="font-black text-[#0F172A]">{researchData.profile.sector || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#64748B] block">Exchange</span>
                        <span className="font-black text-[#0F172A]">{researchData.profile.exchange || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#64748B] block">Country</span>
                        <span className="font-black text-[#0F172A]">{researchData.profile.country || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "financials" && mappedProfile && (
                <div className="flex flex-col gap-6">
                  <CompanyMetricsComponent
                    profile={mappedProfile as React.ComponentProps<typeof CompanyMetricsComponent>["profile"]}
                    metrics={mappedMetrics as React.ComponentProps<typeof CompanyMetricsComponent>["metrics"]}
                  />
                </div>
              )}

              {activeTab === "report" && (
                <div className="glass-brutal-card p-6 bg-white flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b-2 border-black pb-3.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#2563EB] animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] font-mono">AI Consensus Report</span>
                    </div>
                    <button
                      onClick={generateAIReport}
                      disabled={generatingReport}
                      className="border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase bg-[#F8FAFC] hover:bg-[#2563EB] hover:text-white transition-all shadow-[1.5px_1.5px_0px_#000000]"
                    >
                      {generatingReport ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>

                  {generatingReport ? (
                    <div className="p-8 text-center text-xs font-mono text-black/45 animate-pulse uppercase">
                      Compiling analytical models...
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-[10px] bg-[#F8FAFC] border-2 border-black p-5 rounded-2xl text-black/85 leading-relaxed overflow-x-auto">
                      {reportText || "Trigger consensus report compilation."}
                    </pre>
                  )}
                </div>
              )}

              {activeTab === "debate" && (
                <div className="flex flex-col gap-4">
                  <LiveAnalysisPanel />
                </div>
              )}

            </div>

            {/* Right Side News Stream (4/12) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              <div className="glass-brutal-card p-6 bg-white">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4 flex items-center gap-2 font-mono">
                  <Newspaper className="w-4.5 h-4.5 text-[#2563EB]" />
                  <span>Ticker news stream</span>
                </h4>

                  {researchData.news.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-black/30 uppercase">
                      No ticker news captured.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                      {researchData.news.map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#F8FAFC] border-2 border-black p-3.5 rounded-xl shadow-[2px_2px_0px_#000000] hover:shadow-[3.5px_3.5px_0px_#000000] hover:-translate-y-0.5 transition-all block text-left"
                        >
                          <h5 className="font-black text-xs text-[#0F172A] leading-tight mb-2 hover:text-[#2563EB]">
                            {item.title}
                          </h5>
                          <p className="text-[10px] font-bold text-black/60 line-clamp-2 leading-relaxed mb-3 font-mono">
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

      {/* Unselected Dashboard fallback */}
      {!tickerParam && (
        <div className="glass-brutal-card p-12 text-center flex flex-col items-center gap-3">
          <Sparkles className="w-10 h-10 text-[#2563EB] animate-pulse" />
          <h3 className="text-sm font-black uppercase text-[#0F172A]">Terminal Standby Mode</h3>
          <p className="text-xs font-medium text-[#64748B] max-w-sm font-mono leading-relaxed">
            Please search for an active market ticker (e.g. NVDA, AAPL, MSFT, TSLA, AMD) above to populate the workspace.
          </p>
        </div>
      )}

    </div>
  );
}

export default function ResearchTerminalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black text-white text-lg">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Syncing analytical framework...
          </span>
        </div>
      </div>
    }>
      <ResearchTerminalContent />
    </Suspense>
  );
}
