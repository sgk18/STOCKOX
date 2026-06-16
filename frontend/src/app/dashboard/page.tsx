"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useDashboardStore, WatchlistItem, MarketOverview } from "@/lib/store";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Bot,
  Globe,
  Eye,
  Award,
  ShieldAlert,
  Newspaper,
  Calendar,
  Layers,
  ArrowUpRight,
  Zap,
  Activity,
  UserCheck,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react";

// Mock event and recommendation datasets to populate requested sections
const MOCK_RECOMMENDATIONS = [
  { ticker: "NVDA", recommendation: "STRONG BUY", confidence: 94, target: "$210.00", risk: "Low", generator: "Committee Synth", time: "10 min ago" },
  { ticker: "MSFT", recommendation: "BUY", confidence: 88, target: "$450.00", risk: "Low", generator: "Technical Agent", time: "25 min ago" },
  { ticker: "AAPL", recommendation: "BUY", confidence: 82, target: "$195.00", risk: "Low", generator: "Research Agent", time: "1 hour ago" },
  { ticker: "AMD", recommendation: "HOLD", confidence: 71, target: "$175.00", risk: "Medium", generator: "Risk Agent", time: "3 hours ago" },
  { ticker: "TSLA", recommendation: "HOLD", confidence: 64, target: "$220.00", risk: "High", generator: "Committee Synth", time: "5 hours ago" }
];

const MOCK_RESEARCH_FEED = [
  { tag: "EARNINGS", agent: "Research Agent", title: "NVIDIA Corp. Q1 earnings beat expectations", text: "Gross margin expands to 76.2%. Data center demand remains supply-constrained. Target increased.", time: "10:14 AM" },
  { tag: "MACRO", agent: "News Agent", title: "US Fed retains benchmark interest rates", text: "Hawkish dot-plot signal. Sector rotation detected towards large-cap tech. Volatility expected.", time: "09:45 AM" },
  { tag: "TECHNICAL", agent: "Technical Agent", title: "S&P 500 tests support at 5400 level", text: "Moving average consolidation is completed. Daily candle strength remains bullish for tech indexes.", time: "09:12 AM" },
  { tag: "REGULATORY", agent: "News Agent", title: "EU probes AI infrastructure licensing deals", text: "Monitoring impact on hyperscalers. Risk scores adjusted for continental software holdings.", time: "08:30 AM" }
];

const MOCK_EVENTS = [
  { title: "Fed Monetary Policy Meeting", date: "June 18, 2026", type: "FED", badgeColor: "bg-[#2563EB]/10 text-[#2563EB]" },
  { title: "NVIDIA Corp. Dividend Payout", date: "June 20, 2026", type: "DIVIDEND", badgeColor: "bg-[#3B82F6]/10 text-[#3B82F6]" },
  { title: "US Consumer Price Index (CPI) release", date: "June 25, 2026", type: "MACRO", badgeColor: "bg-[#60A5FA]/10 text-[#60A5FA]" },
  { title: "Microsoft Corp. Earnings Call", date: "July 22, 2026", type: "EARNINGS", badgeColor: "bg-[#2563EB]/15 text-[#2563EB]" }
];

export default function DashboardPage() {
  const storeWatchlist = useDashboardStore((state) => state.watchlist);
  const removeFromWatchlist = useDashboardStore((state) => state.removeFromWatchlist);
  const market = useDashboardStore((state) => state.market);
  const agents = useDashboardStore((state) => state.agents);
  const portfolio = useDashboardStore((state) => state.portfolio);

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isSynced, setIsSynced] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Synchronize User profile with local DB on load
  useEffect(() => {
    async function syncProfile() {
      if (isLoaded && isSignedIn && user) {
        try {
          const token = await getToken();
          const res = await fetch("/api/v1/auth/sync-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              name: user.fullName || user.username || user.firstName || "Adviser",
              email: user.primaryEmailAddress?.emailAddress || "",
              avatar_url: user.imageUrl || ""
            })
          });
          if (res.ok) {
            setIsSynced(true);
          } else {
            console.error("[SYNC] Sync endpoint returned error status:", res.status);
            setIsSynced(true);
          }
        } catch (err) {
          console.error("[SYNC-ERR] Failed to contact sync endpoint:", err);
          setIsSynced(true);
        }
      }
    }
    syncProfile();
  }, [isLoaded, isSignedIn, user, getToken]);

  // TanStack Query to sync watchlist updates from API
  const { data: apiWatchlist } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/watchlist", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch watchlist API");
      const rawData = await res.json();

      interface RawWatchlistItem {
        ticker: string;
        company_name?: string;
        price?: number;
        change_percent?: number;
        ai_score?: number;
        risk?: string;
        recommendation?: string;
      }

      return rawData.map((item: RawWatchlistItem) => ({
        ticker: item.ticker,
        name: item.company_name || item.ticker,
        price: item.price ?? 150.00,
        changePercent: item.change_percent ?? 0.0,
        aiScore: item.ai_score ?? 75,
        risk: item.risk ?? "Medium",
        recommendation: item.recommendation ?? "HOLD",
      }));
    },
    refetchInterval: 15000,
    enabled: isSignedIn && isSynced,
  });

  // TanStack Query to sync indices from Mock API
  const { data: apiMarket } = useQuery<MarketOverview[]>({
    queryKey: ["market-overview"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/market-overview", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch market overview API");
      const rawData = await res.json();
      interface RawMarketOverviewItem {
        name: string;
        price?: number;
        change?: number;
        change_percent?: number;
      }

      return rawData.map((item: RawMarketOverviewItem) => {
        const val = item.price || 0;
        const chg = item.change || 0;
        const history = [
          { time: "10:00", value: val - chg * 0.8 },
          { time: "11:00", value: val - chg * 0.5 },
          { time: "12:00", value: val - chg * 0.6 },
          { time: "13:00", value: val - chg * 0.2 },
          { time: "14:00", value: val },
        ];
        return {
          name: item.name,
          value: val,
          changePercent: item.change_percent || 0,
          history: history,
        };
      });
    },
    refetchInterval: 20000,
    enabled: isSignedIn && isSynced,
  });

  const activeWatchlist = (apiWatchlist || storeWatchlist).slice(0, 5);
  const rawMarket = apiMarket || market;

  // Add Crude Oil to meet user spec if missing
  const activeMarket = [...rawMarket];
  if (!activeMarket.some(m => m.name.toLowerCase().includes("crude"))) {
    activeMarket.push({
      name: "Crude Oil",
      value: 78.45,
      changePercent: -1.25,
      history: [
        { time: "10:00", value: 79.5 },
        { time: "11:00", value: 79.2 },
        { time: "12:00", value: 78.9 },
        { time: "13:00", value: 78.6 },
        { time: "14:00", value: 78.45 },
      ]
    });
  }

  if (!isLoaded || (isSignedIn && !isSynced)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black text-white text-lg">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Syncing Terminal Credentials...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      
      {/* SECTION 1: Portfolio Command Center */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Portfolio Command Center</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Card 1: Total Portfolio Value */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Total Assets (USD)</span>
              <h3 className="text-2xl font-black tracking-tight text-[#0F172A]">${portfolio.value.toLocaleString()}</h3>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-black/5 pt-3">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/20">
                +{portfolio.changePercent}% today
              </span>
              <svg className="w-16 h-8 text-[#2563EB]" viewBox="0 0 100 30" fill="none">
                <path d="M0,25 L20,23 L40,18 L60,19 L80,10 L100,5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2: Today's P&L */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Today's P&L</span>
              <h3 className="text-2xl font-black tracking-tight text-[#0F172A]">+${portfolio.changeAmount.toLocaleString()}</h3>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-black/5 pt-3">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/20">
                Active Audit
              </span>
              <svg className="w-16 h-8 text-[#2563EB]" viewBox="0 0 100 30" fill="none">
                <path d="M0,28 L20,25 L40,15 L60,18 L80,8 L100,2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3: Weekly Return */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Weekly Return</span>
              <h3 className="text-2xl font-black tracking-tight text-[#2563EB] font-sans">+$8,240</h3>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-black/5 pt-3">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/20">
                +6.8% Week
              </span>
              <svg className="w-16 h-8 text-[#2563EB]" viewBox="0 0 100 30" fill="none">
                <path d="M0,22 Q20,10 40,25 T80,5 T100,2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4: Risk Score */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Risk Score</span>
              <h3 className="text-2xl font-black tracking-tight text-[#0F172A]">24 <span className="text-xs text-[#64748B]">/ 100</span></h3>
            </div>
            <div className="flex flex-col gap-1.5 mt-4 border-t border-black/5 pt-3">
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-[#64748B]">
                <span>Low Risk Exposure</span>
                <span className="text-[#2563EB]">Stable</span>
              </div>
              <div className="w-full bg-black/5 border border-black rounded-full h-2 overflow-hidden">
                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: "24%" }} />
              </div>
            </div>
          </div>

          {/* Card 5: Portfolio Health */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Portfolio Health</span>
              <h3 className="text-2xl font-black tracking-tight text-[#2563EB]">98.4%</h3>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-black/5 pt-3">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/20">
                Optimized
              </span>
              <svg className="w-16 h-8 text-[#2563EB]" viewBox="0 0 100 30" fill="none">
                <circle cx="50" cy="15" r="12" stroke="currentColor" strokeWidth="3" strokeDasharray="60 15" fill="none" className="animate-spin" style={{ animationDuration: "12s" }} />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: AI Committee Overview */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">AI Committee Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase text-[#64748B] tracking-widest">{agent.role}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-black animate-pulse" />
                </div>
                <h3 className="text-sm font-black uppercase text-[#0F172A]">{agent.name}</h3>
                <p className="text-[10px] font-mono font-bold text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
                  {agent.activity}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2 font-mono text-[9px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#64748B]">STATUS:</span>
                  <span className="font-black text-[#2563EB] uppercase">{agent.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#64748B]">CONFIDENCE:</span>
                  <span className="font-black text-[#2563EB]">89%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: Market Intelligence */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Market Intelligence</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          {activeMarket.map((idx) => {
            const isNegative = idx.changePercent < 0;
            return (
              <div key={idx.name} className="glass-brutal-card p-4 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#64748B] tracking-widest">{idx.name}</span>
                  <h3 className="text-base font-black tracking-tight text-[#0F172A] mt-1">
                    {idx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="flex items-center justify-between mt-4 pt-2 border-t border-black/5">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    isNegative 
                      ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/20" 
                      : "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20"
                  }`}>
                    {isNegative ? "" : "+"}{idx.changePercent.toFixed(2)}%
                  </span>
                  
                  {/* Subtle animated blue path */}
                  <svg className={`w-12 h-6 ${isNegative ? "text-[#EF4444]" : "text-[#2563EB]"}`} viewBox="0 0 100 30" fill="none">
                    <path 
                      d={isNegative ? "M0,5 L30,10 L60,20 L100,28" : "M0,25 L30,22 L60,12 L100,4"} 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      className="path-signal"
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Grid container for split-panel dashboard sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (8/12 equivalent) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-10">
          
          {/* SECTION 4: Watchlist Snapshot */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Watchlist Snapshot</h2>
            </div>

            <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                      <th className="py-3 px-5">Ticker</th>
                      <th className="py-3 px-5">Name</th>
                      <th className="py-3 px-5">Price</th>
                      <th className="py-3 px-5">AI Signal</th>
                      <th className="py-3 px-5">Confidence</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                    {activeWatchlist.map((stock) => (
                      <tr key={stock.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5 font-mono font-black uppercase text-[#2563EB]">
                          {stock.ticker}
                        </td>
                        <td className="py-3.5 px-5 font-black text-[#0F172A]">{stock.name}</td>
                        <td className="py-3.5 px-5 font-mono font-bold">${stock.price.toFixed(2)}</td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase ${
                            stock.recommendation === "BUY" 
                              ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25" 
                              : "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/25"
                          }`}>
                            {stock.recommendation}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                              <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${stock.aiScore}%` }} />
                            </div>
                            <span className="font-mono font-black text-[10px] text-[#2563EB]">{stock.aiScore}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => router.push(`/dashboard/research-terminal?ticker=${stock.ticker}`)}
                            className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-[#2563EB] hover:text-white hover:shadow-[1.5px_1.5px_0px_#000000] active:translate-y-[1px] transition-all"
                          >
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 5: Recent AI Recommendations */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Recent AI Recommendations</h2>
            </div>

            <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                      <th className="py-3 px-5">Ticker</th>
                      <th className="py-3 px-5">Recommendation</th>
                      <th className="py-3 px-5">Confidence</th>
                      <th className="py-3 px-5">Target Price</th>
                      <th className="py-3 px-5">Risk Level</th>
                      <th className="py-3 px-5">Generated By</th>
                      <th className="py-3 px-5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                    {MOCK_RECOMMENDATIONS.map((rec) => (
                      <tr key={rec.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5 font-mono font-black uppercase text-[#0F172A]">
                          {rec.ticker}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase ${
                            rec.recommendation.includes("BUY")
                              ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/35"
                              : "bg-amber-500/10 text-[#F59E0B] border-[#F59E0B]/30"
                          }`}>
                            {rec.recommendation}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono font-black text-[#2563EB]">{rec.confidence}%</td>
                        <td className="py-3.5 px-5 font-mono font-bold text-black/80">{rec.target}</td>
                        <td className="py-3.5 px-5 font-bold uppercase text-[10px]">{rec.risk}</td>
                        <td className="py-3.5 px-5 font-mono text-[#64748B] text-[10px]">{rec.generator}</td>
                        <td className="py-3.5 px-5 text-right font-mono text-black/45 text-[10px]">{rec.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 6: Research Feed */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Research Feed</h2>
            </div>

            <div className="flex flex-col gap-4">
              {MOCK_RESEARCH_FEED.map((feed, idx) => (
                <div key={idx} className="glass-brutal-card p-5 hover:translate-y-[-2px] transition-all duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 text-[8px] font-black uppercase tracking-widest text-[#2563EB]">
                        {feed.tag}
                      </span>
                      <span className="text-[10px] font-black text-black/60 uppercase font-mono">{feed.agent}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-black/40">{feed.time}</span>
                  </div>
                  <h4 className="text-sm font-black uppercase text-[#0F172A]">{feed.title}</h4>
                  <p className="text-xs font-medium text-[#64748B] mt-1.5 leading-relaxed font-mono">
                    {feed.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4/12 equivalent) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-10">
          
          {/* SECTION 7: Risk Dashboard */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Risk Dashboard</h2>
            </div>

            <div className="glass-brutal-card p-6 flex flex-col gap-6">
              {/* Volatility Meter */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">Volatility Meter</span>
                <div className="flex items-center justify-between border-2 border-black bg-[#F8FAFC] p-3 rounded-xl shadow-[2px_2px_0px_#000000]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-[#2563EB] animate-pulse" />
                    <span className="text-xs font-black uppercase">Low Volatility</span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#2563EB]">14.2%</span>
                </div>
              </div>

              {/* Portfolio Risk Breakdown */}
              <div className="flex flex-col gap-3 font-mono text-xs border-t border-black/5 pt-4">
                <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider font-sans mb-1">Portfolio Exposure Limits</span>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="font-bold text-[#64748B]">Diversification Score:</span>
                  <span className="font-black text-[#2563EB]">88 / 100</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="font-bold text-[#64748B]">VAR (Value at Risk 95%):</span>
                  <span className="font-black text-[#2563EB]">$4,820 / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#64748B]">Sharpe Ratio:</span>
                  <span className="font-black text-[#2563EB]">2.41</span>
                </div>
              </div>

              {/* Sector Exposure list */}
              <div className="flex flex-col gap-3 border-t border-black/5 pt-4">
                <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">Sector Exposure</span>
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                      <span>TECHNOLOGY</span>
                      <span>52%</span>
                    </div>
                    <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                      <div className="bg-[#2563EB] h-full rounded-full" style={{ width: "52%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                      <span>FINANCIALS</span>
                      <span>22%</span>
                    </div>
                    <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                      <div className="bg-[#3B82F6] h-full rounded-full" style={{ width: "22%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                      <span>HEALTHCARE</span>
                      <span>15%</span>
                    </div>
                    <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                      <div className="bg-[#60A5FA] h-full rounded-full" style={{ width: "15%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 8: Upcoming Events */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Upcoming Events</h2>
            </div>

            <div className="glass-brutal-card p-6 flex flex-col gap-4">
              {MOCK_EVENTS.map((event, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-[#F8FAFC] border-2 border-black p-3.5 rounded-xl shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] transition-all">
                  <div className={`px-2.5 py-1.5 rounded-lg border-2 border-black font-mono text-[9px] font-black uppercase tracking-wider shrink-0 ${event.badgeColor}`}>
                    {event.type}
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-xs font-black uppercase text-[#0F172A] truncate leading-none mb-1">{event.title}</h4>
                    <span className="text-[10px] font-mono text-black/45">{event.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

      </div>
      
    </div>
  );
}
