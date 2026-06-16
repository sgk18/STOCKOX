"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/lib/store";
import { ShieldAlert, Zap, ShieldCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SectorExposureItem {
  name: string;
  value: number;
  color: string;
}

interface AssetPerformanceItem {
  ticker: string;
  change_percent: number;
}

const customTooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "3px solid #000000",
  borderRadius: "12px",
  fontFamily: "monospace",
  fontSize: "10px",
  fontWeight: "bold",
  boxShadow: "3px 3px 0px #000000"
};

export default function RiskCenterPage() {
  const { getToken, isSignedIn } = useAuth();
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);

  // Fetch dynamic risk parameters
  const { data: riskData, isLoading, error } = useQuery({
    queryKey: ["risk-center-metrics", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/dashboard/risk${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load risk statistics.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse p-4">
        <div className="h-32 bg-black/5 border-4 border-black rounded-[24px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-black/5 border-4 border-black rounded-[24px]" />
          <div className="h-64 bg-black/5 border-4 border-black rounded-[24px]" />
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

  const sectorExposure: SectorExposureItem[] = riskData?.sector_exposure || [];
  const bestPerformers: AssetPerformanceItem[] = riskData?.best_performing_assets || [];
  const worstPerformers: AssetPerformanceItem[] = riskData?.worst_performing_assets || [];

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
            <ShieldAlert className="w-8 h-8 text-[#2563EB]" />
            <span>Risk Management Center</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            {isDemoMode ? "DEMO MODE: Simulating Nvidia, Apple, Microsoft, Tesla, and AMD risk vectors" : "Active Client Portfolio Risk Audit Overview"}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Risk Matrices */}
        <section className="glass-brutal-card p-6 flex flex-col gap-6 bg-white">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span>Risk exposure parameters</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Sharpe Ratio</span>
              <span className="text-lg font-black text-[#2563EB]">{riskData?.sharpe_ratio || "2.41"}</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Portfolio Beta</span>
              <span className="text-lg font-black text-[#0F172A]">{(riskData?.volatility_score || 1.18).toFixed(2)}</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Concentration Risk</span>
              <span className="text-lg font-black text-[#2563EB]">{(riskData?.concentration_risk || 0).toFixed(1)}%</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Diversification Score</span>
              <span className="text-lg font-black text-[#2563EB]">{riskData?.diversification_score || 88}</span>
            </div>
          </div>
        </section>

        {/* Sector Exposure Breakdown */}
        <section className="glass-brutal-card p-6 flex flex-col gap-6 bg-white">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB]" />
            <span>Exposure breakdowns</span>
          </h3>

          {sectorExposure.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-grow flex flex-col gap-4 w-full md:w-1/2">
                {sectorExposure.map((sect) => (
                  <div key={sect.name}>
                    <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                      <span>{sect.name.toUpperCase()}</span>
                      <span>{sect.value.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                      <div className="h-full rounded-full" style={{ width: `${sect.value}%`, backgroundColor: sect.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Responsive Donut Chart for Sector Allocation */}
              <div className="w-full md:w-1/2 h-[180px] font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorExposure}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sectorExposure.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={2.5} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <span className="font-mono text-[9px] text-[#64748B] uppercase">No sector allocations active.</span>
          )}
        </section>

      </div>

      {/* Asset Performance splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Best Performing Assets */}
        <section className="glass-brutal-card p-6 bg-white flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Best Performing Holdings</span>
          </h3>
          <div className="flex flex-col gap-3 font-mono text-xs">
            {bestPerformers.length > 0 ? (
              bestPerformers.slice(0, 3).map((item) => (
                <div key={item.ticker} className="flex justify-between items-center border-b border-black/5 pb-2">
                  <span className="font-black text-[#2563EB]">{item.ticker}</span>
                  <span className="text-[#2563EB] font-black font-mono">+{item.change_percent.toFixed(2)}%</span>
                </div>
              ))
            ) : (
              <span className="text-[#64748B] text-[10px] uppercase">No performance vectors loaded.</span>
            )}
          </div>
        </section>

        {/* Worst Performing Assets */}
        <section className="glass-brutal-card p-6 bg-white flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-[#EF4444]" />
            <span>Worst Performing Holdings</span>
          </h3>
          <div className="flex flex-col gap-3 font-mono text-xs">
            {worstPerformers.length > 0 ? (
              worstPerformers.slice(0, 3).map((item) => (
                <div key={item.ticker} className="flex justify-between items-center border-b border-black/5 pb-2">
                  <span className="font-black text-[#EF4444]">{item.ticker}</span>
                  <span className="text-[#EF4444] font-black font-mono">{item.change_percent.toFixed(2)}%</span>
                </div>
              ))
            ) : (
              <span className="text-[#64748B] text-[10px] uppercase">No performance vectors loaded.</span>
            )}
          </div>
        </section>

      </div>

    </motion.div>
  );
}
