"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CommitteeRedirectPage({ params }: { params: { analysisId: string } }) {
  const router = useRouter();
  const resolvedParams = (params as any) instanceof Promise ? (React as any).use(params) : params;
  const analysisId = resolvedParams?.analysisId;

  useEffect(() => {
    if (analysisId) {
      router.replace(`/dashboard/war-room?session_id=${analysisId}`);
    }
  }, [analysisId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#64748B] font-bold">
          Routing to War Room...
        </span>
      </div>
    </div>
  );
}
