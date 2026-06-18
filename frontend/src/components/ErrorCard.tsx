"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorCard({ message = "Unable to load market data", onRetry }: ErrorCardProps) {
  return (
    <div className="bg-rose-50 border-4 border-black p-8 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto my-6 select-none">
      <div className="w-12 h-12 bg-rose-100 border-3 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000000] text-rose-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-black uppercase text-[#0F172A] tracking-wider">Service Disruption</h3>
        <p className="text-xs font-mono font-bold text-rose-600 mt-2 leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-white text-black border-2 border-black px-4 py-2 text-xs font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#000000] hover:translate-y-[-1.5px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000000] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
