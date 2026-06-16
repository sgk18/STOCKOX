"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Globe, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

export default function MarketIntelligencePage() {
  const { getToken, isSignedIn } = useAuth();

  // Fetch market overview indices dynamically
  const { data: market = [], isLoading, error } = useQuery<MarketItem[]>({
    queryKey: ["market-overview-indices"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/market-overview", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load market overview indices.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse p-4">
        <div className="h-32 bg-black/5 border-4 border-black rounded-[24px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-44 bg-black/5 border-4 border-black rounded-[24px]" />
          <div className="h-44 bg-black/5 border-4 border-black rounded-[24px]" />
          <div className="h-44 bg-black/5 border-4 border-black rounded-[24px]" />
        </div>
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
      className="flex flex-col gap-8 animate-fadeIn"
    >
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Globe className="w-8 h-8 text-[#2563EB]" />
            <span>Market Intelligence Terminal</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Macro Economics, Major Global Indices & Commodity Liquidity Indexes
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {market.map((index) => {
          const isNegative = index.change_percent < 0;
          return (
            <div 
              key={index.name} 
              className="glass-brutal-card p-6 bg-white flex flex-col justify-between hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-0.5 transition-all duration-200"
            >
              <div>
                <span className="text-[9px] font-black uppercase text-[#64748B] tracking-widest block font-mono">GLOBAL CORRELATION NODE</span>
                <h3 className="text-lg font-black uppercase text-[#0F172A] mt-2">{index.name}</h3>
                
                <div className="flex items-baseline gap-2 mt-4 font-mono">
                  <span className="text-2xl font-black tracking-tight text-[#0F172A]">
                    {index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    isNegative 
                      ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" 
                      : "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20"
                  }`}>
                    {isNegative ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {isNegative ? "" : "+"}{index.change_percent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Sparkline & Diagnostics */}
              <div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between">
                <span className="text-[9px] font-mono text-black/40 uppercase">LIVE TICKS ACTIVE</span>
                <svg className={`w-16 h-8 ${isNegative ? "text-[#EF4444]" : "text-[#2563EB]"}`} viewBox="0 0 100 30" fill="none">
                  <path 
                    d={isNegative ? "M0,5 L20,8 L40,18 L60,15 L80,22 L100,28" : "M0,25 L20,23 L40,12 L60,18 L80,8 L100,2"} 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

    </motion.div>
  );
}
