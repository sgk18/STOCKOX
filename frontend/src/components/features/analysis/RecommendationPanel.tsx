"use client";

import React from "react";
import { AnalysisSessionState } from "@/lib/analysisStore";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, ShieldAlert, Award, ChevronUp } from "lucide-react";
import Button from "../../ui/Button";

interface RecommendationPanelProps {
  session: AnalysisSessionState;
  onReset: () => void;
}

export default function RecommendationPanel({ session, onReset }: RecommendationPanelProps) {
  if (session.status !== "completed" || !session.recommendation) return null;

  const getRecStyles = (rec: "BUY" | "SELL" | "HOLD") => {
    switch (rec) {
      case "BUY":
        return {
          bg: "bg-[#22C55E]",
          textColor: "text-white",
          label: "Strong Buy Signal",
          border: "border-[#22C55E]",
        };
      case "SELL":
        return {
          bg: "bg-[#EF4444]",
          textColor: "text-white",
          label: "Liquidation Signal",
          border: "border-[#EF4444]",
        };
      default:
        return {
          bg: "bg-[#FACC15]",
          textColor: "text-black",
          label: "Neutral Hold Signal",
          border: "border-[#FACC15]",
        };
    }
  };

  const recStyles = getRecStyles(session.recommendation);

  const agents = [
    { name: "Research Agent", initials: "R", bg: "bg-[#2563EB]" },
    { name: "News Agent", initials: "N", bg: "bg-[#FACC15] text-black" },
    { name: "Fundamental Agent", initials: "F", bg: "bg-[#22C55E]" },
    { name: "Technical Agent", initials: "T", bg: "bg-[#a855f7]" },
    { name: "Risk Agent", initials: "K", bg: "bg-[#EF4444]" },
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-white border-t-4 border-black shadow-[0_-8px_0px_rgba(0,0,0,0.15)] select-none"
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch gap-6">
        
        {/* Recommendation Rating Badge */}
        <div className={`border-4 border-black p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_#000000] lg:w-72 ${recStyles.bg}`}>
          <span className="text-[10px] font-black uppercase text-black/60 tracking-widest mb-1.5">
            Advisory consensus
          </span>
          <h2 className={`text-4xl md:text-5xl font-black tracking-tighter uppercase ${recStyles.textColor}`}>
            {session.recommendation}
          </h2>
          <span className="inline-block mt-3 bg-black text-[#FACC15] text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_#000000]">
            {recStyles.label}
          </span>
        </div>

        {/* Valuation metrics & reasoning */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs border-b-2 border-dashed border-black/15 pb-4 mb-4">
            <div>
              <span className="text-black/40 font-bold block uppercase text-[9px] tracking-wider mb-1">
                Confidence Rating
              </span>
              <span className="font-black text-black flex items-center gap-1">
                <Award className="w-4 h-4 text-[#2563EB]" />
                <span>{session.confidenceScore}% Score</span>
              </span>
            </div>
            <div>
              <span className="text-black/40 font-bold block uppercase text-[9px] tracking-wider mb-1">
                Target Projection
              </span>
              <span className="font-black text-[#22C55E] flex items-center gap-0.5">
                <TrendingUp className="w-4 h-4" />
                <span>${session.targetPrice.toFixed(2)}</span>
              </span>
            </div>
            <div>
              <span className="text-black/40 font-bold block uppercase text-[9px] tracking-wider mb-1">
                Risk Classification
              </span>
              <span className={`font-black flex items-center gap-1 ${
                session.riskLevel === "HIGH" ? "text-[#EF4444]" : "text-[#22C55E]"
              }`}>
                <ShieldAlert className="w-4 h-4" />
                <span>{session.riskLevel}</span>
              </span>
            </div>
          </div>

          <div>
            <span className="text-black/40 font-black block uppercase text-[9px] tracking-wider mb-1.5">
              Thesis Reasoning Summary
            </span>
            <p className="text-xs font-bold text-black/75 leading-relaxed">
              {session.summary}
            </p>
          </div>
        </div>

        {/* Contributing Agents & Actions */}
        <div className="flex flex-col justify-between items-end gap-4 lg:w-72 border-t-2 border-black/15 lg:border-t-0 lg:border-l-2 lg:pl-6 pt-4 lg:pt-0">
          <div className="w-full text-left lg:text-right">
            <span className="text-black/40 font-black block uppercase text-[9px] tracking-wider mb-2">
              Contributing Nodes
            </span>
            <div className="flex items-center lg:justify-end -space-x-2">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  title={agent.name}
                  className={`w-8 h-8 rounded-full border-2 border-black font-mono font-black text-xs text-white flex items-center justify-center shadow-[1px_1px_0px_#000000] ${agent.bg}`}
                >
                  {agent.initials}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              variant="secondary"
              onClick={onReset}
              className="flex-1 text-xs py-3 border-2 shadow-[2px_2px_0px_#000000]"
            >
              Clear Room
            </Button>
            <Button
              variant="accent"
              onClick={() => alert("Consensus report saved to Adviser dashboard database logs.")}
              className="flex-1 text-xs py-3 border-2 shadow-[2px_2px_0px_#000000]"
            >
              Log Audit
            </Button>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
