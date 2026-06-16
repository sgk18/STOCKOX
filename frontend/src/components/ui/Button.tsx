import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "outline" | "accent";
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
    sm: "px-4 py-2 text-sm rounded-lg border-2",
    md: "px-6 py-3.5 text-base rounded-xl border-3",
    lg: "px-8 py-5 text-lg rounded-2xl border-3",
  };

  const variantClasses = {
    primary: cn(
      "bg-[#2563EB] text-white border-black shadow-[4px_4px_0px_#000000]",
      "hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000]",
      "font-extrabold uppercase tracking-wider text-center"
    ),
    secondary: cn(
      "bg-white text-black border-black shadow-[4px_4px_0px_#000000]",
      "hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000]",
      "font-bold text-center"
    ),
    success: cn(
      "bg-[#3B82F6] text-white border-black shadow-[4px_4px_0px_#000000]",
      "hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000]",
      "font-extrabold uppercase tracking-wider text-center"
    ),
    accent: cn(
      "bg-[#FACC15] text-black border-black shadow-[4px_4px_0px_#000000]",
      "hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000]",
      "font-extrabold uppercase tracking-wider text-center"
    ),
    outline: cn(
      "bg-transparent hover:bg-black/5 text-black border-black/80 hover:border-black",
      "hover:-translate-y-0.5 active:translate-y-0",
      "font-semibold text-center"
    ),
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "relative flex items-center justify-center gap-3 select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
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
