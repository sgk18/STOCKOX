"use client";

import React from "react";
import { FileText, Download, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const REPORTS = [
  { id: "REP-9081", title: "NVIDIA Corp. Q1 Securities Audit Summary", date: "June 16, 2026", size: "142 KB", compiledBy: "AI Committee Consensus" },
  { id: "REP-8975", title: "Microsoft Corp. Long-term Growth Valuations", date: "June 12, 2026", size: "210 KB", compiledBy: "Research Agent" },
  { id: "REP-8824", title: "Global Semiconductors Sector Heatmap Analysis", date: "June 08, 2026", size: "512 KB", compiledBy: "Committee Synth" },
  { id: "REP-8711", title: "Tesla Inc. Momentum & Support Retracement Models", date: "June 02, 2026", size: "185 KB", compiledBy: "Technical Agent" }
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-[#2563EB]" />
            <span>Reports & Securities Audits</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Chronological Committee Documents & Exportable Securities Audits
          </p>
        </div>
      </section>

      {/* Reports List */}
      <div className="flex flex-col gap-4">
        {REPORTS.map((report) => (
          <div key={report.id} className="glass-brutal-card p-5 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:translate-x-0.5 transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 border-2 border-black rounded-xl bg-[#2563EB]/10 text-[#2563EB] shrink-0 h-fit">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-black text-[#2563EB] uppercase bg-[#2563EB]/10 px-1.5 py-0.5 rounded border border-[#2563EB]/25">
                  {report.id}
                </span>
                <h4 className="text-sm font-black uppercase text-[#0F172A] mt-2 leading-snug">{report.title}</h4>
                
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-[#64748B] uppercase mt-2">
                  <span>Compiled by: {report.compiledBy}</span>
                  <span>•</span>
                  <span>Size: {report.size}</span>
                  <span>•</span>
                  <span>Date: {report.date}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Downloading Document ${report.id} as PDF...`)}
              className="flex items-center justify-center gap-2 border-3 border-black bg-white hover:bg-[#2563EB] hover:text-white rounded-xl px-5 py-2.5 text-xs font-black uppercase shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] active:translate-y-[1px] transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
