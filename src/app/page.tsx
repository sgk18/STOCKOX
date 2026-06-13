"use client";

import React from "react";
import AgentNetwork from "@/components/AgentNetwork";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-10 bg-[#020617] text-white">
      
      {/* LEFT SIDE (60% on Desktop, 60% Stacked on Tablet, Collapses into Compact Top Banner on Mobile) */}
      <section className="col-span-1 lg:col-span-6 flex flex-col justify-between border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-primary/25 bg-[#020617] relative min-h-[60vh] lg:min-h-screen">
        {/* Decorative corner accents (Neo-Brutalist elements) */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-[3px] border-l-[3px] border-primary-light pointer-events-none z-30" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-primary-light pointer-events-none z-30 lg:hidden" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[3px] border-l-[3px] border-primary-light pointer-events-none z-30" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[3px] border-r-[3px] border-primary-light pointer-events-none z-30 lg:hidden" />
        
        {/* Render the core animated agent network module */}
        <AgentNetwork />
      </section>

      {/* RIGHT SIDE (40% on Desktop, 40% Stacked on Tablet, Standard Form below Banner on Mobile) */}
      <section className="col-span-1 lg:col-span-4 flex items-center justify-center p-4 md:p-8 bg-[#020617] relative min-h-[40vh] lg:min-h-screen lg:overflow-y-auto">
        {/* Subtle grid pattern matching the left side */}
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 radial-glow-secondary pointer-events-none" />
        
        {/* Decorative corner accents (Neo-Brutalist elements) */}
        <div className="absolute top-0 right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-primary-light pointer-events-none z-30 hidden lg:block" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[3px] border-r-[3px] border-primary-light pointer-events-none z-30 hidden lg:block" />

        {/* Auth form container */}
        <div className="relative z-10 w-full flex items-center justify-center py-8 lg:py-0">
          <AuthCard />
        </div>
      </section>

    </main>
  );
}
