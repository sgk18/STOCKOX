"use client";

import React from "react";
import { TrendingUp, Landmark, Calendar } from "lucide-react";
import { useDashboardStore } from "@/lib/store";

export default function PortfolioCard() {
  const user = useDashboardStore((state) => state.user);
  const portfolio = useDashboardStore((state) => state.portfolio);

  return (
    <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_#000000] relative overflow-hidden flex flex-col justify-between h-full hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_#000000] transition-all duration-200">
      {/* Decorative Matrix Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />

      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#2563EB]">
            <Landmark className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">Secure Audit Portfolio</span>
          </div>
          <div className="flex items-center gap-1 text-black/40 text-[10px] font-black uppercase">
            <Calendar className="w-3.5 h-3.5" />
            <span>Real-time</span>
          </div>
        </div>

        <h3 className="text-xl font-bold text-black/60 uppercase">
          Welcome back, <span className="text-black font-black">{user.name}</span>
        </h3>
        <p className="text-xs text-black/40 font-bold uppercase tracking-wide mt-1">
          Authorized Committee Terminal Account
        </p>
      </div>

      {/* Pricing Data */}
      <div className="my-6">
        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest block mb-1">
          Total Net Assets (USD)
        </span>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A]">
            ${portfolio.value.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-black bg-[#22C55E] text-black border-2 border-black px-2.5 py-1 rounded-lg shadow-[2px_2px_0px_#000000]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{portfolio.changePercent}%</span>
          </span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="border-t-2 border-black/10 pt-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-black/50 uppercase">Safety Leverage Margin</span>
          <span className="text-black font-black">94.8% Stable</span>
        </div>
        <div className="w-full bg-[#F8FAFC] border-2 border-black rounded-full h-4 overflow-hidden relative shadow-[1px_1px_0px_#000000]">
          <div className="bg-[#22C55E] h-full rounded-full border-r-2 border-black" style={{ width: "94.8%" }} />
        </div>
      </div>
    </div>
  );
}
