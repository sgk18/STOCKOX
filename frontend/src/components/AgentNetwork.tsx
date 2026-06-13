"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, 
  Globe, 
  LineChart, 
  ShieldCheck, 
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  color: "blue" | "white";
  metric: string;
  metricLabel: string;
  positionClass: string; // absolute positions for desktop
  rotation: string; // rotation class for brutalism
  delay: number;
}

export default function AgentNetwork() {
  const [liveLog, setLiveLog] = useState<string>("Initializing investment committee consensus...");
  
  // Simulated activity log ticker
  useEffect(() => {
    const logs = [
      "Research Agent: Parsing 10-Q files for Q2 performance...",
      "News Agent: Detection of high-sentiment surge in tech sector",
      "Technical Agent: Golden cross detected on 50/200 EMA",
      "Risk Agent: Exposure ratio updated. Max drawdown set to 4%",
      "Committee: Debating asset allocation weights...",
      "Research Agent: Deep-dive valuation completed on tech portfolio",
      "Technical Agent: RSI divergence noted on energy indices",
      "Committee: 88% buy consensus reached for semiconductor pool"
    ];
    
    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setLiveLog(randomLog);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const agents: Agent[] = [
    {
      id: "research",
      name: "Research Agent",
      role: "Fundamental Valuation",
      icon: Database,
      status: "Parsing SEC filings & earnings",
      color: "white",
      metric: "94% Accuracy",
      metricLabel: "Historical Precision",
      positionClass: "lg:top-[12%] lg:left-[5%] xl:top-[14%] xl:left-[8%]",
      rotation: "rotate-[1.5deg]",
      delay: 0,
    },
    {
      id: "news",
      name: "News Agent",
      role: "Sentiment & Macro",
      icon: Globe,
      status: "Analyzing financial news feeds",
      color: "white",
      metric: "+0.78 Sentiment",
      metricLabel: "Bullish Outlook",
      positionClass: "lg:top-[12%] lg:right-[5%] xl:top-[14%] xl:right-[8%]",
      rotation: "rotate-[-2deg]",
      delay: 1.2,
    },
    {
      id: "technical",
      name: "Technical Agent",
      role: "Pattern Recognition",
      icon: LineChart,
      status: "Scanning chart structures",
      color: "blue",
      metric: "Buy Signal",
      metricLabel: "EMA/RSI Alignment",
      positionClass: "lg:bottom-[12%] lg:left-[5%] xl:bottom-[14%] xl:left-[8%]",
      rotation: "rotate-[-1deg]",
      delay: 0.6,
    },
    {
      id: "risk",
      name: "Risk Agent",
      role: "Risk Management & VaR",
      icon: ShieldCheck,
      status: "Monitoring portfolio exposure",
      color: "white",
      metric: "Risk Tier 1",
      metricLabel: "Conservative VaR",
      positionClass: "lg:bottom-[12%] lg:right-[5%] xl:bottom-[14%] xl:right-[8%]",
      rotation: "rotate-[2deg]",
      delay: 1.8,
    },
  ];

  // Committee (Center Node)
  const committeeAgent = {
    id: "committee",
    name: "Investment Committee",
    role: "Consensus Engine",
    icon: Cpu,
    status: "Synthesizing multi-agent data",
    color: "blue" as const,
    metric: "88% Consensus",
    metricLabel: "Strong Buy Signal",
    positionClass: "lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-20",
    rotation: "rotate-[1deg]"
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between pt-4 pb-6 px-6 lg:pt-6 lg:pb-10 lg:px-10 xl:pt-8 xl:pb-12 xl:px-12 overflow-hidden select-none bg-[#F8FAFC]">
      
      {/* Background patterns */}
      <div className="absolute inset-0 grid-pattern-brutal pointer-events-none" />
      <div className="absolute inset-0 dot-pattern-brutal pointer-events-none" />
      
      {/* Header section with massive editorial typography */}
      <div className="relative z-10 max-w-3xl mt-0">
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-lg border-2 border-black bg-[#FACC15] font-black uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000000] mb-6">
          <span>AI-Native Investment Engine</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.9] text-[#0F172A] uppercase select-none">
          AI Investment
          <span className="block mt-3 text-white bg-[#2563EB] border-[4px] border-black px-5 py-2.5 inline-block shadow-[6px_6px_0px_#000000] rotate-[-1.5deg]">
            Committee
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-[#0F172A] font-bold mt-8 max-w-2xl leading-snug border-l-4 border-[#2563EB] pl-4">
          A team of specialized AI agents collaborates, debates, and analyzes markets before every investment decision.
        </p>
      </div>

      {/* Central Visual Network: Hidden on mobile, visible on desktop/tablet */}
      <div className="relative flex-grow flex items-center justify-center min-h-[400px] lg:min-h-[460px] xl:min-h-[500px] my-8">
        
        {/* Desktop Node Network */}
        <div className="hidden lg:block absolute inset-0">
          {/* SVG Connection Lines */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#000000" />
              </marker>
            </defs>
            
            {/* Research Line: top-left (20%, 25%) to center (50%, 50%) */}
            <line x1="26%" y1="28%" x2="44%" y2="44%" stroke="#000000" strokeWidth="3.5" strokeDasharray="8 6" className="path-signal" markerEnd="url(#arrow)" />
            {/* News Line: top-right (80%, 25%) to center (50%, 50%) */}
            <line x1="74%" y1="28%" x2="56%" y2="44%" stroke="#000000" strokeWidth="3.5" strokeDasharray="8 6" className="path-signal" markerEnd="url(#arrow)" />
            {/* Technical Line: bottom-left (20%, 75%) to center (50%, 50%) */}
            <line x1="26%" y1="72%" x2="44%" y2="56%" stroke="#000000" strokeWidth="3.5" strokeDasharray="8 6" className="path-signal" markerEnd="url(#arrow)" />
            {/* Risk Line: bottom-right (80%, 75%) to center (50%, 50%) */}
            <line x1="74%" y1="72%" x2="56%" y2="56%" stroke="#000000" strokeWidth="3.5" strokeDasharray="8 6" className="path-signal" markerEnd="url(#arrow)" />
          </svg>

          {/* Render the surrounding 4 nodes */}
          {agents.map((agent) => {
            const IconComponent = agent.icon;
            const isBlue = agent.color === "blue";
            return (
              <motion.div 
                key={agent.id} 
                className={cn("absolute w-[250px] xl:w-[280px]", agent.positionClass)}
                style={{ originX: 0.5, originY: 0.5 }}
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 5 + agent.delay * 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: agent.delay,
                }}
              >
                <div className={cn(
                  "border-[3px] border-black p-5 shadow-[4px_4px_0px_#000000] relative rounded-xl transition-all duration-200",
                  isBlue ? "bg-[#2563EB] text-white" : "bg-white text-[#0F172A]",
                  agent.rotation
                )}>
                  <div className="flex items-start gap-3.5">
                    <div className={cn(
                      "p-2.5 rounded-lg border-2 border-black",
                      isBlue ? "bg-[#60A5FA] text-black" : "bg-[#2563EB] text-white"
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-black text-sm tracking-wide uppercase">{agent.name}</h4>
                      <p className={cn("text-xs font-bold mt-0.5", isBlue ? "text-[#93C5FD]" : "text-black/60")}>
                        {agent.role}
                      </p>
                    </div>
                  </div>

                  <div className={cn("mt-4 pt-3.5 border-t flex flex-col gap-1", isBlue ? "border-white/20" : "border-black/10")}>
                    <span className={cn("text-[10px] uppercase font-black", isBlue ? "text-[#93C5FD]" : "text-black/50")}>Status</span>
                    <p className="text-xs truncate font-bold">{agent.status}</p>
                  </div>

                  <div className={cn(
                    "mt-3 border-2 border-black rounded-lg p-2 flex justify-between items-center",
                    isBlue ? "bg-[#1E40AF]" : "bg-[#F1F5F9]"
                  )}>
                    <span className={cn("text-[10px] font-black uppercase", isBlue ? "text-white/60" : "text-black/50")}>
                      {agent.metricLabel}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_#000000]">
                      {agent.metric}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Central Committee Node */}
          <motion.div 
            className={cn("absolute w-[290px] xl:w-[320px]", committeeAgent.positionClass)}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          >
            <div className={cn(
              "border-[4px] border-black p-6 shadow-[6px_6px_0px_#000000] rounded-2xl bg-[#60A5FA] text-[#0F172A]",
              committeeAgent.rotation
            )}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#FACC15] border-3 border-black rounded-xl text-black shadow-[2px_2px_0px_#000000]">
                  <Cpu className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-wide uppercase leading-tight">{committeeAgent.name}</h3>
                  <p className="text-xs font-black uppercase tracking-wider text-black/60">{committeeAgent.role}</p>
                </div>
              </div>

              <div className="mt-4 bg-white border-2 border-black rounded-xl p-3 flex justify-between items-center shadow-[2px_2px_0px_#000000]">
                <span className="text-xs text-black/60 font-black uppercase">Consensus Status</span>
                <span className="text-xs font-black text-black bg-[#22C55E] px-2.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000000]">
                  {committeeAgent.metric}
                </span>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[11px] font-bold">
                <span className="text-black/50 uppercase">Decision Pool</span>
                <span className="text-black font-black uppercase">{committeeAgent.metricLabel}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile/Tablet representation (horizontal card display) */}
        <div className="lg:hidden w-full flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const IconComponent = agent.icon;
              return (
                <div key={agent.id} className="bg-white border-3 border-black rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#000000]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg border-2 border-black bg-[#2563EB] text-white">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase">{agent.name}</h4>
                      <p className="text-xs font-bold text-black/60">{agent.role}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-[#FACC15] text-black border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000000]">
                    {agent.metric}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Central consensus card for Mobile */}
          <div className="bg-[#60A5FA] border-3 border-black rounded-xl p-5 flex items-center justify-between mt-2 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FACC15] border-2 border-black rounded-lg text-black">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase">Consensus Engaged</h4>
                <p className="text-xs font-bold text-black/70">{committeeAgent.metricLabel}</p>
              </div>
            </div>
            <span className="text-sm font-black text-black bg-[#22C55E] px-3 py-1 rounded border border-black shadow-[2px_2px_0px_#000000]">
              {committeeAgent.metric}
            </span>
          </div>
        </div>

      </div>

      {/* Feature Highlights & Log Feed Console at the bottom */}
      <div className="relative z-10 w-full mt-auto mb-2 lg:mb-4">
        {/* Core Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { title: "Multi-Agent Hub", desc: "Collaborative debate" },
            { title: "Financial Expertise", desc: "Institutional accuracy" },
            { title: "Risk Safeguards", desc: "Real-time VaR analysis" },
            { title: "Portfolio Decider", desc: "Consensus-based weighting" }
          ].map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-white border-2 border-black rounded-lg p-3 shadow-[2px_2px_0px_#000000] hover:bg-[#F1F5F9] transition-colors duration-150"
            >
              <h5 className="font-black text-[#0F172A] text-xs leading-none uppercase tracking-wide">{feature.title}</h5>
              <p className="text-[10px] text-black/60 mt-1.5 font-bold uppercase">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Live log feed terminal */}
        <div className="border-[3px] border-black bg-black text-[#FACC15] rounded-xl overflow-hidden flex shadow-[4px_4px_0px_#000000]">
          {/* Warning stripes element */}
          <div className="stripes-brutal w-12 border-r-[3px] border-black flex-shrink-0" />
          
          <div className="flex-grow p-3 font-mono text-xs flex items-center bg-black">
            <AnimatePresence mode="wait">
              <motion.p
                key={liveLog}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-white font-bold truncate flex-grow"
              >
                {liveLog}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

    </div>
  );
}
