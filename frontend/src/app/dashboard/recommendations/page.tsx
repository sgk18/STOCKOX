"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { motion } from "framer-motion";

interface RecommendationItem {
  ticker: string;
  recommendation: string;
  confidence_score: number;
  risk_level: string;
  created_at: string;
}

export default function RecommendationsPage() {
  const { getToken, isSignedIn } = useAuth();

  const { data: recs, isLoading, error } = useQuery<RecommendationItem[]>({
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
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-32 bg-black/5 border-4 border-black rounded-[24px] shadow-[4px_4px_0px_#000000]" />
        <div className="h-64 bg-black/5 border-4 border-black rounded-[24px] shadow-[4px_4px_0px_#000000]" />
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

  const recommendationList = recs || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Award className="w-8 h-8 text-[#2563EB]" />
            <span>AI Trade Recommendations</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Orchestrated Investment Signals & Targeted Consensus Buy tickets
          </p>
        </div>
      </section>

      {/* Main Table */}
      <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
              <th className="py-3.5 px-6">TICKER</th>
              <th className="py-3.5 px-6">RECOMMENDATION</th>
              <th className="py-3.5 px-6">CONFIDENCE</th>
              <th className="py-3.5 px-6">RISK EXPOSURE</th>
              <th className="py-3.5 px-6 text-right">TIMESTAMP</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
            {recommendationList.length > 0 ? (
              recommendationList.map((item) => (
                <tr key={item.ticker + item.created_at} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-6 font-mono font-black text-[#0F172A] uppercase">{item.ticker}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase ${
                      item.recommendation.includes("BUY")
                        ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/35"
                        : "bg-amber-500/10 text-[#F59E0B] border-[#F59E0B]/30"
                    }`}>
                      {item.recommendation}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono font-black text-[#2563EB]">{item.confidence_score}%</td>
                  <td className="py-4 px-6 font-bold uppercase text-[10px]">{item.risk_level}</td>
                  <td className="py-4 px-6 text-right font-mono text-black/45 text-[10px]">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center font-mono text-xs uppercase text-[#64748B]">
                  No active recommendations. Click &quot;AI Committee&quot; or search a ticker to evaluate signals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </motion.div>
  );
}
