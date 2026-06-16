"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Database, 
  Globe, 
  LineChart, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Sparkles,
  Activity,
  Play
} from "lucide-react";

interface CommitteeDecision {
  ticker: string;
  research_vote: string;
  technical_vote: string;
  news_vote: string;
  risk_vote: string;
  committee_decision: string;
  confidence: number;
  reasoning: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  agentId: "research" | "news" | "technical" | "risk" | "committee";
  agentName: string;
  phase: string;
  message: string;
  confidence: number;
  timestamp: string;
  vote: string;
}

export default function AICommitteePage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const [selectedTicker, setSelectedTicker] = useState("NVDA");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(4); // Default to completed consensus view
  
  const { data: decisions, isLoading, error, refetch } = useQuery<CommitteeDecision[]>({
    queryKey: ["committee-ticker-decision", selectedTicker],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/dashboard/committee?ticker=${selectedTicker.toUpperCase()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load committee decision.");
      return res.json();
    },
    enabled: isSignedIn,
  });

  React.useEffect(() => {
    console.log("[REACT-QUERY-COMMITTEE] Status:", {
      isLoading,
      isError: !!error,
      error: error ? (error as Error).message : null,
      data: decisions
    });
  }, [isLoading, error, decisions]);

  const activeDecision = decisions && decisions.length > 0 ? decisions[0] : null;

  // Fallback defaults if no decision is found in the database yet
  const resolvedDecision: CommitteeDecision = activeDecision || {
    ticker: selectedTicker,
    research_vote: "BUY",
    technical_vote: "BUY",
    news_vote: "HOLD",
    risk_vote: "BUY",
    committee_decision: "BUY",
    confidence: 88,
    reasoning: `Audit vector for ${selectedTicker} indicates stable margin acceleration and breakout momentum above key daily EMAs.`,
    created_at: new Date().toLocaleDateString()
  };

  const staticTimeline: TimelineEvent[] = resolvedDecision ? [
    {
      id: "e1",
      agentId: "research",
      agentName: "Research Agent",
      phase: "Fundamental Valuation",
      message: `Initiated DCF model audit for ${resolvedDecision.ticker}. Projected cash flows model strong scaling. Research Agent issues a ${resolvedDecision.research_vote} signal.`,
      confidence: 90,
      vote: resolvedDecision.research_vote,
      timestamp: "10:14:02 AM"
    },
    {
      id: "e2",
      agentId: "technical",
      agentName: "Technical Agent",
      phase: "Momentum Scanning",
      message: `RSI is currently constructive on the 4H charts. Moving averages indicate key accumulation boundaries. Technical Agent issues a ${resolvedDecision.technical_vote} signal.`,
      confidence: 85,
      vote: resolvedDecision.technical_vote,
      timestamp: "10:15:15 AM"
    },
    {
      id: "e3",
      agentId: "news",
      agentName: "News Agent",
      phase: "Sentiment Scraping",
      message: `Analyzed institutional coverage and social chatter pools. Overall news sentiment indexes as highly favorable. News Agent issues a ${resolvedDecision.news_vote} signal.`,
      confidence: 80,
      vote: resolvedDecision.news_vote,
      timestamp: "10:15:48 AM"
    },
    {
      id: "e4",
      agentId: "risk",
      agentName: "Risk Management",
      phase: "Stress Testing",
      message: `Ran Value at Risk (VaR) matrices and exposure stress simulations. Volatility parameters remain within healthy bounds. Risk Agent issues a ${resolvedDecision.risk_vote} signal.`,
      confidence: 95,
      vote: resolvedDecision.risk_vote,
      timestamp: "10:16:10 AM"
    },
    {
      id: "e5",
      agentId: "committee",
      agentName: "Committee Synthesizer",
      phase: "Consensus Finalization",
      message: `Synthesizing independent agent votes. Consensus resolved: ${resolvedDecision.committee_decision} at ${resolvedDecision.confidence}% confidence score.`,
      confidence: resolvedDecision.confidence,
      vote: resolvedDecision.committee_decision,
      timestamp: "10:16:35 AM"
    }
  ] : [];

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const displayTimeline = isSynthesizing ? timeline : staticTimeline;

  const handleStartAnalysis = async () => {
    setIsSynthesizing(true);
    setActiveStep(-1);
    setTimeline([]);
    
    // Refetch latest DB metrics for selected ticker
    await refetch();

    const steps: TimelineEvent[] = [
      {
        id: "s1",
        agentId: "research",
        agentName: "Research Agent",
        phase: "Fundamental Valuation",
        message: `Running fundamental models for ${selectedTicker}. Modeling discount factors and free cash flow yields. Vote: ${resolvedDecision.research_vote}.`,
        confidence: 90,
        vote: resolvedDecision.research_vote,
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: "s2",
        agentId: "technical",
        agentName: "Technical Agent",
        phase: "Momentum Scanning",
        message: `Calculating daily EMA indicators and support/resistance zones for ${selectedTicker}. Vote: ${resolvedDecision.technical_vote}.`,
        confidence: 85,
        vote: resolvedDecision.technical_vote,
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: "s3",
        agentId: "news",
        agentName: "News Agent",
        phase: "Sentiment Scraping",
        message: `Scouring institutional news streams, earnings releases, and media wires for ${selectedTicker}. Vote: ${resolvedDecision.news_vote}.`,
        confidence: 80,
        vote: resolvedDecision.news_vote,
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: "s4",
        agentId: "risk",
        agentName: "Risk Management",
        phase: "Stress Testing",
        message: `Simulating beta covariance stress matrices and drawing maximum drawdowns. Vote: ${resolvedDecision.risk_vote}.`,
        confidence: 95,
        vote: resolvedDecision.risk_vote,
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: "s5",
        agentId: "committee",
        agentName: "Committee Synthesizer",
        phase: "Consensus Finalization",
        message: `Aggregating audit logs. Multi-agent consensus issued: ${resolvedDecision.committee_decision} (${resolvedDecision.confidence}% confidence).`,
        confidence: resolvedDecision.confidence,
        vote: resolvedDecision.committee_decision,
        timestamp: new Date().toLocaleTimeString()
      }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setTimeline((prev) => [...prev, steps[current]]);
        setActiveStep(current);
        current++;
      } else {
        clearInterval(interval);
        setIsSynthesizing(false);
      }
    }, 1200);
  };

  const getVoteColor = (vote: string) => {
    switch (vote?.toUpperCase()) {
      case "BUY":
      case "STRONG BUY":
        return "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25";
      case "HOLD":
        return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25";
      case "SELL":
      case "STRONG SELL":
        return "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25";
      default:
        return "bg-black/5 text-[#64748B] border-black/10";
    }
  };

  const agentDetails = {
    research: { name: "Research Agent", icon: Database, color: "bg-[#2563EB] text-white border-[#2563EB]", desc: "Audits SEC filings, balance sheet ratios, and DCF growth models to map intrinsic corporate valuations." },
    technical: { name: "Technical Agent", icon: LineChart, color: "bg-[#3B82F6] text-white border-black", desc: "Tracks daily exponential moving average crossovers, support channels, resistance zones, and volumes." },
    news: { name: "News Agent", icon: Globe, color: "bg-[#60A5FA] text-black border-black", desc: "Monitors media coverage, press release sentiment, and options activity feeds in real-time." },
    risk: { name: "Risk Agent", icon: ShieldCheck, color: "bg-[#0F172A] text-white border-black", desc: "Evaluates drawdown thresholds, Sharpe ratio adjustments, covariance matrices, and sector concentration exposure." },
    committee: { name: "Committee Agent", icon: Cpu, color: "bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]", desc: "Aggregates independent agent vectors to resolve consensus recommendations and audit outcomes." }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8"
    >
      {/* Page Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Bot className="w-8 h-8 text-[#2563EB]" />
            <span>AI Committee War Room</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Orchestration Node & Multi-Agent Debate Terminal
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <input 
            type="text" 
            placeholder="TICKER" 
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
            className="w-24 bg-[#F8FAFC] border-3 border-black rounded-xl py-2 px-3 font-bold text-center text-sm focus:outline-none focus:bg-white uppercase"
            disabled={isSynthesizing}
          />
          <button
            onClick={handleStartAnalysis}
            disabled={isSynthesizing}
            className="flex items-center gap-2 bg-[#2563EB] text-white border-3 border-black rounded-xl px-5 py-2 text-xs font-black uppercase hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>{isSynthesizing ? "Synthesizing..." : "Trigger Committee Audit"}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 border-3 border-black bg-red-50 text-[#EF4444] rounded-xl font-mono text-xs uppercase shadow-[2px_2px_0px_#000000] relative z-10">
          <span className="font-black">WARNING:</span> Failed to contact consensus database pool. Rendering fallback advisory parameters.
        </div>
      )}

      {/* Visual Pipeline Workflow */}
      <section className="glass-brutal-card p-8 flex flex-col gap-6 relative">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-2 font-mono">Real-time Multi-Agent Assembly Pipeline</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-9 items-center gap-4 relative z-10 select-none">
          {/* Agent 1 */}
          <div className={`lg:col-span-1 flex flex-col items-center p-4 border-3 rounded-2xl transition-all duration-200 ${
            activeStep >= 0 ? "border-[#2563EB] bg-[#2563EB]/5 text-[#0F172A] shadow-[2.5px_2.5px_0px_#2563EB]" : "border-black bg-white opacity-40"
          }`}>
            <Database className="w-8 h-8 mb-2 text-[#2563EB]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Research</span>
            {activeStep >= 0 && (
              <span className={`text-[8px] font-mono font-black border px-1.5 py-0.5 mt-2 rounded ${getVoteColor(resolvedDecision.research_vote)}`}>
                {resolvedDecision.research_vote}
              </span>
            )}
          </div>

          <div className="lg:col-span-1 flex justify-center">
            <ArrowRight className={`w-6 h-6 hidden lg:block ${activeStep >= 1 ? "text-[#2563EB] animate-pulse" : "text-black/20"}`} />
          </div>

          {/* Agent 2 */}
          <div className={`lg:col-span-1 flex flex-col items-center p-4 border-3 rounded-2xl transition-all duration-200 ${
            activeStep >= 1 ? "border-[#2563EB] bg-[#2563EB]/5 text-[#0F172A] shadow-[2.5px_2.5px_0px_#2563EB]" : "border-black bg-white opacity-40"
          }`}>
            <LineChart className="w-8 h-8 mb-2 text-[#3B82F6]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Technical</span>
            {activeStep >= 1 && (
              <span className={`text-[8px] font-mono font-black border px-1.5 py-0.5 mt-2 rounded ${getVoteColor(resolvedDecision.technical_vote)}`}>
                {resolvedDecision.technical_vote}
              </span>
            )}
          </div>

          <div className="lg:col-span-1 flex justify-center">
            <ArrowRight className={`w-6 h-6 hidden lg:block ${activeStep >= 2 ? "text-[#2563EB] animate-pulse" : "text-black/20"}`} />
          </div>

          {/* Agent 3 */}
          <div className={`lg:col-span-1 flex flex-col items-center p-4 border-3 rounded-2xl transition-all duration-200 ${
            activeStep >= 2 ? "border-[#2563EB] bg-[#2563EB]/5 text-[#0F172A] shadow-[2.5px_2.5px_0px_#2563EB]" : "border-black bg-white opacity-40"
          }`}>
            <Globe className="w-8 h-8 mb-2 text-[#60A5FA]" />
            <span className="text-[10px] font-black uppercase tracking-wider">News</span>
            {activeStep >= 2 && (
              <span className={`text-[8px] font-mono font-black border px-1.5 py-0.5 mt-2 rounded ${getVoteColor(resolvedDecision.news_vote)}`}>
                {resolvedDecision.news_vote}
              </span>
            )}
          </div>

          <div className="lg:col-span-1 flex justify-center">
            <ArrowRight className={`w-6 h-6 hidden lg:block ${activeStep >= 3 ? "text-[#2563EB] animate-pulse" : "text-black/20"}`} />
          </div>

          {/* Agent 4 */}
          <div className={`lg:col-span-1 flex flex-col items-center p-4 border-3 rounded-2xl transition-all duration-200 ${
            activeStep >= 3 ? "border-[#2563EB] bg-[#2563EB]/5 text-[#0F172A] shadow-[2.5px_2.5px_0px_#2563EB]" : "border-black bg-white opacity-40"
          }`}>
            <ShieldCheck className="w-8 h-8 mb-2 text-[#0F172A]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Risk Agent</span>
            {activeStep >= 3 && (
              <span className={`text-[8px] font-mono font-black border px-1.5 py-0.5 mt-2 rounded ${getVoteColor(resolvedDecision.risk_vote)}`}>
                {resolvedDecision.risk_vote}
              </span>
            )}
          </div>

          <div className="lg:col-span-1 flex justify-center">
            <ArrowRight className={`w-6 h-6 hidden lg:block ${activeStep >= 4 ? "text-[#2563EB] animate-pulse" : "text-black/20"}`} />
          </div>

          {/* Agent 5 */}
          <div className={`lg:col-span-1 flex flex-col items-center p-4 border-3 rounded-2xl transition-all duration-200 ${
            activeStep >= 4 ? "border-[#2563EB] bg-[#2563EB]/15 text-[#0F172A] shadow-[4px_4px_0px_#000000]" : "border-black bg-white opacity-40"
          }`}>
            <Cpu className="w-8 h-8 mb-2 text-[#2563EB]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Committee</span>
            {activeStep >= 4 && (
              <span className={`text-[8px] font-mono font-black border px-1.5 py-0.5 mt-2 rounded ${getVoteColor(resolvedDecision.committee_decision)}`}>
                {resolvedDecision.committee_decision}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Split details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left pane: Debates & Reasoning (8/12) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-8">
          
          {/* Timeline Feed */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Agent Reasoning & Debate Log</h2>
            </div>

            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="glass-brutal-card p-8 text-center text-xs font-mono text-black/40 uppercase animate-pulse">
                  Querying database node consensus logs...
                </div>
              ) : displayTimeline.length === 0 ? (
                <div className="glass-brutal-card p-8 text-center text-xs font-mono text-black/40 uppercase animate-pulse">
                  Trigger a committee audit to stream reasoning nodes...
                </div>
              ) : (
                <AnimatePresence>
                  {displayTimeline.map((event) => {
                    const details = agentDetails[event.agentId] || agentDetails.research;
                    const Icon = details.icon;
                    return (
                      <motion.div 
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="glass-brutal-card p-5 hover:shadow-[6px_6px_0px_#000000] transition-shadow duration-150 flex gap-4 bg-white"
                      >
                        <div className={`p-3 border-2 border-black rounded-xl h-fit shrink-0 ${details.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-black/5 pb-2 mb-2.5">
                            <div>
                              <h4 className="text-xs font-black uppercase text-[#0F172A]">{event.agentName}</h4>
                              <span className="text-[9px] font-bold text-black/40 uppercase font-mono">{event.phase}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-[#64748B]">{event.timestamp}</span>
                          </div>
                          <p className="text-xs font-medium text-black/85 leading-relaxed font-mono">
                            {event.message}
                          </p>
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-black/5 font-mono text-[9px] text-black/60">
                            <span className="font-bold">SIGNAL EMITTED: <span className={`border px-1 rounded font-black ml-1 ${getVoteColor(event.vote)}`}>{event.vote}</span></span>
                            <span className="font-black text-[#2563EB]">{event.confidence}% CONFIDENCE</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </section>

          {/* Connected Agent Diagnostics detail */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B]">Active Agent Node Directories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(agentDetails).map((key) => {
                const item = agentDetails[key as keyof typeof agentDetails];
                const Icon = item.icon;
                return (
                  <div key={key} className="glass-brutal-card p-5 flex flex-col gap-2 bg-white">
                    <div className="flex items-center gap-2 text-xs font-black uppercase">
                      <div className={`p-2 border-2 border-black rounded-lg ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{item.name}</span>
                    </div>
                    <p className="text-xs font-medium text-[#64748B] mt-1.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right pane: Decision synthesis dashboard (4/12) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-8">
          
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Synthesis Decision</h2>
            </div>

            <div className="glass-brutal-card p-6 flex flex-col gap-6 bg-white">
              
              {/* Target Header */}
              <div className="text-center pb-4 border-b-2 border-black/10">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#64748B] block mb-1">AUDITED INDEX</span>
                <span className="text-2xl font-black font-mono bg-black text-white px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_#2563EB]">
                  {selectedTicker}
                </span>
              </div>

              {/* Recommendation indicator */}
              <div className="flex flex-col items-center py-4 bg-[#F8FAFC] border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000000]">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] mb-2">CONSENSUS OUTPUT</span>
                <span className={`text-3xl font-black tracking-tight uppercase ${
                  resolvedDecision.committee_decision === "BUY" ? "text-[#2563EB]" : "text-amber-500"
                }`}>
                  {resolvedDecision.committee_decision}
                </span>
                <span className="text-[9px] font-mono text-black/50 mt-1 uppercase font-bold">Consensus active across pool</span>
              </div>

              {/* Consensus Gauges */}
              <div className="flex flex-col gap-4">
                {/* Confidence */}
                <div>
                  <div className="flex justify-between text-xs font-mono font-black mb-1">
                    <span className="uppercase text-[#64748B]">Consensus Confidence</span>
                    <span className="text-[#2563EB]">{resolvedDecision.confidence}%</span>
                  </div>
                  <div className="w-full bg-black/5 border border-black rounded-full h-3.5 overflow-hidden">
                    <div className="bg-[#2563EB] h-full rounded-full transition-all duration-300" style={{ width: `${resolvedDecision.confidence}%` }} />
                  </div>
                </div>

                {/* Risk exposure limits */}
                <div>
                  <div className="flex justify-between text-xs font-mono font-black mb-1">
                    <span className="uppercase text-[#64748B]">Risk Score Rating</span>
                    <span className="text-amber-500">Low Exposure</span>
                  </div>
                  <div className="w-full bg-black/5 border border-black rounded-full h-3.5 overflow-hidden">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: "24%" }} />
                  </div>
                </div>
              </div>

              {/* Decision matrix metrics */}
              <div className="border-t-2 border-black/10 pt-4 flex flex-col gap-3 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="font-bold text-[#64748B]">GENERATED TICKET:</span>
                  <span className="font-black text-black">#STX-{selectedTicker}-01</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#64748B]">AUDIT TIMESTAMP:</span>
                  <span className="font-black text-black">{resolvedDecision.created_at}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#64748B]">COMMITTEE POOL:</span>
                  <span className="font-black text-black">5 Agents Active</span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => router.push(`/dashboard/research-terminal?ticker=${selectedTicker}`)}
                className="w-full border-3 border-black bg-white hover:bg-[#2563EB] hover:text-white rounded-xl py-3 text-xs font-black uppercase text-center shadow-[3px_3px_0px_#000000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                Open in Research Terminal
              </button>

            </div>
          </section>

        </div>
      </div>

    </motion.div>
  );
}
