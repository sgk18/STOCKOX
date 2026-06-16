"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

interface WatchlistItem {
  ticker: string;
  company_name: string;
  price: number;
  change_percent: number;
  ai_score: number;
  risk: string;
  recommendation: string;
}

export default function WatchlistsPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  // Fetch watchlist data dynamically from database endpoint
  const { data: watchlist = [], isLoading, error } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist-data"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/watchlist", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load watchlist assets.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    console.log("[REACT-QUERY-WATCHLIST] Status:", {
      isLoading,
      isError: !!error,
      error: error ? (error as Error).message : null,
      data: watchlist
    });
  }, [isLoading, error, watchlist]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse p-4">
        <div className="h-32 bg-black/5 border-4 border-black rounded-[24px]" />
        <div className="h-64 bg-black/5 border-4 border-black rounded-[24px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 border-4 border-black bg-red-50 text-[#EF4444] rounded-[24px] shadow-[4px_4px_0px_#000000] font-mono text-xs uppercase">
        <span className="font-black">Error:</span> Failed to retrieve terminal database records.
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Eye className="w-8 h-8 text-[#2563EB]" />
            <span>Watchlists Terminal</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Custom Security tracking arrays & Real-time alert indices
          </p>
        </div>
      </section>

      {/* List */}
      {watchlist.length > 0 ? (
        <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                <th className="py-3.5 px-6">TICKER</th>
                <th className="py-3.5 px-6">COMPANY NAME</th>
                <th className="py-3.5 px-6">PRICE</th>
                <th className="py-3.5 px-6">DAILY CHANGE</th>
                <th className="py-3.5 px-6">AI SCORE</th>
                <th className="py-3.5 px-6">RECOMMENDATION</th>
                <th className="py-3.5 px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
              {watchlist.map((item) => {
                const isNegative = item.change_percent < 0;
                return (
                  <tr key={item.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 font-mono font-black text-[#2563EB] uppercase">{item.ticker}</td>
                    <td className="py-4 px-6 font-black text-[#0F172A]">{item.company_name}</td>
                    <td className="py-4 px-6 font-mono font-bold">${item.price.toFixed(2)}</td>
                    <td className="py-4 px-6 font-mono">
                      <span className={`inline-flex items-center gap-0.5 font-black uppercase ${
                        isNegative ? "text-[#EF4444]" : "text-[#2563EB]"
                      }`}>
                        {isNegative ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isNegative ? "" : "+"}{item.change_percent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-black text-[#2563EB]">{item.ai_score}%</td>
                    <td className="py-4 px-6">
                      <span className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/35 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg">
                        {item.recommendation}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/research-terminal?ticker=${item.ticker}`)}
                        className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-black hover:text-white transition-all shadow-[1.5px_1.5px_0px_#000000] cursor-pointer"
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Actionable Empty State */
        <div className="glass-brutal-card p-12 text-center flex flex-col items-center gap-4 bg-white">
          <Sparkles className="w-12 h-12 text-[#2563EB] animate-pulse" />
          <h3 className="text-base font-black uppercase text-[#0F172A]">Watchlist is Empty</h3>
          <p className="text-xs font-medium text-[#64748B] max-w-sm font-mono leading-relaxed">
            Your custom tracking profile does not contain any monitored assets. Use the search bar in the top navigation or click below to audit stock options.
          </p>
          <button
            onClick={() => router.push("/dashboard/research-terminal?ticker=NVDA")}
            className="border-3 border-black bg-white hover:bg-[#2563EB] hover:text-white rounded-xl py-2 px-5 text-xs font-black uppercase shadow-[2.5px_2.5px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer mt-2"
          >
            Audit NVIDIA Corp
          </button>
        </div>
      )}
    </motion.div>
  );
}
