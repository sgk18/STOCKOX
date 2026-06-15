"use client";

import React, { useEffect, useRef } from "react";
import { Terminal, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEventStore } from "@/lib/eventStore";

export default function EventStream() {
  const events = useEventStore((state) => state.events);
  const containerEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const getEventTextAndColor = (type: string, payload: any) => {
    const time = new Date(payload.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    let text = "";
    let colorClass = "text-white/80";

    switch (type) {
      case "analysis_started":
        text = `[SYSTEM] Initiated multi-agent advisory audit for ${payload.ticker}.`;
        colorClass = "text-blue-400 font-extrabold";
        break;
      case "analysis_completed":
        text = `[SYSTEM] Audit finished. Signal: ${payload.recommendation} | Confidence: ${payload.confidence_score}%.`;
        colorClass = "text-emerald-400 font-extrabold";
        break;
      case "analysis_failed":
        text = `[SYSTEM-ERROR] Audit aborted: ${payload.error}`;
        colorClass = "text-rose-400 font-extrabold";
        break;
      case "agent_started":
        text = `[${payload.agent_name}] Activated worker node. Status: thinking.`;
        colorClass = "text-amber-400";
        break;
      case "agent_thinking":
        text = `[${payload.agent_name}] Analyzing resistance and standard deviation parameters...`;
        colorClass = "text-amber-200/90";
        break;
      case "agent_completed":
        text = `[${payload.agent_name}] Task complete. Result parsed successfully.`;
        colorClass = "text-[#60A5FA]";
        break;
      case "agent_error":
        text = `[${payload.agent_name}] Failed: ${payload.error}`;
        colorClass = "text-rose-400";
        break;
      case "agent_message":
        text = `[${payload.agent_name}] Log: "${payload.message}"`;
        colorClass = "text-white/60 font-mono";
        break;
      case "recommendation_generated":
        text = `[COMMITTEE] Advisory target price formulated: $${payload.target_price?.toFixed(2)} (${payload.recommendation} signal).`;
        colorClass = "text-purple-400 font-extrabold";
        break;
      default:
        text = `[EVENT: ${type}] ${JSON.stringify(payload)}`;
    }

    return { text, colorClass, time };
  };

  return (
    <div className="bg-[#0F172A] border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000000] overflow-hidden flex flex-col h-[280px]">
      {/* Title block */}
      <div className="bg-black text-[#FACC15] px-4 py-2.5 flex items-center gap-2 border-b-2 border-black">
        <Terminal className="w-4 h-4" />
        <span className="font-mono text-xs font-black uppercase tracking-wider">Raw Event Stream Console</span>
      </div>

      {/* Screen logs */}
      <div className="flex-grow p-4 overflow-y-auto font-mono text-[10px] flex flex-col gap-2 leading-relaxed">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30">
            <Database className="w-8 h-8 opacity-20 animate-pulse mb-1" />
            <span>Awaiting committee pub/sub broadcasts...</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((ev, index) => {
              const { text, colorClass, time } = getEventTextAndColor(ev.type, ev.payload);
              return (
                <motion.div
                  key={ev.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2 border-b border-white/5 pb-1"
                >
                  <span className="text-white/20 select-none">[{time}]</span>
                  <span className={colorClass}>{text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={containerEndRef} />
      </div>
    </div>
  );
}
