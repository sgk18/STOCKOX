"use client";

import React from "react";
import { CompanyProfile, FinancialMetrics } from "@/lib/selectedStockStore";
import { Landmark, TrendingUp, DollarSign, Wallet, Award } from "lucide-react";

interface CompanyMetricsProps {
  profile: CompanyProfile;
  metrics: FinancialMetrics | null;
}

export default function CompanyMetrics({ profile, metrics }: CompanyMetricsProps) {
  // Helpers to format large values (e.g. 1.2T, 250M)
  const formatLargeNumber = (num: number) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)} Trillion`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} Billion`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)} Million`;
    return num.toLocaleString();
  };

  const getMetricItems = () => {
    if (!metrics) return [];
    return [
      {
        label: "Price / Earnings (P/E)",
        value: metrics.pe ? metrics.pe.toFixed(2) : "N/A",
        icon: TrendingUp,
        color: "text-[#2563EB]",
      },
      {
        label: "Earnings Per Share (EPS)",
        value: metrics.eps ? `$${metrics.eps.toFixed(2)}` : "N/A",
        icon: Wallet,
        color: "text-[#2563EB]",
      },
      {
        label: "Return on Equity (ROE)",
        value: metrics.roe ? `${metrics.roe.toFixed(2)}%` : "N/A",
        icon: Award,
        color: "text-black",
      },
      {
        label: "Revenue Growth YOY",
        value: metrics.revenueGrowth ? `${metrics.revenueGrowth.toFixed(2)}%` : "N/A",
        icon: TrendingUp,
        color: "text-[#3B82F6]",
      },
      {
        label: "Net Profit Margin",
        value: metrics.profitMargin ? `${metrics.profitMargin.toFixed(2)}%` : "N/A",
        icon: Wallet,
        color: "text-[#2563EB]",
      },
      {
        label: "Current Ratio",
        value: metrics.currentRatio ? `${metrics.currentRatio.toFixed(2)}x` : "N/A",
        icon: Landmark,
        color: "text-black",
      },
      {
        label: "Operating Cash Flow",
        value: formatLargeNumber(metrics.cashFlow),
        icon: DollarSign,
        color: "text-[#60A5FA]",
      },
      {
        label: "Total Revenue TTM",
        value: formatLargeNumber(metrics.revenue),
        icon: Landmark,
        color: "text-black",
      },
    ];
  };

  const metricItems = getMetricItems();

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      {/* Overview Block */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
        <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4">
          Company Overview
        </h4>
        <p className="text-xs md:text-sm font-bold text-black/70 leading-relaxed">
          {profile.description || "No overview available for this asset."}
        </p>
        
        {/* Country & Employees Details */}
        <div className="grid grid-cols-2 gap-4 mt-4 font-mono text-[10px] bg-[#F8FAFC] p-3 rounded-xl border border-black/10">
          <div>
            <span className="text-black/40 font-bold block uppercase tracking-wider mb-0.5">Headquarters</span>
            <span className="font-black text-black">{profile.country || "United States"}</span>
          </div>
          <div>
            <span className="text-black/40 font-bold block uppercase tracking-wider mb-0.5">Staff</span>
            <span className="font-black text-black">
              {profile.employees ? profile.employees.toLocaleString() : "N/A"} Employees
            </span>
          </div>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
        <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-4">
          Financial Diagnostics (Live API)
        </h4>
        
        {!metrics ? (
          <div className="p-8 text-center text-xs font-mono text-black/40 uppercase tracking-widest">
            Fetching company financials...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {metricItems.map((m) => {
                const IconComp = m.icon;
                return (
                  <div
                    key={m.label}
                    className="bg-[#F8FAFC] border-2 border-black p-4 rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-black/40 tracking-wider mb-1">
                        {m.label}
                      </span>
                      <span className={`text-sm md:text-base font-black ${m.color}`}>{m.value}</span>
                    </div>
                    <IconComp className="w-5 h-5 text-black/20" />
                  </div>
                );
              })}
            </div>

            {/* Debt-to-Equity Indicator */}
            {metrics.debtRatio !== undefined && (
              <div className="mt-6 border-t-2 border-dashed border-black/20 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="font-mono text-xs">
                  <span className="font-bold text-black/50 block uppercase text-[9px] tracking-wider mb-0.5">
                    Debt-to-Equity Ratio
                  </span>
                  <span className="font-black text-black">{metrics.debtRatio.toFixed(2)}x</span>
                </div>
                <div className="w-full sm:w-1/2 bg-black/10 h-3 border-2 border-black rounded-full overflow-hidden">
                  <div
                    className={`h-full border-r border-black ${
                      metrics.debtRatio > 1.5
                        ? "bg-[#EF4444]"
                        : metrics.debtRatio > 0.8
                        ? "bg-[#FACC15]"
                        : "bg-[#2563EB]"
                    }`}
                    style={{ width: `${Math.min(metrics.debtRatio * 50, 100)}%` }} // Scaled relative to 2.0 max
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
