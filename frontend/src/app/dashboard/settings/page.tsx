"use client";

import React, { useState } from "react";
import { Settings, CheckCircle2, ShieldCheck, UserCheck, Bot } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function SettingsPage() {
  const { user } = useUser();
  const [apiKeys, setApiKeys] = useState({
    sec: "••••••••••••••••••••••••••••",
    finnhub: "••••••••••••••••••••••••••••",
    polygon: "••••••••••••••••••••••••••••",
  });

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Settings className="w-8 h-8 text-[#2563EB]" />
            <span>Settings Terminal</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Manage Connected API credentials, User Accounts & Advisory Node status
          </p>
        </div>
      </section>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Details */}
        <section className="glass-brutal-card p-6 bg-white flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <UserCheck className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Securities Advisor Profile</span>
          </h3>

          <div className="flex flex-col gap-4 font-mono text-xs mt-2">
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="font-bold text-[#64748B] uppercase">FULL NAME:</span>
              <span className="font-black text-black">{user?.fullName || "Securities Advisor"}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="font-bold text-[#64748B] uppercase">EMAIL ADDRESS:</span>
              <span className="font-black text-black">{user?.primaryEmailAddress?.emailAddress || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-[#64748B] uppercase">ACCOUNT STATE:</span>
              <span className="font-black text-[#2563EB] uppercase">AUTHORIZED CERTIFIED</span>
            </div>
          </div>
        </section>

        {/* API Credentials */}
        <section className="glass-brutal-card p-6 bg-white flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <Bot className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>API Keys & Credentials</span>
          </h3>

          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-[9px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Securities API Token</label>
              <input
                type="password"
                value={apiKeys.sec}
                disabled
                className="w-full bg-[#F8FAFC] border-2 border-black rounded-lg py-1.5 px-3 font-mono text-xs text-black/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-[#64748B] tracking-wider block mb-1">Financial News Feed API Token</label>
              <input
                type="password"
                value={apiKeys.finnhub}
                disabled
                className="w-full bg-[#F8FAFC] border-2 border-black rounded-lg py-1.5 px-3 font-mono text-xs text-black/60 focus:outline-none"
              />
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
