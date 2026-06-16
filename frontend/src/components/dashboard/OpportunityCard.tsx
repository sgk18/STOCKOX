"use client";

import React from "react";
import { Sparkles, Compass, AlertTriangle, ShieldCheck } from "lucide-react";

interface Opportunity {
  type: "Strong Buy" | "Watch" | "High Risk" | "Emerging Trend";
  ticker: string;
  score: number;
  reason: string;
  sourceAgent: string;
}

export default function OpportunityCard() {
  const opportunities: Opportunity[] = [
    {
      type: "Strong Buy",
      ticker: "NVDA",
      score: 92,
      reason: "High consensus valuation coupled with positive news sentiment triggers buy signals.",
      sourceAgent: "Committee Agent",
    },
    {
      type: "Watch",
      ticker: "MSFT",
      score: 88,
      reason: "Approaching historical support bounds; breakout triggers technical indicators.",
      sourceAgent: "Technical Agent",
    },
    {
      type: "High Risk",
      ticker: "TSLA",
      score: 64,
      reason: "Volatility triggers exceed maximum standard deviation bands; exposure audit recommended.",
      sourceAgent: "Risk Agent",
    },
    {
      type: "Emerging Trend",
      ticker: "AMD",
      score: 71,
      reason: "Sentiment indicators register high activity clusters on AI hardware chips demand.",
      sourceAgent: "News Agent",
    },
  ];

  const typeConfig = {
    "Strong Buy": {
      color: "bg-[#2563EB]/15 border-[#2563EB] text-[#2563EB]",
      icon: ShieldCheck,
      badge: "bg-[#2563EB] text-white border-black",
    },
    "Watch": {
      color: "bg-[#2563EB]/15 border-[#2563EB] text-[#1e40af]",
      icon: Compass,
      badge: "bg-[#2563EB] text-white border-black",
    },
    "High Risk": {
      color: "bg-[#EF4444]/15 border-[#EF4444] text-[#b91c1c]",
      icon: AlertTriangle,
      badge: "bg-[#EF4444] text-white border-black",
    },
    "Emerging Trend": {
      color: "bg-[#FACC15]/20 border-[#FACC15] text-[#854d0e]",
      icon: Sparkles,
      badge: "bg-[#FACC15] text-black border-black",
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
      {opportunities.map((opp) => {
        const config = typeConfig[opp.type];
        const IconComp = config.icon;
        return (
          <div
            key={opp.type}
            className={`border-3 border-black rounded-2xl p-5 bg-white shadow-[4px_4px_0px_#000000] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all duration-200 flex flex-col justify-between h-[210px]`}
          >
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black uppercase tracking-wider border-2 px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_#000000] ${config.badge}`}>
                  {opp.type}
                </span>
                <span className="text-xs font-black text-black/50 font-mono">Score: {opp.score}</span>
              </div>
              <h4 className="text-xl font-black text-[#0F172A] tracking-tight">{opp.ticker}</h4>
              <p className="text-xs font-bold text-black/70 mt-1 leading-snug font-sans truncate-3-lines">
                {opp.reason}
              </p>
            </div>

            {/* Footer agent banner */}
            <div className="border-t border-black/10 pt-3 flex items-center justify-between mt-2">
              <span className="text-[9px] font-black uppercase text-black/40">Sourced By</span>
              <div className="flex items-center gap-1">
                <IconComp className="w-3.5 h-3.5 text-black/70" />
                <span className="text-[10px] font-black text-[#0F172A] uppercase">{opp.sourceAgent}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
