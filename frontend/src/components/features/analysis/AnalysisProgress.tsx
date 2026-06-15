"use client";

import React from "react";
import { motion } from "framer-motion";

interface AnalysisProgressProps {
  progress: number;
}

export default function AnalysisProgress({ progress }: AnalysisProgressProps) {
  // SVG Circle parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center gap-3">
      <span className="text-xs font-black uppercase text-black/50 tracking-wider">Audit Progress</span>

      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* SVG Circle */}
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="#E2E8F0"
            strokeWidth="10"
            className="border-2 border-black"
          />
          {/* Active progress circle */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="#2563EB"
            strokeWidth="10"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-black">{progress}%</span>
          <span className="text-[8px] font-black uppercase text-black/40 tracking-widest mt-0.5">
            {progress < 100 ? "Auditing" : "Completed"}
          </span>
        </div>
      </div>

      {/* Underbar indicator */}
      <div className="w-full bg-slate-100 border-2 border-black rounded-lg h-3 overflow-hidden mt-1 shadow-[1px_1px_0px_#000000]">
        <motion.div
          className="bg-[#2563EB] h-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
