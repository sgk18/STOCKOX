"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useDashboardStore, WatchlistItem, MarketOverview } from "@/lib/store";
import Navbar from "@/components/dashboard/Navbar";
import PortfolioCard from "@/components/dashboard/PortfolioCard";
import MarketCard from "@/components/dashboard/MarketCard";
import WatchlistTable from "@/components/dashboard/WatchlistTable";
import AgentFeed from "@/components/dashboard/AgentFeed";
import OpportunityCard from "@/components/dashboard/OpportunityCard";
import AnalysisCard from "@/components/dashboard/AnalysisCard";
import AgentStatus from "@/components/dashboard/AgentStatus";
import QuickActions from "@/components/dashboard/QuickActions";
import { BarChart2, ShieldCheck, Compass, Bot } from "lucide-react";

export default function DashboardPage() {
  const storeWatchlist = useDashboardStore((state) => state.watchlist);
  const removeFromWatchlist = useDashboardStore((state) => state.removeFromWatchlist);
  const market = useDashboardStore((state) => state.market);
  const agents = useDashboardStore((state) => state.agents);

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
            // Even if sync fails temporarily, let's allow rendering in dev mode
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

      return rawData.map((item: RawWatchlistItem) => {
        return {
          ticker: item.ticker,
          name: item.company_name || item.ticker,
          price: item.price ?? 150.00,
          changePercent: item.change_percent ?? 0.0,
          aiScore: item.ai_score ?? 75,
          risk: item.risk ?? "Medium",
          recommendation: item.recommendation ?? "HOLD",
        };
      });
    },
    refetchInterval: 15000, // Sync every 15 seconds
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

  const activeWatchlist = apiWatchlist || storeWatchlist;
  const activeMarket = apiMarket || market;

  if (!isLoaded || (isSignedIn && !isSynced)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-black/50">
            Syncing advisor credentials...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 flex flex-col font-sans text-[#0F172A] relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute inset-0 dot-pattern-brutal pointer-events-none z-0" />

      {/* Top Navbar (80px height) */}
      <Navbar />

      {/* Main Grid Wrapper */}
      <main className="max-w-7xl mx-auto w-full px-6 flex flex-col gap-10 mt-8 relative z-10">
        
        {/* HERO SECTION - Welcome & Portfolio Balance & AI Committee Status (Top 30% of viewport approx) */}
        <section className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Side (60% equivalent) - Portfolio Balance */}
          <div className="col-span-1 lg:col-span-6">
            <PortfolioCard />
          </div>

          {/* Right Side (40% equivalent) - AI Committee Status */}
          <div className="col-span-1 lg:col-span-4 bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_#000000] flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_#000000] transition-all duration-200">
            <div>
              <div className="flex items-center gap-2 text-[#2563EB] mb-4">
                <Bot className="w-5 h-5 text-[#2563EB]" />
                <span className="text-xs font-black uppercase tracking-wider">AI Committee Diagnostics</span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#0F172A] mb-4">
                Committee Status Board
              </h3>
              
              {/* Live Status Indicators */}
              <div className="flex flex-col gap-3 font-mono">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between text-xs border-b border-black/5 pb-2 last:border-b-0 last:pb-0">
                    <span className="font-bold text-black/75">{agent.name}</span>
                    <div className="flex items-center gap-1.5 font-black uppercase text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] border border-black animate-pulse" />
                      <span className="text-[#22C55E]">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1 - Market Overview Horizontal Row */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-black" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Indices & Commodities Overview</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            {activeMarket.map((index) => (
              <MarketCard key={index.name} data={index} />
            ))}
          </div>
        </section>

        {/* SECTION 2 & 3 - Split View (60% Watchlist Table, 40% Agent Activity Feed) */}
        <section className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
          <WatchlistTable items={activeWatchlist} onRemove={removeFromWatchlist} />
          <AgentFeed />
        </section>

        {/* SECTION 4 - Opportunities Board (4 Cards Grid) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-black" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">AI Discovered Opportunities</h3>
          </div>
          <OpportunityCard />
        </section>

        {/* SECTION 5 - Recent Analyses */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-black" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Recent Agent Consensus Analyses</h3>
          </div>
          <AnalysisCard />
        </section>

        {/* SECTION 6 - Agent Status Board (Wow factor board) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-black" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Agent Core Node Diagnostics</h3>
          </div>
          <AgentStatus />
        </section>

        {/* QUICK ACTIONS - Bottom grid section */}
        <section className="flex flex-col gap-4 border-t-4 border-black pt-8">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Advisor Terminals Quick Actions</h3>
          <QuickActions />
        </section>

      </main>
    </div>
  );
}
