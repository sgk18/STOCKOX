"use client";

import React from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000000] animate-pulse flex items-center justify-center font-black text-black">
          SO
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-black/50">
          Completing authentication...
        </span>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
