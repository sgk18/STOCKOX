"use client";

import React from "react";
import DashboardLayout from "@/app/dashboard/layout";
import { ResearchTerminalContent } from "@/app/dashboard/research-terminal/page";
import { Suspense } from "react";

export default function ResearchPage({ params }: { params: { symbol: string } }) {
  // Unwrap params using React.use if it's a Promise (for Next.js 15+ compatibility)
  const resolvedParams = (params as any) instanceof Promise ? (React as any).use(params) : params;
  const symbol = resolvedParams?.symbol?.toUpperCase();

  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="min-h-[400px] flex items-center justify-center bg-[#F8FAFC]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black text-white text-lg">
              SO
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
              Syncing dynamic analytical framework...
            </span>
          </div>
        </div>
      }>
        <ResearchTerminalContent symbol={symbol} />
      </Suspense>
    </DashboardLayout>
  );
}
