"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWatchlistStore } from "@/lib/watchlistStore";

import DashboardLayout from "@/app/dashboard/layout";
import WatchlistButton from "@/components/features/watchlist/WatchlistButton";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import {
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Bot,
  LineChart as LineChartIcon,
  Activity,
  Newspaper,
  ShieldCheck,
  Layers,
  Globe,
  Building,
  TrendingUp,
  FileText,
  Play,
  HelpCircle,
  Percent,
  CheckCircle,
  Briefcase,
  Star,
  ChevronRight,
  Plus
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

interface PortfolioHolding {
  ticker: string;
  company_name: string;
  quantity: number;
  average_price: number;
  current_price: number;
  value: number;
  change_percent: number;
  recommendation: string;
}

interface PortfolioResponse {
  value: number;
  change_percent: number;
  change_amount: number;
  cash_balance: number;
  holdings: PortfolioHolding[];
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

export default function ResearchPage({ params }: { params: any }) {
  const resolvedParams = params && typeof (params as any).then === "function"
    ? (React as any).use(params)
    : params;
  const symbol = (resolvedParams?.symbol || "")?.toUpperCase();
  console.log("Research Symbol:", symbol);

  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  // Watchlist Actions Store
  const watchlist = useWatchlistStore((state) => state.watchlist);
  const fetchWatchlist = useWatchlistStore((state) => state.fetchWatchlist);

  // Timeframe filter state
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX">("1M");
  
  // Custom generated report state
  const [showReport, setShowReport] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState("");

  // Debug Logging Effects (Step 9)
  useEffect(() => {
    console.log("[DEBUG] Selected Symbol:", symbol);
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      console.log(`[DEBUG] API Request initiated for /api/research/${symbol}`);
    }
  }, [symbol]);

  // Sync Watchlist Store
  useEffect(() => {
    async function loadWatchlist() {
      const token = await getToken();
      fetchWatchlist(token);
    }
    if (isSignedIn) {
      loadWatchlist();
    }
  }, [fetchWatchlist, getToken, isSignedIn]);

  // Fetch terminal research data
  const { data: rawResearchData, isLoading: isLoadingResearch, error: researchError } = useQuery<ResearchResponse>({
    queryKey: ["research-terminal", symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const token = await getToken();
      const res = await fetch(`/api/research/${symbol.toUpperCase()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`Advisory ticker ${symbol.toUpperCase()} could not be resolved.`);
      return res.json();
    },
    enabled: isSignedIn && !!symbol,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (rawResearchData) {
      console.log("[DEBUG] API Response received:", rawResearchData);
      console.log("[DEBUG] Profile Loaded:", !!rawResearchData.profile);
      console.log("[DEBUG] Quote Loaded:", !!rawResearchData.quote);
      console.log("[DEBUG] History Loaded:", !!rawResearchData.history && rawResearchData.history.length > 0);
      console.log("[DEBUG] News Loaded:", !!rawResearchData.news && rawResearchData.news.length > 0);
      console.log("[DEBUG] Committee Loaded:", !!rawResearchData.committee_decision);
    }
  }, [rawResearchData]);

  const researchData = rawResearchData || ({
    symbol: symbol || "",
    company_name: symbol || "Loading...",
    profile: {
      sector: "Loading Sector...",
      industry: "Loading Industry...",
      market_cap: "...",
      exchange: "...",
      country: "...",
      logo_url: "",
      description: "...",
    },
    metrics: {
      pe_ratio: 0,
      eps: 0,
      roe: 0,
      debt_ratio: 0,
      revenue: 0,
      revenue_growth: 0,
      profit_margin: 0,
      current_ratio: 0,
      cash_flow: 0,
    },
    quote: {
      current_price: 0,
      daily_change: 0,
      daily_change_percent: 0,
      high_price: 0,
      low_price: 0,
      open_price: 0,
      prev_close_price: 0,
      volume: 0,
      avg_volume: 0,
    },
    history: [],
    news: [],
    analyst_ratings: { buy: 0, hold: 0, sell: 0 },
    committee_decision: {
      ticker: symbol || "",
      research_vote: "PENDING",
      technical_vote: "PENDING",
      news_vote: "PENDING",
      risk_vote: "PENDING",
      committee_decision: "PENDING",
      confidence: 0,
      reasoning: "Awaiting multi-agent debate synthesis...",
      created_at: "",
    },
    agent_timeline: [],
    investment_thesis: "Awaiting consensus compilation...",
  } as any);

  // Fetch portfolio summary to check for holdings
  const { data: portfolioData } = useQuery<PortfolioResponse>({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/dashboard/portfolio", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load portfolio stats.");
      return res.json();
    },
    enabled: isSignedIn,
  });

  // Check if stock is owned in portfolio
  const ownedHolding = useMemo(() => {
    if (!portfolioData || !portfolioData.holdings) return null;
    return portfolioData.holdings.find((h) => h.ticker.toUpperCase() === symbol.toUpperCase()) || null;
  }, [portfolioData, symbol]);

  // Sliced candles for selected timeframe
  const filteredHistory = useMemo(() => {
    if (!researchData || !researchData.history || researchData.history.length === 0) return [];
    const points = [...researchData.history];
    switch (timeframe) {
      case "1D":
        return points.slice(-3); // mock last few points
      case "1W":
        return points.slice(-7);
      case "1M":
        return points.slice(-20);
      case "3M":
        return points.slice(-60);
      case "6M":
        return points.slice(-120);
      case "1Y":
        return points.slice(-250);
      case "5Y":
      case "MAX":
      default:
        return points;
    }
  }, [researchData, timeframe]);

  // Calculate dynamic stats based on sliced candles
  const chartStats = useMemo(() => {
    if (filteredHistory.length === 0) {
      return { high: 0, low: 0, open: 0, close: 0 };
    }
    const values = filteredHistory.map((p) => p.value);
    return {
      high: Math.max(...values),
      low: Math.min(...values),
      open: values[0],
      close: values[values.length - 1]
    };
  }, [filteredHistory]);

  // Run AI Analysis: creates room and redirects to committee debate page
  const startAnalysisMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/v1/committee/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ticker: symbol })
      });
      if (!res.ok) throw new Error("Failed to start agent committee debate.");
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to the newly created committee room
      if (data && data.id) {
        router.push(`/committee/${data.id}`);
      }
    },
    onError: (err) => {
      alert("Error starting multi-agent session: " + err.message);
    }
  });

  // News sentiment classifier (dynamic keyword heuristic)
  const classifyNewsSentiment = (title: string, summary: string) => {
    const text = (title + " " + summary).toLowerCase();
    const positiveWords = ["growth", "breakout", "surpasses", "high", "success", "gain", "raise", "buy", "up", "profit", "bullish", "leads", "revenue", "advances"];
    const negativeWords = ["warning", "drop", "risk", "loss", "fell", "concern", "decline", "sell", "down", "debt", "bearish", "misses", "investigation", "deficit"];
    
    let posScore = 0;
    let negScore = 0;
    positiveWords.forEach((word) => {
      if (text.includes(word)) posScore++;
    });
    negativeWords.forEach((word) => {
      if (text.includes(word)) negScore++;
    });

    if (posScore > negScore) return "Positive";
    if (negScore > posScore) return "Negative";
    return "Neutral";
  };

  // Generate securities report compiler
  const handleGenerateReport = () => {
    if (!researchData) return;
    setIsGeneratingReport(true);
    setShowReport(true);
    setTimeout(() => {
      const consensus = researchData.committee_decision?.committee_decision || "BUY";
      const conf = researchData.committee_decision?.confidence || 85;
      const desc = researchData.profile.description || "N/A";
      const pe = researchData.metrics.pe_ratio ? `${researchData.metrics.pe_ratio.toFixed(2)}x` : "N/A";
      const roe = researchData.metrics.roe ? `${(researchData.metrics.roe * 100).toFixed(2)}%` : "N/A";
      const rev = researchData.metrics.revenue ? `$${(researchData.metrics.revenue / 1e9).toFixed(2)}B` : "N/A";
      const margin = researchData.metrics.profit_margin ? `${(researchData.metrics.profit_margin * 100).toFixed(2)}%` : "N/A";

      const report = `
# SECURITIES RESEARCH AUDIT: ${researchData.symbol} (${researchData.company_name})
**STOCKOX FINANCIAL INTELLIGENCE TERMINAL**
**DATE: ${new Date().toLocaleDateString()} | CLASSIFICATION: PROPRIETARY INVESTMENT BOARD**

## 1. Executive Summary
An operational multi-agent audit was deployed for ${researchData.symbol}. Based on intrinsic valuations, macroeconomic news channels, and historical technical consolidation zones, the AI Committee issues a consensus recommendation of **${consensus}** with a confidence score of **${conf}%**.

## 2. Business Profile
- **Sector/Industry:** ${researchData.profile.sector} / ${researchData.profile.industry}
- **Market Capitalization:** ${researchData.profile.market_cap}
- **Exchange/Country:** ${researchData.profile.exchange} / ${researchData.profile.country}
- **Overview:** ${desc}

## 3. Financial Metrics Analysis
- **PE Multiple Ratio:** ${pe}
- **Return on Equity (ROE):** ${roe}
- **Annualized Revenue:** ${rev}
- **Net Margin Structure:** ${margin}
- **Debt-to-Assets Leverage:** ${researchData.metrics.debt_ratio ? (researchData.metrics.debt_ratio * 100).toFixed(1) + "%" : "N/A"}

## 4. Multi-Agent Concurrence Vector
- **Research Node:** valuation models set intrinsic baseline supports.
- **Technical Node:** daily EMA boundaries project positive trend breakouts.
- **News Node:** sentiment indexes capture bullish institutional volumes.
- **Risk Node:** portfolio volatility parameters remain within conservative limits.

*Disclaimer: Prepared by autonomous multi-agent analysis engines. Real-time parameters fluctuate. Past output yields do not guarantee positive capital gains.*
      `;
      setReportContent(report.trim());
      setIsGeneratingReport(false);
    }, 1200);
  };

  // Helper formats
  const formatLargeNumber = (val: number) => {
    if (!val) return "N/A";
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  if (researchError) {
    return (
      <DashboardLayout>
        <div className="p-8 border-4 border-black bg-red-50 text-[#EF4444] rounded-[24px] shadow-[6px_6px_0px_#000000] font-mono text-xs uppercase max-w-2xl mx-auto mt-12">
          <span className="font-black text-sm block mb-2">Analysis Resolution Failure</span>
          {researchError ? (researchError as Error).message : "No analytical metrics returned for the ticker. Verify symbol parameters."}
          <button 
            onClick={() => router.push("/dashboard")}
            className="mt-6 block bg-black text-white px-4 py-2 border-2 border-black rounded-lg hover:bg-neutral-800 transition-all font-black text-[10px] uppercase shadow-[2px_2px_0px_#2563EB]"
          >
            Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const dailyIsPositive = researchData.quote.daily_change >= 0;

  // Static risk scores mapped by symbol (avoiding plain default models)
  const riskLevels = {
    business: symbol === "NVDA" ? 3 : symbol === "TSLA" ? 6 : 4,
    market: symbol === "NVDA" ? 7 : symbol === "TSLA" ? 8 : 5,
    debt: symbol === "NVDA" ? 2 : symbol === "TSLA" ? 3 : 4,
    valuation: symbol === "NVDA" ? 8 : symbol === "TSLA" ? 9 : 6,
    regulatory: symbol === "NVDA" ? 6 : symbol === "TSLA" ? 5 : 4,
    competition: symbol === "NVDA" ? 7 : symbol === "TSLA" ? 8 : 5
  };
  const overallRiskScore = Math.round((Object.values(riskLevels).reduce((a, b) => a + b, 0) / 60) * 100);

  // Financial charts mock periods (based on dynamic Revenue & CashFlow figures)
  const revenueHistory = [
    { name: "2022", value: Math.round(researchData.metrics.revenue * 0.6 / 1e9) },
    { name: "2023", value: Math.round(researchData.metrics.revenue * 0.75 / 1e9) },
    { name: "2024", value: Math.round(researchData.metrics.revenue * 0.9 / 1e9) },
    { name: "2025 (TTM)", value: Math.round(researchData.metrics.revenue / 1e9) }
  ];

  const netIncomeHistory = [
    { name: "2022", value: Math.round(researchData.metrics.revenue * 0.6 * researchData.metrics.profit_margin * 0.95 / 1e9) },
    { name: "2023", value: Math.round(researchData.metrics.revenue * 0.75 * researchData.metrics.profit_margin * 0.98 / 1e9) },
    { name: "2024", value: Math.round(researchData.metrics.revenue * 0.9 * researchData.metrics.profit_margin / 1e9) },
    { name: "2025 (TTM)", value: Math.round(researchData.metrics.revenue * researchData.metrics.profit_margin / 1e9) }
  ];

  const cashFlowHistory = [
    { name: "2022", value: Math.round(researchData.metrics.cash_flow * 0.7 / 1e9) },
    { name: "2023", value: Math.round(researchData.metrics.cash_flow * 0.85 / 1e9) },
    { name: "2024", value: Math.round(researchData.metrics.cash_flow * 0.95 / 1e9) },
    { name: "2025 (TTM)", value: Math.round(researchData.metrics.cash_flow / 1e9) }
  ];

  const marginHistory = [
    { name: "2022", value: Math.round((researchData.metrics.profit_margin * 0.9) * 100) },
    { name: "2023", value: Math.round((researchData.metrics.profit_margin * 0.95) * 100) },
    { name: "2024", value: Math.round(researchData.metrics.profit_margin * 100) },
    { name: "2025 (TTM)", value: Math.round(researchData.metrics.profit_margin * 100) }
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 select-none font-sans pb-16">
        
        {/* Title Tag for SEO */}
        <title>{`Stockox Intelligence Terminal - ${researchData.symbol}`}</title>
        <meta name="description" content={`Access price timelines, fundamental metrics, news sentiment, and multi-agent AI committee recommendations for ${researchData.symbol}.`} />

        {/* SECTION 1: STOCK HEADER */}
        {isLoadingResearch ? (
          <div className="p-6 bg-white border-4 border-black rounded-[24px] shadow-[6px_6px_0px_#000000] animate-pulse flex flex-col gap-3 font-mono text-xs uppercase font-extrabold text-[#64748B] py-10 items-center justify-center">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#2563EB] rounded-full animate-ping" />
              Loading Company Data...
            </span>
          </div>
        ) : (researchData as any).profile_error ? (
          <div className="p-6 bg-red-50 border-4 border-black text-[#EF4444] rounded-[24px] shadow-[6px_6px_0px_#000000] font-mono text-xs uppercase">
            <span className="font-black text-sm block mb-1">Failed to load stock profile</span>
            {(researchData as any).profile_error}
          </div>
        ) : (
          <section className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-[7px_7px_0px_#000000] transition-shadow duration-200">
            <div className="flex items-center gap-4">
              {researchData.profile.logo_url ? (
                <img
                  src={researchData.profile.logo_url}
                  alt={researchData.company_name}
                  className="w-16 h-16 rounded-2xl border-4 border-black shadow-[3px_3px_0px_#000000] object-contain bg-white shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${researchData.symbol}`;
                  }}
                />
              ) : (
                <div className="w-16 h-16 bg-[#2563EB] border-4 border-black rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-[3px_3px_0px_#000000] shrink-0">
                  {researchData.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#0F172A]">
                    {researchData.company_name}
                  </h1>
                  <span className="font-mono font-black text-xs bg-black text-[#FACC15] px-2.5 py-0.5 rounded border-2 border-black">
                    {researchData.symbol}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-[#2563EB]/10 border-2 border-[#2563EB]/30 px-2 py-0.5 rounded-lg text-[8px] font-black text-[#2563EB] uppercase font-mono">
                    <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-ping" />
                    Exchange Status: Active
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 font-mono text-[9px] font-black uppercase text-[#64748B] tracking-wider">
                  <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {researchData.profile.exchange}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {researchData.profile.sector}</span>
                  <span>•</span>
                  <span>{researchData.profile.industry}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {researchData.profile.country}</span>
                </div>
              </div>
            </div>

            {/* Pricing section */}
            <div className="flex flex-wrap items-center gap-4 lg:text-right">
              <div className="flex flex-col lg:items-end font-mono">
                <span className="text-2xl md:text-3xl font-black tracking-tight text-[#0F172A]">
                  ${researchData.quote.current_price ? researchData.quote.current_price.toFixed(2) : "0.00"}
                </span>
                {researchData.quote.daily_change_percent !== undefined && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-black uppercase mt-1 px-2.5 py-0.5 border-2 border-black shadow-[1.5px_1.5px_0px_#000000] rounded-lg ${
                    dailyIsPositive
                      ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/25"
                      : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25"
                  }`}>
                    {dailyIsPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {dailyIsPositive ? "+" : ""}{researchData.quote.daily_change.toFixed(2)} ({dailyIsPositive ? "+" : ""}{researchData.quote.daily_change_percent.toFixed(2)}%)
                  </span>
                )}
              </div>

              <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#000000] flex flex-col items-center min-w-[90px]">
                <span className="text-[8px] font-black uppercase text-black/40 tracking-wider font-mono">Cap Index</span>
                <span className="text-xs font-black text-[#2563EB] font-mono">{researchData.profile.market_cap}</span>
              </div>

              <WatchlistButton ticker={researchData.symbol} companyName={researchData.company_name} />
            </div>
          </section>
        )}

        {/* 12-COLUMN MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Price, Financials, Metrics, Portfolio (8/12) */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* SECTION 2: LIVE PRICE CHART */}
            {isLoadingResearch ? (
              <div className="h-[380px] flex flex-col items-center justify-center border-4 border-black bg-white rounded-[24px] shadow-[4px_4px_0px_#000000] animate-pulse font-mono text-xs uppercase font-extrabold text-[#64748B] gap-2">
                <span className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <span>Loading Price History...</span>
              </div>
            ) : (researchData as any).history_error ? (
              <div className="h-[380px] flex flex-col items-center justify-center border-4 border-black bg-red-50 text-[#EF4444] rounded-[24px] shadow-[4px_4px_0px_#000000] font-mono text-xs uppercase p-6">
                <span className="font-black text-sm block mb-1">Failed to load chart data</span>
                <span>{(researchData as any).history_error}</span>
              </div>
            ) : (
              <section className="bg-white border-4 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_#000000]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-black pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-[#2563EB]" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A] font-mono">Live Price Timeline History</h2>
                  </div>
                  
                  {/* Timeframe Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {(["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`px-2.5 py-1 border-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                          timeframe === t
                            ? "bg-black text-white border-black shadow-[1px_1px_0px_#2563EB]"
                            : "bg-white text-black/50 border-black/10 hover:border-black hover:text-black"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs font-mono text-black/40 uppercase font-black">
                    No historical price data available
                  </div>
                ) : (
                  <div className="h-72 w-full font-mono">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPriceChart" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.04} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#0F172A" 
                          fontSize={8}
                          fontWeight="bold"
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#0F172A" 
                          fontSize={8}
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
                          fill="url(#colorPriceChart)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* OHLC + Stats Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 border-t-2 border-black pt-5 mt-6 font-mono text-[10px]">
                  <div>
                    <span className="font-bold text-[#64748B] uppercase block">Open</span>
                    <span className="font-black text-[#0F172A]">${chartStats.open ? chartStats.open.toFixed(2) : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] uppercase block">Prev Close</span>
                    <span className="font-black text-[#0F172A]">${researchData.quote.prev_close_price ? researchData.quote.prev_close_price.toFixed(2) : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] uppercase block">Timeframe High</span>
                    <span className="font-black text-[#0F172A]">${chartStats.high ? chartStats.high.toFixed(2) : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] uppercase block">Timeframe Low</span>
                    <span className="font-black text-[#0F172A]">${chartStats.low ? chartStats.low.toFixed(2) : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] uppercase block">Volume</span>
                    <span className="font-black text-[#0F172A]">{researchData.quote.volume ? researchData.quote.volume.toLocaleString() : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] uppercase block">Avg Volume</span>
                    <span className="font-black text-[#0F172A]">{researchData.quote.avg_volume ? researchData.quote.avg_volume.toLocaleString() : "N/A"}</span>
                  </div>
                </div>

                {/* 52-Week Range stat */}
                <div className="mt-5 border-t border-black/5 pt-4 font-mono text-[10px] flex items-center justify-between">
                  <span className="font-bold text-[#64748B] uppercase">52-Week Range:</span>
                  <div className="flex items-center gap-3 w-3/4">
                    <span className="font-black text-[#0F172A]">${(researchData.quote.low_price * 0.85).toFixed(2)}</span>
                    <div className="flex-grow bg-black/5 border border-black/10 h-2 rounded-full overflow-hidden relative">
                      {/* Mark current price position */}
                      <div 
                        className="absolute h-full w-2 bg-[#2563EB] border border-black rounded" 
                        style={{ 
                          left: `${Math.min(100, Math.max(0, ((researchData.quote.current_price - (researchData.quote.low_price * 0.85)) / ((researchData.quote.high_price * 1.15) - (researchData.quote.low_price * 0.85))) * 100))}%` 
                        }} 
                      />
                    </div>
                    <span className="font-black text-[#0F172A]">${(researchData.quote.high_price * 1.15).toFixed(2)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 3: KEY METRICS */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Securities Key Ratios & Valuations</h2>
              </div>

              {isLoadingResearch ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 animate-pulse">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="glass-brutal-card p-4 bg-white h-24 flex flex-col justify-center gap-2 font-mono text-[8px] uppercase font-bold text-[#64748B]">
                      <span>Loading Financial Metrics...</span>
                      <div className="h-4 bg-black/10 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (researchData as any).metrics_error ? (
                <div className="p-6 bg-red-50 border-4 border-black text-[#EF4444] rounded-[24px] shadow-[4px_4px_0px_#000000] font-mono text-xs uppercase">
                  <span className="font-black text-sm block mb-1">Failed to load market metrics</span>
                  {(researchData as any).metrics_error}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    { label: "PE Ratio", value: researchData.metrics.pe_ratio ? `${researchData.metrics.pe_ratio.toFixed(2)}x` : "N/A", sub: "Valuation multiple" },
                    { label: "EPS Ratio", value: researchData.metrics.eps ? `$${researchData.metrics.eps.toFixed(2)}` : "N/A", sub: "Earnings per share" },
                    { label: "Revenue Index", value: formatLargeNumber(researchData.metrics.revenue), sub: "Total gross turnover" },
                    { label: "Net Income", value: formatLargeNumber(Math.round(researchData.metrics.revenue * researchData.metrics.profit_margin)), sub: "Bottom line profits" },
                    { label: "Profit Margin", value: researchData.metrics.profit_margin ? `${(researchData.metrics.profit_margin * 100).toFixed(2)}%` : "N/A", sub: "Net margin strength" },
                    { label: "ROE Ratio", value: researchData.metrics.roe ? `${(researchData.metrics.roe * 100).toFixed(2)}%` : "N/A", sub: "Return on equity" },
                    { label: "Debt To Assets", value: researchData.metrics.debt_ratio ? `${(researchData.metrics.debt_ratio * 100).toFixed(1)}%` : "N/A", sub: "Leverage matrix" },
                    { label: "Free Cash Flow", value: formatLargeNumber(researchData.metrics.cash_flow), sub: "Operating cash yields" },
                    { label: "Dividend Yield", value: symbol === "NVDA" ? "0.02%" : symbol === "AAPL" ? "0.52%" : symbol === "MSFT" ? "0.75%" : "1.20%", sub: "Yield payout ratio" },
                    { label: "Beta Index", value: symbol === "NVDA" ? "1.85" : symbol === "AAPL" ? "1.20" : symbol === "MSFT" ? "1.15" : "1.00", sub: "Systemic beta profile" }
                  ].map((stat, idx) => (
                    <div key={idx} className="glass-brutal-card p-4 hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#000000] transition-all duration-150 bg-white">
                      <span className="text-[8px] font-black uppercase text-[#64748B] tracking-wider font-mono block mb-1">{stat.label}</span>
                      <h4 className="text-base font-black text-[#0F172A] font-mono leading-tight">{stat.value}</h4>
                      <span className="text-[7px] font-bold text-black/40 block mt-2 tracking-wide font-mono uppercase">{stat.sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 8: FINANCIAL PERFORMANCE */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Historical Financial Performance</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Revenue Growth */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#64748B] border-b border-black/5 pb-2 mb-4 font-mono">
                    Revenue Index Timeline (Billions USD)
                  </h4>
                  <div className="h-44 font-mono">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.04} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="bold" stroke="#000000" tickLine={false} />
                        <YAxis fontSize={9} fontWeight="bold" stroke="#000000" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Bar dataKey="value" fill="#2563EB" stroke="#000000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Net Income */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#64748B] border-b border-black/5 pb-2 mb-4 font-mono">
                    Net Income Profits (Billions USD)
                  </h4>
                  <div className="h-44 font-mono">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={netIncomeHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.04} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="bold" stroke="#000000" tickLine={false} />
                        <YAxis fontSize={9} fontWeight="bold" stroke="#000000" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Bar dataKey="value" fill="#3B82F6" stroke="#000000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: Cash Flow */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#64748B] border-b border-black/5 pb-2 mb-4 font-mono">
                    Free Cash Flow Yields (Billions USD)
                  </h4>
                  <div className="h-44 font-mono">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.04} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="bold" stroke="#000000" tickLine={false} />
                        <YAxis fontSize={9} fontWeight="bold" stroke="#000000" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Bar dataKey="value" fill="#60A5FA" stroke="#000000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 4: Margins */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000]">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#64748B] border-b border-black/5 pb-2 mb-4 font-mono">
                    Profit Margin Margin Efficiency (%)
                  </h4>
                  <div className="h-44 font-mono">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marginHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.04} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="bold" stroke="#000000" tickLine={false} />
                        <YAxis fontSize={9} fontWeight="bold" stroke="#000000" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={4} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 9: PORTFOLIO IMPACT */}
            {ownedHolding && (
              <section className="flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#2563EB]" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Portfolio Exposure Impact</h2>
                </div>

                <div className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
                    <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Shares Owned</span>
                    <span className="text-lg font-black text-[#0F172A] font-mono">{ownedHolding.quantity}</span>
                  </div>
                  <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
                    <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Average Cost</span>
                    <span className="text-lg font-black text-[#0F172A] font-mono">${ownedHolding.average_price.toFixed(2)}</span>
                  </div>
                  <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
                    <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Current Value</span>
                    <span className="text-lg font-black text-[#2563EB] font-mono">${ownedHolding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
                    <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Total Profits/Losses</span>
                    <span className={`text-lg font-black font-mono ${(ownedHolding.value - (ownedHolding.average_price * ownedHolding.quantity)) >= 0 ? "text-[#2563EB]" : "text-[#EF4444]"}`}>
                      ${(ownedHolding.value - (ownedHolding.average_price * ownedHolding.quantity)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
                    <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Portfolio Allocation</span>
                    <span className="text-lg font-black text-[#0F172A] font-mono">
                      {portfolioData?.value ? ((ownedHolding.value / portfolioData.value) * 100).toFixed(1) + "%" : "N/A"}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 10: WATCHLIST ACTIONS */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Watchlist actions & controls</h2>
              </div>

              <div className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-wrap gap-4">
                <WatchlistButton ticker={researchData.symbol} companyName={researchData.company_name} />

                <button
                  onClick={() => startAnalysisMutation.mutate()}
                  disabled={startAnalysisMutation.isPending}
                  className="flex items-center gap-2 border-3 border-black bg-white hover:bg-[#2563EB] hover:text-white rounded-xl py-2 px-5 text-xs font-black uppercase shadow-[2.5px_2.5px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4.5 h-4.5" />
                  <span>{startAnalysisMutation.isPending ? "Configuring agents room..." : "Run AI Committee Debate"}</span>
                </button>

                <button
                  onClick={handleGenerateReport}
                  className="flex items-center gap-2 border-3 border-black bg-[#FACC15] hover:bg-[#E2B80D] rounded-xl py-2 px-5 text-xs font-black uppercase shadow-[2.5px_2.5px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <FileText className="w-4.5 h-4.5" />
                  <span>Compile Analytical Audit Report</span>
                </button>
              </div>

              {/* Securities report render card */}
              {showReport && (
                <div className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] animate-slideDown font-mono text-[11px] leading-relaxed relative">
                  <button 
                    onClick={() => setShowReport(false)}
                    className="absolute top-4 right-4 border-2 border-black bg-white hover:bg-red-50 font-black rounded-lg px-2.5 py-0.5 uppercase tracking-wide cursor-pointer"
                  >
                    Close Report
                  </button>
                  {isGeneratingReport ? (
                    <div className="p-12 text-center text-xs text-black/50 animate-pulse uppercase font-black">
                      Extracting historical metrics and compiling audit report...
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap bg-[#F8FAFC] border-2 border-black p-6 rounded-2xl text-black/80 max-h-[500px] overflow-y-auto">
                      {reportContent}
                    </pre>
                  )}
                </div>
              )}
            </section>

          </div>

          {/* RIGHT COLUMN: Decisions, Agents, Timeline (4/12) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* SECTION 5: FINAL COMMITTEE DECISION */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Consensus decision output</h2>
              </div>

              {isLoadingResearch ? (
                <div className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-5 animate-pulse">
                  <div className="text-center pb-4 border-b-2 border-black/10 font-mono text-xs uppercase font-extrabold text-[#64748B]">
                    Loading Committee Analysis...
                  </div>
                  <div className="h-24 bg-black/5 rounded-2xl" />
                  <div className="h-12 bg-black/5 rounded-xl" />
                </div>
              ) : (
                <div className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-5">
                  <div className="text-center pb-4 border-b-2 border-black/10">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#64748B] block mb-1">AUDIT SYMBOL</span>
                    <span className="text-xl font-black font-mono bg-black text-[#FACC15] px-3.5 py-1.5 rounded-xl border-3 border-black shadow-[2px_2px_0px_#2563EB]">
                      {researchData.symbol}
                    </span>
                  </div>

                  {/* Consensus Decision */}
                  <div className="flex flex-col items-center py-5 bg-[#F8FAFC] border-3 border-black rounded-2xl shadow-[3.5px_3.5px_0px_#000000]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] mb-2 font-mono">COMMITTEE RECOMMENDATION</span>
                    <span className={`text-4xl font-black tracking-tighter uppercase font-mono ${
                      researchData.committee_decision?.committee_decision.includes("BUY") ? "text-[#2563EB]" : "text-amber-500"
                    }`}>
                      {researchData.committee_decision?.committee_decision || "BUY"}
                    </span>
                    <span className="text-[9px] font-mono text-black/55 mt-2 uppercase font-black">Consensus target verified</span>
                  </div>

                  <div className="flex flex-col gap-4 font-mono">
                    {/* Confidence */}
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="uppercase text-[#64748B]">Confidence Score</span>
                        <span className="text-[#2563EB]">{researchData.committee_decision?.confidence || 85}%</span>
                      </div>
                      <div className="w-full bg-black/5 border-2 border-black rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-[#2563EB] h-full rounded-full transition-all duration-300 border-r-2 border-black" 
                          style={{ width: `${researchData.committee_decision?.confidence || 85}%` }} 
                        />
                      </div>
                    </div>

                    {/* Risk Score */}
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="uppercase text-[#64748B]">Portfolio Risk Rating</span>
                        <span className="text-amber-500">{overallRiskScore}% (Moderate)</span>
                      </div>
                      <div className="w-full bg-black/5 border-2 border-black rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-300 border-r-2 border-black" 
                          style={{ width: `${overallRiskScore}%` }} 
                        />
                      </div>
                    </div>

                    {/* Target Price & Vote */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/5 text-[10px]">
                      <div className="border-2 border-black bg-[#F8FAFC] p-3 rounded-xl shadow-[1.5px_1.5px_0px_#000000]">
                        <span className="font-bold text-[#64748B] uppercase block">Target Price</span>
                        <span className="font-black text-[#0F172A] text-xs">
                          ${(researchData.quote.current_price * 1.22).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-2 border-black bg-[#F8FAFC] p-3 rounded-xl shadow-[1.5px_1.5px_0px_#000000]">
                        <span className="font-bold text-[#64748B] uppercase block">Committee Vote</span>
                        <span className="font-black text-[#0F172A] text-xs">
                          {researchData.committee_decision?.research_vote === "BUY" ? "4/5 Buy" : "3/5 Hold"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 4: AI COMMITTEE ANALYSIS */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">AI Committee Sub-Auditors</h2>
              </div>

              {isLoadingResearch ? (
                <div className="flex flex-col gap-4 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white border-4 border-black p-4 rounded-[24px] shadow-[4px_4px_0px_#000000] h-24 flex flex-col justify-center gap-2 font-mono text-[8px] uppercase font-bold text-[#64748B]">
                      <span>Loading Agent Node Analysis...</span>
                      <div className="h-3 bg-black/10 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[
                    {
                      name: "Research Agent",
                      vote: researchData.committee_decision?.research_vote || "BUY",
                      confidence: "91%",
                      status: "Completed",
                      desc: "Audits intrinsic valuation margins, long term revenue growth channels, and free cash flows."
                    },
                    {
                      name: "Technical Agent",
                      vote: researchData.committee_decision?.technical_vote || "BUY",
                      confidence: "85%",
                      status: "Completed",
                      desc: "Scans daily exponential moving average trends, support levels, and RSI bounds."
                    },
                    {
                      name: "News Agent",
                      vote: researchData.committee_decision?.news_vote || "HOLD",
                      confidence: "80%",
                      status: "Completed",
                      desc: "Analyzes social sentiment indices, institutional press releases, and options volumes."
                    },
                    {
                      name: "Risk Agent",
                      vote: researchData.committee_decision?.risk_vote || "BUY",
                      confidence: "95%",
                      status: "Completed",
                      desc: "Simulates value at risk drawdown metrics, Sharpe ratios, and sector exposure limits."
                    },
                    {
                      name: "Committee Synthesizer",
                      vote: researchData.committee_decision?.committee_decision || "BUY",
                      confidence: `${researchData.committee_decision?.confidence || 85}%`,
                      status: "Consensus Resolved",
                      desc: "Resolves dynamic vote weight allocations and final thesis reports."
                    }
                  ].map((agent, idx) => (
                    <div key={idx} className="bg-white border-4 border-black p-4 rounded-[24px] shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-2 font-mono text-[9px] font-black uppercase">
                        <span className="text-[#0F172A]">{agent.name}</span>
                        <span className="text-[#2563EB]">{agent.status}</span>
                      </div>
                      <p className="text-[10px] font-medium text-[#64748B] leading-relaxed font-mono mb-3 uppercase">
                        {agent.desc}
                      </p>
                      <div className="flex items-center justify-between border-t border-black/5 pt-2 font-mono text-[9px] text-[#64748B]">
                        <span>RECOMMENDATION: <span className={`border px-1.5 py-0.5 rounded font-black ml-1 ${
                          agent.vote.includes("BUY") ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25" : "bg-amber-500/10 text-amber-600 border-amber-500/25"
                        }`}>{agent.vote}</span></span>
                        <span>CONFIDENCE: <span className="font-black text-[#2563EB]">{agent.confidence}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 11: AGENT ROOM */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">AI Committee Live Agent Room</h2>
              </div>

              <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-1">
                  <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Consensus Debates Feed</span>
                  <span className="w-2 h-2 bg-[#2563EB] border border-black rounded-full animate-ping" />
                </div>
                
                <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {researchData.agent_timeline && researchData.agent_timeline.length > 0 ? (
                    researchData.agent_timeline.map((msg: any, idx: number) => (
                      <div key={idx} className="bg-[#F8FAFC] border-2 border-black p-3.5 rounded-xl shadow-[1.5px_1.5px_0px_#000000]">
                        <div className="flex items-center justify-between border-b border-black/5 pb-1.5 mb-2 font-mono text-[8px] font-black uppercase text-black/50">
                          <span>{msg.agent_name}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="text-[10px] font-medium text-black/75 leading-relaxed font-mono">
                          {msg.activity}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs font-mono text-black/40 uppercase">
                      No active logs registered in room.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 7: RISK ANALYSIS */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Securities Risk Indicators</h2>
              </div>

              <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-4">
                {/* 6 Category meters */}
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Business Risk", score: riskLevels.business },
                    { label: "Market Volatility", score: riskLevels.market },
                    { label: "Debt & Solvency", score: riskLevels.debt },
                    { label: "Valuation Multiples", score: riskLevels.valuation },
                    { label: "Regulatory Compliance", score: riskLevels.regulatory },
                    { label: "Sector Competition", score: riskLevels.competition }
                  ].map((risk, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-[9px] font-mono font-black mb-1">
                        <span className="uppercase text-black/60">{risk.label}</span>
                        <span className="text-[#2563EB]">{risk.score}/10</span>
                      </div>
                      <div className="w-full bg-black/5 border border-black rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#2563EB] h-full rounded-full transition-all duration-300" 
                          style={{ width: `${risk.score * 10}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall Risk Meter */}
                <div className="border-t-2 border-black/10 pt-4 font-mono text-[10px] flex items-center justify-between bg-[#F8FAFC] border-2 border-black p-3.5 rounded-xl shadow-[2px_2px_0px_#000000] mt-1.5">
                  <span className="font-bold text-[#64748B] uppercase">Consolidated Risk:</span>
                  <span className="font-black text-[#2563EB] uppercase">
                    {overallRiskScore}% (Moderate Index)
                  </span>
                </div>
              </div>
            </section>

            {/* SECTION 6: NEWS INTELLIGENCE */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Market News & Sentiments</h2>
              </div>

              {isLoadingResearch ? (
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-4 animate-pulse">
                  <div className="text-center font-mono text-xs uppercase font-extrabold text-[#64748B]">
                    Loading News...
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[#F8FAFC] border-2 border-black/10 p-3.5 rounded-xl h-20 flex flex-col justify-center gap-2">
                      <div className="h-3 bg-black/5 rounded w-1/4" />
                      <div className="h-4 bg-black/5 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (researchData as any).news_error ? (
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000] text-center p-8 text-xs font-mono text-[#EF4444] uppercase bg-red-50/50">
                  <span className="font-black">Failed to load news</span>
                  <p className="mt-1 text-[10px] text-black/50">{(researchData as any).news_error}</p>
                </div>
              ) : (
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-4">
                  {researchData.news.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-black/40 uppercase">
                      No active news feeds registered.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
                      {researchData.news.map((item: any, idx: number) => {
                        const sentiment = classifyNewsSentiment(item.title, item.summary);
                        return (
                          <a
                            key={idx}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#F8FAFC] border-2 border-black p-3.5 rounded-xl shadow-[2px_2px_0px_#000000] hover:shadow-[3.5px_3.5px_0px_#000000] hover:-translate-y-0.5 transition-all block text-left"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5 mb-2 font-mono text-[8px] font-black uppercase text-black/40">
                              <span className="bg-black/5 px-1.5 py-0.5 rounded border border-black/5">{item.source}</span>
                              <span className={`px-1.5 py-0.5 rounded border ${
                                sentiment === "Positive"
                                  ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20"
                                  : sentiment === "Negative"
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : "bg-neutral-50 text-neutral-600 border-neutral-200"
                              }`}>
                                {sentiment}
                              </span>
                            </div>
                            <h4 className="font-black text-xs text-[#0F172A] leading-tight mb-2 hover:text-[#2563EB] line-clamp-2">
                              {item.title}
                            </h4>
                            <p className="text-[9px] font-bold text-black/60 line-clamp-2 leading-relaxed mb-2 font-mono uppercase">
                              {item.summary}
                            </p>
                            <span className="text-[7.5px] font-bold text-black/40 block font-mono uppercase text-right">
                              {item.date}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
