"use client";

import React from "react";
import { SearchCode, ShieldAlert, Cpu, ListPlus } from "lucide-react";
import Button from "../ui/Button";

export default function QuickActions() {
  const actions = [
    {
      label: "Analyze Stock",
      desc: "Deploy committee research",
      icon: SearchCode,
      onClick: () => alert("Launching Secure Agent Analysis Room..."),
      variant: "primary" as const,
    },
    {
      label: "Run Portfolio Audit",
      desc: "Audit exposure safety ratio",
      icon: ShieldAlert,
      onClick: () => alert("Running real-time VaR analysis on holdings..."),
      variant: "accent" as const,
    },
    {
      label: "Market Scan",
      desc: "Filter trend breakouts",
      icon: Cpu,
      onClick: () => alert("Technical scanner scanning 500 equities..."),
      variant: "secondary" as const,
    },
    {
      label: "Create Watchlist",
      desc: "Configure target indexes",
      icon: ListPlus,
      onClick: () => {
        const ticker = prompt("Enter stock ticker to add (e.g. MSFT):");
        if (ticker) {
          alert(`Initializing agents status monitoring for ${ticker.toUpperCase()}...`);
        }
      },
      variant: "outline" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
      {actions.map((act) => {
        const IconComp = act.icon;
        return (
          <Button
            key={act.label}
            variant={act.variant}
            onClick={act.onClick}
            className="flex flex-col items-center justify-center text-center p-6 h-[110px] w-full rounded-2xl"
          >
            <div className="flex items-center gap-2 mb-1">
              <IconComp className="w-5 h-5 flex-shrink-0" />
              <span className="font-black text-sm uppercase tracking-wide">{act.label}</span>
            </div>
            <span className="text-[10px] font-bold opacity-70 uppercase block tracking-wider">
              {act.desc}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
