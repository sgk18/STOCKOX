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
          <label className="text-sm font-black text-[#0F172A] tracking-wider uppercase flex justify-between items-center px-1">
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
              "w-full bg-white text-[#0F172A] text-base font-bold",
              "px-5 py-3 rounded-xl border-3 border-black transition-all duration-150 outline-none",
              focused
                ? "bg-[#F1F5F9] shadow-[4px_4px_0px_#000000]"
                : error
                ? "border-[#EF4444] bg-[#FEF2F2] shadow-[2px_2px_0px_#EF4444]"
                : "hover:bg-[#F8FAFC]",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs font-black text-[#EF4444] px-1 flex items-center gap-1">
            ● {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
