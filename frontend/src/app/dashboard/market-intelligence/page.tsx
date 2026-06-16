"use client";

import React from "react";
import { Globe, TrendingUp, TrendingDown, ArrowUpRight, Zap, Layers, RefreshCw } from "lucide-react";
import { useDashboardStore } from "@/lib/store";

export default function MarketIntelligencePage() {
  const market = useDashboardStore((state) => state.market);

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
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
          const isNegative = index.changePercent < 0;
          return (
            <div key={index.name} className="glass-brutal-card p-6 flex flex-col justify-between hover:translate-y-[-3px] transition-all">
              <div>
                <span className="text-[9px] font-black uppercase text-[#64748B] tracking-widest block font-mono">GLOBAL CORRELATION NODE</span>
                <h3 className="text-lg font-black uppercase text-[#0F172A] mt-2">{index.name}</h3>
                
                <div className="flex items-baseline gap-2 mt-4 font-mono">
                  <span className="text-2xl font-black tracking-tight text-[#0F172A]">
                    ${index.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    isNegative 
                      ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" 
                      : "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20"
                  }`}>
                    {isNegative ? "" : "+"}{index.changePercent}%
                  </span>
                </div>
              </div>

              {/* Sparkline & Diagnostics */}
              <div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between">
                <span className="text-[9px] font-mono text-black/40 uppercase">Update: 1 sec ago</span>
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

    </div>
  );
}
