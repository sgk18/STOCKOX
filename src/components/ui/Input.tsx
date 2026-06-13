"use client";

import React, { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, type = "text", containerClassName, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className={cn("flex flex-col gap-2 w-full", containerClassName)}>
        {label && (
          <label className="text-sm font-semibold text-text-secondary tracking-wide flex justify-between items-center px-1">
            <span>{label}</span>
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            ref={ref}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full bg-white/[0.03] backdrop-blur-md text-white text-base font-medium",
              "px-5 py-4 rounded-[20px] border-[3px] transition-all duration-300 outline-none",
              focused
                ? "border-primary shadow-[0_0_20px_rgba(37,99,235,0.25)] bg-white/[0.05]"
                : error
                ? "border-negative shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                : "border-slate-800 hover:border-slate-700 bg-white/[0.02]",
              className
            )}
            {...props}
          />
          {/* Subtle bottom line visual hint */}
          <div
            className={cn(
              "absolute bottom-0 left-6 right-6 h-[2px] rounded-full transition-all duration-500 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 pointer-events-none",
              focused && "opacity-80 scale-105"
            )}
          />
        </div>
        {error && (
          <span className="text-xs font-semibold text-negative px-1 flex items-center gap-1 animate-pulse-slow">
            ● {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
