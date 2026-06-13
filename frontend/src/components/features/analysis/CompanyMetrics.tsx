"use client";

import React from "react";
import { StockDetails } from "@/lib/analysisStore";
import { Landmark, TrendingUp, BarChart4, DollarSign, Wallet } from "lucide-react";

interface CompanyMetricsProps {
  stock: StockDetails;
}

export default function CompanyMetrics({ stock }: CompanyMetricsProps) {
  const metrics = [
    {
      label: "Current Price",
      value: `$${stock.current_price.toFixed(2)}`,
      icon: DollarSign,
      color: "text-[#2563EB]",
    },
    {
      label: "Market Cap",
      value: stock.market_cap,
      icon: Landmark,
      color: "text-black",
    },
    {
      label: "Volume",
      value: stock.volume,
      icon: BarChart4,
      color: "text-black",
    },
    {
      label: "P/E Ratio",
      value: stock.pe_ratio.toString(),
      icon: TrendingUp,
      color: "text-[#2563EB]",
    },
    {
      label: "Earnings Per Share (EPS)",
      value: `$${stock.eps.toFixed(2)}`,
      icon: Wallet,
      color: "text-[#22C55E]",
    },
    {
      label: "Revenue (TTM)",
      value: stock.revenue,
      icon: Landmark,
      color: "text-black",
    },
    {
      label: "52 Week High",
      value: `$${stock.fifty_two_w_high.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-[#22C55E]",
    },
    {
      label: "52 Week Low",
      value: `$${stock.fifty_two_w_low.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-[#EF4444]",
    },
  ];

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Overview Block */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
        <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4">
          Company Overview
        </h4>
        <p className="text-xs md:text-sm font-bold text-black/70 leading-relaxed">
          {stock.overview}
        </p>
      </div>

      {/* Financial Metrics Grid */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
        <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4">
          Financial Diagnostics
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map((m) => {
            const IconComp = m.icon;
            return (
              <div
                key={m.label}
                className="bg-[#F8FAFC] border-2 border-black p-4 rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#000000]"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-black/40 tracking-wider mb-1">
                    {m.label}
                  </span>
                  <span className={`text-base font-black ${m.color}`}>{m.value}</span>
                </div>
                <IconComp className="w-5 h-5 text-black/30" />
              </div>
            );
          })}
        </div>

        {/* Debt-to-Equity / Risk Indicators */}
        <div className="mt-6 border-t-2 border-dashed border-black/20 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="font-mono text-xs">
            <span className="font-bold text-black/50 block uppercase text-[10px] tracking-wider mb-0.5">
              Leverage Debt Ratio
            </span>
            <span className="font-black text-black">{stock.debt_ratio.toFixed(2)}x</span>
          </div>
          <div className="w-full sm:w-1/2 bg-black/10 h-3 border-2 border-black rounded-full overflow-hidden">
            <div
              className={`h-full border-r border-black ${
                stock.debt_ratio > 0.8
                  ? "bg-[#EF4444]"
                  : stock.debt_ratio > 0.4
                  ? "bg-[#FACC15]"
                  : "bg-[#22C55E]"
              }`}
              style={{ width: `${Math.min(stock.debt_ratio * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
