"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Award, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ErrorCard from "@/components/ErrorCard";

interface RecommendationItem {
  ticker: string;
  recommendation: string;
  confidence_score: number;
  risk_level: string;
  created_at: string;
}

const Skeleton = ({ className = "h-4 w-full" }: { className?: string }) => (
  <div className={`bg-slate-200 animate-pulse border border-black/10 rounded-lg ${className}`} />
);

type FilterType = "ALL" | "BUY" | "HOLD" | "SELL";

export default function RecommendationsPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  const { data: recs, isLoading, error, refetch } = useQuery<RecommendationItem[]>({
    queryKey: ["recommendations-data"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/dashboard/recommendations", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load recommendations.");
      return res.json();
    },
    enabled: !!isSignedIn,
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  });

  const recommendationList = recs || [];

  const filteredList = activeFilter === "ALL"
    ? recommendationList
    : recommendationList.filter((r) => r.recommendation.toUpperCase().includes(activeFilter));

  const filters: FilterType[] = ["ALL", "BUY", "HOLD", "SELL"];

  const filterColors: Record<FilterType, string> = {
    ALL: "bg-[#0F172A] text-white border-black",
    BUY: "bg-[#2563EB] text-white border-black",
    HOLD: "bg-amber-500 text-white border-black",
    SELL: "bg-[#EF4444] text-white border-black",
  };

  const inactiveFilterColors: Record<FilterType, string> = {
    ALL: "bg-white text-[#64748B] border-black/30 hover:border-black hover:text-[#0F172A]",
    BUY: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 hover:border-[#2563EB]",
    HOLD: "bg-amber-50 text-amber-600 border-amber-300/50 hover:border-amber-500",
    SELL: "bg-rose-50 text-rose-600 border-rose-300/50 hover:border-rose-500",
  };

  const getRecBadgeStyle = (rec: string) => {
    const upper = rec.toUpperCase();
    if (upper.includes("BUY")) return "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/35";
    if (upper.includes("SELL")) return "bg-rose-100 text-rose-600 border-rose-300";
    return "bg-amber-500/10 text-[#F59E0B] border-[#F59E0B]/30";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Award className="w-8 h-8 text-[#2563EB]" />
            <span>AI Trade Recommendations</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Orchestrated Investment Signals &amp; Targeted Consensus Buy tickets
          </p>
        </div>

        {/* Stats Row */}
        {!isLoading && !error && (
          <div className="flex items-center gap-3 flex-wrap z-10">
            <div className="border-2 border-black bg-[#2563EB]/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase font-mono text-[#2563EB] shadow-[2px_2px_0px_#000000]">
              {recommendationList.filter(r => r.recommendation.toUpperCase().includes("BUY")).length} BUY
            </div>
            <div className="border-2 border-black bg-amber-50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase font-mono text-amber-600 shadow-[2px_2px_0px_#000000]">
              {recommendationList.filter(r => r.recommendation.toUpperCase().includes("HOLD")).length} HOLD
            </div>
            <div className="border-2 border-black bg-rose-50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase font-mono text-rose-600 shadow-[2px_2px_0px_#000000]">
              {recommendationList.filter(r => r.recommendation.toUpperCase().includes("SELL")).length} SELL
            </div>
          </div>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-[#64748B]" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-xl border-2 transition-all cursor-pointer shadow-[2px_2px_0px_#000000] ${
              activeFilter === f ? filterColors[f] : inactiveFilterColors[f]
            }`}
          >
            {f}
          </button>
        ))}
        {!isLoading && !error && (
          <span className="ml-auto text-[10px] font-mono font-black text-black/40 uppercase">
            {filteredList.length} signal{filteredList.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Error State */}
      {error && (
        <ErrorCard
          message={(error as Error).message || "Failed to retrieve terminal database records."}
          onRetry={() => refetch()}
        />
      )}

      {/* Main Table */}
      {!error && (
        <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                <th className="py-3.5 px-6">TICKER</th>
                <th className="py-3.5 px-6">RECOMMENDATION</th>
                <th className="py-3.5 px-6">CONFIDENCE</th>
                <th className="py-3.5 px-6">RISK EXPOSURE</th>
                <th className="py-3.5 px-6 text-right">TIMESTAMP</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><Skeleton className="h-4 w-14" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-5 w-16 rounded-lg" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-10" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-14" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><Skeleton className="h-7 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredList.length > 0 ? (
                filteredList.map((item) => (
                  <tr
                    key={item.ticker + item.created_at}
                    className="hover:bg-[#F8FAFC] transition-colors group"
                  >
                    <td className="py-4 px-6 font-mono font-black text-[#0F172A] uppercase">
                      {item.ticker}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase ${getRecBadgeStyle(item.recommendation)}`}>
                        {item.recommendation}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-black text-[#2563EB]">
                      {item.confidence_score}%
                    </td>
                    <td className="py-4 px-6 font-bold uppercase text-[10px]">{item.risk_level}</td>
                    <td className="py-4 px-6 text-right font-mono text-black/45 text-[10px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => router.push(`/research/${item.ticker}`)}
                        className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-[#2563EB] hover:text-white hover:shadow-[1.5px_1.5px_0px_#000000] active:translate-y-[1px] transition-all cursor-pointer"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-mono text-xs uppercase text-[#64748B]">
                    {activeFilter === "ALL"
                      ? "No active recommendations. Click \"AI Committee\" or search a ticker to evaluate signals."
                      : `No ${activeFilter} recommendations found in current data.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
