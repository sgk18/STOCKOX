"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  Landmark,
  Bot,
  Globe,
  Eye,
  Award,
  ShieldAlert,
  Newspaper,
  Calendar,
  Zap
} from "lucide-react";

interface WatchlistItem {
  ticker: string;
  company_name: string;
  price: number;
  change_percent: number;
  ai_score: number;
  risk: string;
  recommendation: string;
}

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

interface AgentActivityItem {
  agent_name: string;
  message: string;
  status: string;
  created_at: string;
}

interface AnalysisItem {
  ticker: string;
  recommendation: string;
  confidence_score: number;
  risk_level: string;
  created_at: string;
}

const MOCK_EVENTS = [
  { title: "Fed Monetary Policy Meeting", date: "June 18, 2026", type: "FED", badgeColor: "bg-[#2563EB]/10 text-[#2563EB]" },
  { title: "NVIDIA Corp. Dividend Payout", date: "June 20, 2026", type: "DIVIDEND", badgeColor: "bg-[#3B82F6]/10 text-[#3B82F6]" },
  { title: "US Consumer Price Index (CPI) release", date: "June 25, 2026", type: "MACRO", badgeColor: "bg-[#60A5FA]/10 text-[#60A5FA]" },
  { title: "Microsoft Corp. Earnings Call", date: "July 22, 2026", type: "EARNINGS", badgeColor: "bg-[#2563EB]/15 text-[#2563EB]" }
];

export default function DashboardPage() {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const router = useRouter();
  const [isSynced, setIsSynced] = useState(true);
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);

  // Synchronize User profile with local DB on load
  useEffect(() => {
    async function syncProfile() {
      const isLoaded = isAuthLoaded && isUserLoaded;
      if (isLoaded && isSignedIn) {
        try {
          const token = await getToken();
          
          const name = user?.fullName || user?.username || user?.firstName || "Adviser";
          const email = user?.primaryEmailAddress?.emailAddress || "";
          const avatarUrl = user?.imageUrl || "";

          const res = await fetch("/api/v1/auth/sync-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              name: name,
              email: email,
              avatar_url: avatarUrl
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
  }, [isAuthLoaded, isUserLoaded, isSignedIn, user, getToken]);

  // 1. Fetch dynamic dashboard aggregates via React Query
  const { data: dashboardData, isLoading: isDashLoading, error: dashError } = useQuery({
    queryKey: ["dashboard-aggregate", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/dashboard${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load dashboard data.");
      return res.json();
    },
    enabled: isSignedIn && isSynced,
    refetchInterval: 30000,
  });

  // 2. Fetch dynamic risk center metrics
  const { data: riskMetrics, isLoading: isRiskLoading, error: riskError } = useQuery({
    queryKey: ["dashboard-risk-metrics", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/dashboard/risk${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load risk dashboard data.");
      return res.json();
    },
    enabled: isSignedIn && isSynced,
    refetchInterval: 30000,
  });

  // Fetch recent agent rooms
  const { data: recentRooms, isLoading: isRoomsLoading, error: roomsError } = useQuery({
    queryKey: ["recent-rooms"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/committee/recent`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load recent agent rooms.");
      return res.json();
    },
    enabled: isSignedIn && isSynced,
    refetchInterval: 15000,
  });

  // Console logging React Query variables (Step 5)
  useEffect(() => {
    console.log("[REACT-QUERY-AGGREGATE] Status:", {
      isLoading: isDashLoading,
      isError: !!dashError,
      error: dashError ? (dashError as Error).message : null,
      data: dashboardData
    });
  }, [isDashLoading, dashError, dashboardData]);

  useEffect(() => {
    console.log("[REACT-QUERY-RISK] Status:", {
      isLoading: isRiskLoading,
      isError: !!riskError,
      error: riskError ? (riskError as Error).message : null,
      data: riskMetrics
    });
  }, [isRiskLoading, riskError, riskMetrics]);

  // Redirect if not signed in
  useEffect(() => {
    const isLoaded = isAuthLoaded && isUserLoaded;
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isAuthLoaded, isUserLoaded, isSignedIn, router]);

  const isLoaded = isAuthLoaded && isUserLoaded;
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
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

  const portfolio = dashboardData?.portfolio || { value: 100000, change_percent: 0, change_amount: 0, cash_balance: 100000 };
  const watchlist: WatchlistItem[] = dashboardData?.watchlist || [];
  const marketOverview: MarketItem[] = dashboardData?.marketOverview || [];
  const agentStatuses = dashboardData?.agentStatuses || [];
  const recentAnalyses: AnalysisItem[] = dashboardData?.recentAnalyses || [];
  const agentActivity: AgentActivityItem[] = dashboardData?.agentActivity || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-10"
    >
      
      {/* SECTION 1: Portfolio Command Center */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Portfolio Command Center</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Card 1: Total Portfolio Value */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Total Assets (USD)</span>
              <h3 className="text-2xl font-black tracking-tight text-[#0F172A] font-mono">
                {isDashLoading ? (
                  "Loading..."
                ) : dashError ? (
                  <span className="text-xs text-[#EF4444] font-black">Failed to load portfolio</span>
                ) : (
                  `$${portfolio.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </h3>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-black/5 pt-3">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/20">
                {isDashLoading ? "..." : dashError ? "Error" : `${portfolio.change_percent >= 0 ? "+" : ""}${portfolio.change_percent.toFixed(2)}% today`}
              </span>
              <svg className="w-16 h-8 text-[#2563EB]" viewBox="0 0 100 30" fill="none">
                <path d="M0,25 L20,23 L40,18 L60,19 L80,10 L100,5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2: Today's P&L */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Today&apos;s P&L</span>
              <h3 className="text-2xl font-black tracking-tight text-[#0F172A] font-mono">
                {isDashLoading ? (
                  "Loading..."
                ) : dashError ? (
                  <span className="text-xs text-[#EF4444] font-black">Failed to load portfolio</span>
                ) : (
                  `${portfolio.change_amount >= 0 ? "+" : ""}$${portfolio.change_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                )}
              </h3>
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

          {/* Card 3: Cash Balance */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Liquid Cash Balance</span>
              <h3 className="text-2xl font-black tracking-tight text-[#2563EB] font-mono">
                {isDashLoading ? (
                  "Loading..."
                ) : dashError ? (
                  <span className="text-xs text-[#EF4444] font-black">Failed to load portfolio</span>
                ) : (
                  `$${portfolio.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                )}
              </h3>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-black/5 pt-3">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/20">
                USD Reserves
              </span>
              <svg className="w-16 h-8 text-[#2563EB]" viewBox="0 0 100 30" fill="none">
                <path d="M0,22 Q20,10 40,25 T80,5 T100,2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4: Volatility Score */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Portfolio Beta</span>
              <h3 className="text-2xl font-black tracking-tight text-[#0F172A] font-mono">
                {isRiskLoading ? (
                  "Loading..."
                ) : riskError ? (
                  <span className="text-xs text-[#EF4444] font-black">Failed to load risk</span>
                ) : (
                  (riskMetrics?.volatility_score || 1.18).toFixed(2)
                )}
              </h3>
            </div>
            <div className="flex flex-col gap-1.5 mt-4 border-t border-black/5 pt-3">
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-[#64748B]">
                <span>Risk Score</span>
                <span className="text-[#2563EB]">{isRiskLoading ? "..." : riskError ? "Error" : `${riskMetrics?.risk_score || 24} / 100`}</span>
              </div>
              <div className="w-full bg-black/5 border border-black rounded-full h-2 overflow-hidden">
                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${isRiskLoading || riskError ? 0 : (riskMetrics?.risk_score || 24)}%` }} />
              </div>
            </div>
          </div>

          {/* Card 5: Portfolio Health */}
          <div className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
            <div>
              <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Diversification Score</span>
              <h3 className="text-2xl font-black tracking-tight text-[#2563EB] font-mono">
                {isRiskLoading ? (
                  "Loading..."
                ) : riskError ? (
                  <span className="text-xs text-[#EF4444] font-black">Failed to load risk</span>
                ) : (
                  `${riskMetrics?.diversification_score || 88}%`
                )}
              </h3>
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
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">AI Committee Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {isDashLoading ? (
            <div className="col-span-5 text-center font-mono text-xs uppercase py-8 text-[#64748B] animate-pulse bg-white border-3 border-black rounded-[24px] shadow-[4px_4px_0px_#000000]">
              Loading committee statuses...
            </div>
          ) : dashError ? (
            <div className="col-span-5 text-center font-mono text-xs uppercase py-8 text-[#EF4444] bg-red-50 border-3 border-black rounded-[24px] shadow-[4px_4px_0px_#000000]">
              Failed to load committee data
            </div>
          ) : (
            agentStatuses.map((agent: { agent_name: string; status: string }) => (
            <div key={agent.agent_name} className="glass-brutal-card p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase text-[#64748B] tracking-widest">Committee Agent</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-black animate-pulse" />
                </div>
                <h3 className="text-sm font-black uppercase text-[#0F172A]">{agent.agent_name}</h3>
                <p className="text-[10px] font-mono font-bold text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
                  Executing advanced Multi-Agent consensus routines in background.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2 font-mono text-[9px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#64748B]">STATUS:</span>
                  <span className="font-black text-[#2563EB] uppercase">{agent.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#64748B]">CONFIDENCE:</span>
                  <span className="font-black text-[#2563EB]">85%</span>
                </div>
              </div>
            </div>
          )))}
        </div>
      </section>

      {/* SECTION 3: Market Intelligence */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Market Intelligence</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          {isDashLoading ? (
            <div className="col-span-6 text-center font-mono text-xs uppercase py-8 text-[#64748B] animate-pulse bg-white border-3 border-black rounded-[24px] shadow-[4px_4px_0px_#000000]">
              Loading market data...
            </div>
          ) : dashError ? (
            <div className="col-span-6 text-center font-mono text-xs uppercase py-8 text-[#EF4444] bg-red-50 border-3 border-black rounded-[24px] shadow-[4px_4px_0px_#000000]">
              Failed to load market data
            </div>
          ) : (
            marketOverview.map((idx) => {
              const isNegative = idx.change_percent < 0;
              return (
                <div key={idx.name} className="glass-brutal-card p-4 flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_#000000] transition-all duration-200">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#64748B] tracking-widest">{idx.name}</span>
                    <h3 className="text-base font-black tracking-tight text-[#0F172A] mt-1 font-mono">
                      {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-2 border-t border-black/5">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      isNegative 
                        ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/20" 
                        : "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20"
                    }`}>
                      {isNegative ? "" : "+"}{idx.change_percent.toFixed(2)}%
                    </span>
                    
                    <svg className={`w-12 h-6 ${isNegative ? "text-[#EF4444]" : "text-[#2563EB]"}`} viewBox="0 0 100 30" fill="none">
                      <path 
                        d={isNegative ? "M0,5 L30,10 L60,20 L100,28" : "M0,25 L30,22 L60,12 L100,4"} 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                      />
                    </svg>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Grid split-panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (8/12) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-10">
          
          {/* SECTION 4: Watchlist Snapshot */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Watchlist Snapshot</h2>
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
                    {isDashLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center font-mono text-xs uppercase text-[#64748B] animate-pulse">
                          Loading watchlist snapshot...
                        </td>
                      </tr>
                    ) : dashError ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center font-mono text-xs uppercase text-[#EF4444] bg-red-50/50">
                          Failed to load watchlist
                        </td>
                      </tr>
                    ) : watchlist.length > 0 ? (
                      watchlist.map((stock) => (
                        <tr key={stock.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-5 font-mono font-black uppercase text-[#2563EB]">
                            {stock.ticker}
                          </td>
                          <td className="py-3.5 px-5 font-black text-[#0F172A]">{stock.company_name}</td>
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
                                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${stock.ai_score}%` }} />
                              </div>
                              <span className="font-mono font-black text-[10px] text-[#2563EB]">{stock.ai_score}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => router.push(`/research/${stock.ticker}`)}
                              className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-[#2563EB] hover:text-white hover:shadow-[1.5px_1.5px_0px_#000000] active:translate-y-[1px] transition-all"
                            >
                              Analyze
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center font-mono text-xs uppercase text-black/55">
                          No watchlist entries found. Search ticker above to track.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 4.5: Recent Agent Rooms */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Recent Agent Rooms</h2>
            </div>

            <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                      <th className="py-3 px-5">Room ID / Ticker</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Created At</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                    {isRoomsLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center font-mono text-xs uppercase text-[#64748B] animate-pulse">
                          Loading recent agent rooms...
                        </td>
                      </tr>
                    ) : roomsError ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center font-mono text-xs uppercase text-[#EF4444] bg-red-50/50">
                          Failed to load agent rooms
                        </td>
                      </tr>
                    ) : recentRooms && recentRooms.length > 0 ? (
                      recentRooms.map((room: any) => (
                        <tr key={room.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-5 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#2563EB] uppercase">{room.ticker}</span>
                              <span className="text-[10px] text-black/40">({room.id.slice(0, 8)}...)</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                              room.status === "completed" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                            }`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-black/45 text-[10px]">
                            {new Date(room.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => router.push(`/committee/${room.id}`)}
                              className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-[#2563EB] hover:text-white hover:shadow-[1.5px_1.5px_0px_#000000] active:translate-y-[1px] transition-all"
                            >
                              Enter Room
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center font-mono text-xs uppercase text-black/55">
                          No active multi-agent rooms found. Trigger analysis to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 5: Recent AI Recommendations */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Recent AI Recommendations</h2>
            </div>

            <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                      <th className="py-3 px-5">Ticker</th>
                      <th className="py-3 px-5">Recommendation</th>
                      <th className="py-3 px-5">Confidence</th>
                      <th className="py-3 px-5">Risk Level</th>
                      <th className="py-3 px-5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                    {isDashLoading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center font-mono text-xs uppercase text-[#64748B] animate-pulse">
                          Loading recent recommendations...
                        </td>
                      </tr>
                    ) : dashError ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center font-mono text-xs uppercase text-[#EF4444] bg-red-50/50">
                          Failed to load recommendations
                        </td>
                      </tr>
                    ) : recentAnalyses.length > 0 ? (
                      recentAnalyses.map((rec) => (
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
                          <td className="py-3.5 px-5 font-mono font-black text-[#2563EB]">{rec.confidence_score}%</td>
                          <td className="py-3.5 px-5 font-bold uppercase text-[10px]">{rec.risk_level}</td>
                          <td className="py-3.5 px-5 text-right font-mono text-black/45 text-[10px]">
                            {new Date(rec.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center font-mono text-xs uppercase text-black/55">
                          No recent recommendations. Trigger a committee audit inside Research Terminal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 6: Research Feed */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Research Feed</h2>
            </div>

            <div className="flex flex-col gap-4">
              {isDashLoading ? (
                <div className="p-8 border-3 border-black text-center font-mono text-xs uppercase text-[#64748B] rounded-[24px] bg-white animate-pulse">
                  Loading research feed...
                </div>
              ) : dashError ? (
                <div className="p-8 border-3 border-black text-center font-mono text-xs uppercase text-[#EF4444] rounded-[24px] bg-red-50">
                  Failed to load research feed
                </div>
              ) : agentActivity.length > 0 ? (
                agentActivity.map((feed, idx) => (
                  <div key={idx} className="glass-brutal-card p-5 hover:translate-y-[-2px] transition-all duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2.5 mb-3 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 text-[8px] font-black uppercase tracking-widest text-[#2563EB]">
                          {feed.status}
                        </span>
                        <span className="text-[10px] font-black text-black/60 uppercase">{feed.agent_name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-black/40">
                        {new Date(feed.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#64748B] leading-relaxed font-mono">
                      {feed.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 border-3 border-black text-center font-mono text-xs uppercase text-[#64748B] rounded-[24px] bg-white shadow-[3px_3px_0px_#000000]">
                  No research feed entries active.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4/12) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-10">
          
          {/* SECTION 7: Risk Dashboard */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Risk Dashboard</h2>
            </div>

            <div className="glass-brutal-card p-6 flex flex-col gap-6">
              {/* Volatility Meter */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">Volatility Beta</span>
                <div className="flex items-center justify-between border-2 border-black bg-[#F8FAFC] p-3 rounded-xl shadow-[2px_2px_0px_#000000]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-[#2563EB] animate-pulse" />
                    <span className="text-xs font-black uppercase">Low Volatility</span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#2563EB]">
                    {isRiskLoading ? "..." : riskError ? "Error" : (riskMetrics?.volatility_score || 1.18).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Portfolio Risk Breakdown */}
              <div className="flex flex-col gap-3 font-mono text-xs border-t border-black/5 pt-4">
                <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider font-sans mb-1">Portfolio Exposure Limits</span>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="font-bold text-[#64748B]">Diversification Score:</span>
                  <span className="font-black text-[#2563EB]">{isRiskLoading ? "..." : riskError ? "Error" : `${riskMetrics?.diversification_score || 88} / 100`}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="font-bold text-[#64748B]">Daily Value at Risk (VaR):</span>
                  <span className="font-black text-[#2563EB]">
                    {isRiskLoading ? (
                      "..."
                    ) : riskError ? (
                      "Error"
                    ) : isDashLoading ? (
                      "..."
                    ) : dashError ? (
                      "Error"
                    ) : (
                      `$${((portfolio.value * 0.038) || 4820).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#64748B]">Sharpe Ratio:</span>
                  <span className="font-black text-[#2563EB]">2.41</span>
                </div>
              </div>

              {/* Sector Exposure list */}
              <div className="flex flex-col gap-3 border-t border-black/5 pt-4">
                <span className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">Sector Exposure</span>
                <div className="flex flex-col gap-2.5">
                  {isRiskLoading ? (
                    <span className="font-mono text-[9px] text-[#64748B] uppercase animate-pulse">Loading sector exposure...</span>
                  ) : riskError ? (
                    <span className="font-mono text-[9px] text-[#EF4444] uppercase">Failed to load sector metrics</span>
                  ) : riskMetrics?.sector_exposure && riskMetrics.sector_exposure.length > 0 ? (
                    riskMetrics.sector_exposure.map((sect: { name: string; value: number; color: string }) => (
                      <div key={sect.name}>
                        <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                          <span className="truncate max-w-[150px]">{sect.name.toUpperCase()}</span>
                          <span>{sect.value.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                          <div className="h-full rounded-full" style={{ width: `${sect.value}%`, backgroundColor: sect.color }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="font-mono text-[9px] text-[#64748B] uppercase">No sector allocations active.</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 8: Upcoming Events */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Upcoming Events</h2>
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
      
    </motion.div>
  );
}
