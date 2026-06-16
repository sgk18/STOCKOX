"use client";

import React from "react";
import { FileText, CheckCircle } from "lucide-react";

interface Analysis {
  ticker: string;
  name: string;
  recommendation: "BUY" | "HOLD" | "SELL";
  confidence: number;
  date: string;
}

export default function AnalysisCard() {
  const analyses: Analysis[] = [
    { ticker: "NVIDIA", name: "NVIDIA Corporation", recommendation: "BUY", confidence: 87, date: "2 hrs ago" },
    { ticker: "TSLA", name: "Tesla Inc.", recommendation: "HOLD", confidence: 64, date: "4 hrs ago" },
    { ticker: "AAPL", name: "Apple Inc.", recommendation: "BUY", confidence: 82, date: "1 day ago" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
      {analyses.map((item) => {
        const isBuy = item.recommendation === "BUY";
        return (
          <div
            key={item.ticker}
            className="bg-white border-3 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000000] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all duration-200 flex flex-col justify-between h-[170px]"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-black/50">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{item.date}</span>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black rounded shadow-[1px_1px_0px_#000000] ${
                  isBuy ? "bg-[#2563EB] text-white" : "bg-[#FACC15] text-black"
                }`}>
                  {item.recommendation}
                </span>
              </div>

              {/* Ticker Name */}
              <h4 className="text-lg font-black text-[#0F172A] tracking-tight">{item.ticker}</h4>
              <p className="text-[10px] text-black/40 font-bold uppercase">{item.name}</p>
            </div>

            {/* Bottom details */}
            <div className="border-t border-black/10 pt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-black/50 uppercase">Analysis Confidence</span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-[#2563EB]">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{item.confidence}%</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
