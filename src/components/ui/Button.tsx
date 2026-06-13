import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm rounded-[16px] border-[2px]",
    md: "px-6 py-3.5 text-base rounded-[20px] border-[3px]",
    lg: "px-8 py-5 text-lg rounded-[24px] border-[3px]",
  };

  const variantClasses = {
    primary: cn(
      "bg-primary text-white border-primary-dark shadow-brutal-blue hover:shadow-brutal-blue-hover hover:-translate-y-[3px] active:translate-y-[1px] active:shadow-brutal-blue-active",
      "font-extrabold uppercase tracking-wider text-center"
    ),
    secondary: cn(
      "bg-white/[0.06] hover:bg-white/[0.1] text-white border-slate-700 hover:border-slate-500 shadow-brutal-blue hover:shadow-brutal-blue-hover hover:-translate-y-[3px] active:translate-y-[1px] active:shadow-brutal-blue-active",
      "font-bold text-center"
    ),
    success: cn(
      "bg-positive text-slate-950 border-emerald-800 shadow-brutal-green hover:shadow-brutal-green-hover hover:-translate-y-[3px] active:translate-y-[1px] active:shadow-brutal-green-active",
      "font-extrabold uppercase tracking-wider text-center"
    ),
    outline: cn(
      "bg-transparent hover:bg-white/[0.04] text-white border-white/10 hover:border-white/30 hover:-translate-y-[2px] active:translate-y-[0px] shadow-sm",
      "font-semibold text-center"
    ),
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "relative flex items-center justify-center gap-3 select-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        !disabled && !isLoading && "active:scale-[0.98]",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
