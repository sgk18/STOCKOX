"use client";

import React, { Suspense, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AgentNetwork from "@/components/AgentNetwork";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const handleLoginClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isSocialClick = target.closest("button")?.classList.contains("cl-socialButtonsBlockButton") || 
                           target.closest(".cl-socialButtonsBlockButton");
      const isFormSubmit = target.closest("form") || target.closest("button[type='submit']");
      
      if (isSocialClick || isFormSubmit) {
        sessionStorage.setItem("login_start_time", performance.now().toString());
        sessionStorage.setItem("auth_start_time", Date.now().toString());
        console.log("[PERFORMANCE] Capturing login/auth initiation timestamp.");
      }
    };

    window.addEventListener("click", handleLoginClick);
    return () => window.removeEventListener("click", handleLoginClick);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000000] animate-pulse flex items-center justify-center font-black">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-black/50">
            Initializing Secure Terminal...
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[65%_35%] bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      
      {/* LEFT SIDE (65% on Desktop - branding experience & multi-agent network) */}
      <section className="relative flex flex-col justify-between border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-black bg-[#F8FAFC] min-h-[65vh] lg:min-h-screen">
        {/* Core animated agent network and branding details */}
        <AgentNetwork />
      </section>

      {/* RIGHT SIDE (35% on Desktop - authentication panel) */}
      <section className="flex items-start justify-center pt-6 lg:pt-8 pb-6 px-4 sm:p-6 md:p-8 bg-[#F8FAFC] relative min-h-[55vh] lg:h-screen lg:max-h-screen lg:overflow-y-auto">
        {/* Subtle grid and dot pattern overlay */}
        <div className="absolute inset-0 grid-pattern-brutal opacity-[0.03] pointer-events-none" />
        <div className="absolute inset-0 dot-pattern-brutal opacity-[0.05] pointer-events-none" />
        
        {/* Auth form card */}
        <div className="relative z-10 w-full flex items-center justify-center py-6 lg:py-0">
          <Suspense fallback={<div className="font-mono text-xs uppercase tracking-widest text-black/45">Loading Auth Terminal...</div>}>
            <AuthCard />
          </Suspense>
        </div>
      </section>

    </main>
  );
}
