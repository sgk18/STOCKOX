"use client";

import React from "react";
import AgentNetwork from "@/components/AgentNetwork";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
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
          <AuthCard />
        </div>
      </section>

    </main>
  );
}
