"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, 
  Globe, 
  LineChart, 
  ShieldCheck, 
  Cpu, 
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle
} from "lucide-react";
import GlassCard from "./ui/GlassCard";
import { cn } from "@/lib/utils";

// Types
interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  color: "blue" | "success" | "risk" | "warning";
  metric: string;
  metricLabel: string;
  positionClass: string; // for absolute positioning
  delay: number;
}

export default function AgentNetwork() {
  const [activeSignal, setActiveSignal] = useState<number>(0);
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
      setActiveSignal((prev) => (prev + 1) % 4);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const agents: Agent[] = [
    {
      id: "research",
      name: "Research Agent",
      role: "Fundamental Valuation",
      icon: Database,
      status: "Parsing SEC filings & earnings",
      color: "blue",
      metric: "94% Accuracy",
      metricLabel: "Historical Precision",
      positionClass: "lg:top-[12%] lg:left-[8%] xl:top-[15%] xl:left-[12%]",
      delay: 0,
    },
    {
      id: "news",
      name: "News Agent",
      role: "Sentiment & Macro",
      icon: Globe,
      status: "Analyzing financial news feeds",
      color: "warning",
      metric: "+0.78 Sentiment",
      metricLabel: "Bullish Outlook",
      positionClass: "lg:top-[12%] lg:right-[8%] xl:top-[15%] xl:right-[12%]",
      delay: 1.5,
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
      positionClass: "lg:bottom-[12%] lg:left-[8%] xl:bottom-[15%] xl:left-[12%]",
      delay: 0.8,
    },
    {
      id: "risk",
      name: "Risk Agent",
      role: "Risk Management & VaR",
      icon: ShieldCheck,
      status: "Monitoring portfolio exposure",
      color: "success",
      metric: "Risk Tier 1",
      metricLabel: "Conservative VaR",
      positionClass: "lg:bottom-[12%] lg:right-[8%] xl:bottom-[15%] xl:right-[12%]",
      delay: 2.3,
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
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 lg:p-12 overflow-hidden select-none">
      
      {/* Background visual components */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      
      {/* Floating abstract glass shapes (background) */}
      <div className="absolute top-[20%] left-[45%] w-72 h-72 bg-primary/5 rounded-full blur-[80px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[20%] right-[30%] w-96 h-96 bg-primary-light/5 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />

      {/* Floating particle animations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary-light rounded-full opacity-30 blur-[1px]"
            style={{
              top: `${15 + i * 14}%`,
              left: `${10 + (i * 17) % 80}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, (i % 2 === 0 ? 20 : -20), 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Header section (collapses or scales nicely) */}
      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-4 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-primary-light animate-pulse-slow" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary-light">AI-Native Intelligence</span>
        </div>
        <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Meet Your AI <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-primary to-primary-dark">
            Investment Committee
          </span>
        </h1>
        <p className="text-base lg:text-lg text-text-secondary font-medium leading-relaxed">
          Specialized financial agents collaborate, debate, and analyze markets before every investment decision.
        </p>
      </div>

      {/* Central Visual Network: Hidden on mobile, visible on desktop/tablet */}
      <div className="relative flex-grow flex items-center justify-center min-h-[380px] lg:min-h-[480px] my-6">
        
        {/* Desktop Node Network (hidden on small layouts) */}
        <div className="hidden lg:block absolute inset-0">
          {/* SVG Connection Lines */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none">
            {/* Center coordinates are approximately 50%, 50% */}
            {/* Research Line: top-left (20%, 25%) to center (50%, 50%) */}
            <line x1="25%" y1="28%" x2="50%" y2="50%" stroke="rgba(37, 99, 235, 0.2)" strokeWidth="3" strokeDasharray="6 4" />
            {/* News Line: top-right (80%, 25%) to center (50%, 50%) */}
            <line x1="75%" y1="28%" x2="50%" y2="50%" stroke="rgba(37, 99, 235, 0.2)" strokeWidth="3" strokeDasharray="6 4" />
            {/* Technical Line: bottom-left (20%, 75%) to center (50%, 50%) */}
            <line x1="25%" y1="72%" x2="50%" y2="50%" stroke="rgba(37, 99, 235, 0.2)" strokeWidth="3" strokeDasharray="6 4" />
            {/* Risk Line: bottom-right (80%, 75%) to center (50%, 50%) */}
            <line x1="75%" y1="72%" x2="50%" y2="50%" stroke="rgba(37, 99, 235, 0.2)" strokeWidth="3" strokeDasharray="6 4" />

            {/* Glowing signal animation on active line */}
            {activeSignal === 0 && (
              <path d="M 250, 150 Q 350, 200 500, 250" fill="none" stroke="url(#blue-grad)" strokeWidth="4" className="path-signal" />
            )}
            
            <defs>
              <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
                <stop offset="50%" stopColor="#2563EB" stopOpacity="1" />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Render the surrounding 4 nodes */}
          {agents.map((agent) => {
            const IconComponent = agent.icon;
            return (
              <div key={agent.id} className={cn("absolute w-[240px] xl:w-[280px]", agent.positionClass)}>
                <GlassCard
                  glowColor={agent.color}
                  isAnimated={true}
                  delay={agent.delay}
                  className="p-5 border-white/5 bg-slate-950/40 relative hover:border-primary-light/40 group cursor-default"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={cn(
                      "p-2.5 rounded-xl border-[2px]",
                      agent.color === "blue" && "bg-primary/10 border-primary-medium/30 text-primary-light",
                      agent.color === "success" && "bg-positive/10 border-positive/30 text-positive",
                      agent.color === "warning" && "bg-warning/10 border-warning/30 text-warning",
                      agent.color === "risk" && "bg-negative/10 border-negative/30 text-negative"
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-extrabold text-white text-sm tracking-wide">{agent.name}</h4>
                      <p className="text-xs text-text-muted font-semibold mt-0.5">{agent.role}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Status</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary-light">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-ping" />
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate font-medium">{agent.status}</p>
                  </div>

                  <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-lg p-2 flex justify-between items-center group-hover:bg-primary/[0.03] group-hover:border-primary/20 transition-all duration-300">
                    <span className="text-[10px] text-text-muted font-bold uppercase">{agent.metricLabel}</span>
                    <span className={cn(
                      "text-[10px] font-extrabold px-1.5 py-0.5 rounded",
                      agent.color === "blue" && "bg-primary/20 text-primary-light",
                      agent.color === "success" && "bg-positive/20 text-positive",
                      agent.color === "warning" && "bg-warning/20 text-warning"
                    )}>
                      {agent.metric}
                    </span>
                  </div>
                </GlassCard>
              </div>
            );
          })}

          {/* Central Committee Node */}
          <div className={cn("absolute w-[280px] xl:w-[320px]", committeeAgent.positionClass)}>
            <GlassCard
              glowColor="blue"
              isAnimated={true}
              delay={1.0}
              className="p-6 border-primary/40 bg-slate-950/60 shadow-[0_0_30px_rgba(37,99,235,0.15)] ring-1 ring-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 border-[3px] border-primary-medium rounded-2xl text-primary-light relative shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  <Cpu className="w-6 h-6 animate-pulse-slow" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-positive border-2 border-slate-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base tracking-wide uppercase">{committeeAgent.name}</h3>
                  <p className="text-xs text-primary-light font-bold uppercase tracking-wider">{committeeAgent.role}</p>
                </div>
              </div>

              <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center">
                <span className="text-xs text-text-secondary font-semibold">Current State</span>
                <span className="text-xs font-extrabold text-positive bg-positive/10 px-2.5 py-0.5 rounded border border-positive/20">
                  {committeeAgent.metric}
                </span>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[11px]">
                <span className="text-text-muted font-bold uppercase">Decision Pool</span>
                <span className="text-white font-bold">{committeeAgent.metricLabel}</span>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Mobile/Tablet representation (horizontal carousel or grid) */}
        <div className="lg:hidden w-full flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compact summary of agents */}
            {agents.map((agent) => {
              const IconComponent = agent.icon;
              return (
                <div key={agent.id} className="backdrop-blur-lg bg-white/[0.02] border-2 border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      agent.color === "blue" && "bg-primary/10 text-primary-light",
                      agent.color === "success" && "bg-positive/10 text-positive",
                      agent.color === "warning" && "bg-warning/10 text-warning"
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                      <p className="text-xs text-text-muted">{agent.role}</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-white bg-white/5 px-2 py-0.5 rounded">
                    {agent.metric}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Central consensus card */}
          <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-xl text-primary-light">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm uppercase">Consensus Engaged</h4>
                <p className="text-xs text-text-secondary">{committeeAgent.metricLabel}</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-positive bg-positive/15 px-3 py-1 rounded border border-positive/30">
              {committeeAgent.metric}
            </span>
          </div>
        </div>

      </div>

      {/* Feature Highlights and Live Activity logs at the bottom */}
      <div className="relative z-10 w-full mt-auto">
        {/* Core Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { title: "Multi-Agent Analysis", desc: "Collaborative consensus" },
            { title: "Institutional Research", desc: "Institutional-grade data" },
            { title: "Risk Intelligence", desc: "Real-time VaR protection" },
            { title: "Portfolio Optimization", desc: "AI allocation engine" }
          ].map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl p-3 transition-colors duration-300"
            >
              <h5 className="font-extrabold text-white text-xs leading-tight">{feature.title}</h5>
              <p className="text-[10px] text-text-muted mt-0.5 font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Live log feed terminal */}
        <div className="bg-slate-950/80 border-2 border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-inner font-mono text-xs">
          <div className="flex items-center gap-1.5 text-primary-light">
            <span className="w-2 h-2 rounded-full bg-primary-light animate-ping" />
            <span className="font-bold text-[10px] uppercase">LIVE_BUS</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800" />
          <AnimatePresence mode="wait">
            <motion.p
              key={liveLog}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-text-secondary truncate flex-grow"
            >
              {liveLog}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
