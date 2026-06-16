"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalysisRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/research-terminal");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#2563EB] border-4 border-black shadow-[4px_4px_0px_#000000] animate-pulse flex items-center justify-center font-black text-white">
          SO
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-black/50">
          Redirecting to Research Terminal...
        </span>
      </div>
    </div>
  );
}
