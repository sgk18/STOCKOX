"use client";

import React from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function AuthCard() {
  const searchParams = useSearchParams();
  const isSignUp = searchParams?.get("signup") === "true";

  const brutalistAppearance = {
    elements: {
      card: "border-4 border-black shadow-[8px_8px_0px_#000000] rounded-2xl bg-white",
      headerTitle: "font-black uppercase tracking-tight text-[#0F172A] font-sans text-2xl",
      headerSubtitle: "text-xs text-black/60 font-bold uppercase tracking-wider",
      socialButtonsBlockButton: "border-3 border-black rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all bg-white text-black font-black uppercase text-xs py-3",
      socialButtonsBlockButtonText: "font-black text-black",
      formButtonPrimary: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-3 border-black font-black uppercase text-sm rounded-xl py-3.5 shadow-[3px_3px_0px_#000000] active:translate-y-[2px] transition-all",
      formFieldInput: "border-3 border-black rounded-xl p-3 focus:outline-none focus:ring-0 focus:shadow-[2px_2px_0px_#000000] font-bold text-sm bg-[#F8FAFC]",
      formFieldLabel: "font-black uppercase tracking-wider text-[10px] text-[#0F172A]",
      footerActionText: "font-bold text-xs uppercase text-black/60",
      footerActionLink: "font-black text-xs uppercase text-[#2563EB] hover:underline",
      dividerLine: "bg-black h-[2px]",
      dividerText: "font-black text-[10px] uppercase text-black/60 tracking-widest bg-white px-2",
      identityPreviewText: "font-bold text-sm text-black",
      identityPreviewEditButtonIcon: "text-[#2563EB]",
      formResendCodeLink: "font-black text-xs uppercase text-[#2563EB] hover:underline",
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto p-2 relative flex justify-center">
      {isSignUp ? (
        <SignUp
          forceRedirectUrl="/dashboard"
          signInUrl="/"
          appearance={brutalistAppearance}
        />
      ) : (
        <SignIn
          forceRedirectUrl="/dashboard"
          signUpUrl="/?signup=true"
          appearance={brutalistAppearance}
        />
      )}
    </div>
  );
}
