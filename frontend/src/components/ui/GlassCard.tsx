"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "blue" | "success" | "risk" | "warning" | "none";
  isAnimated?: boolean;
  delay?: number;
  hoverEffect?: "lift" | "tilt" | "none";
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className,
  glowColor = "none",
  isAnimated = false,
  delay = 0,
  hoverEffect = "lift",
  onClick,
}: GlassCardProps) {
  const glowClasses = {
    none: "",
    blue: "before:absolute before:inset-0 before:-z-10 before:rounded-[21px] before:radial-glow before:opacity-60",
    success: "before:absolute before:inset-0 before:-z-10 before:rounded-[21px] before:radial-glow-success before:opacity-60",
    risk: "before:absolute before:inset-0 before:-z-10 before:rounded-[21px] before:radial-glow-risk before:opacity-60",
    warning: "before:absolute before:inset-0 before:-z-10 before:rounded-[21px] before:radial-glow-secondary before:opacity-60",
  };
  // Float animation properties
  const animationProps = isAnimated
    ? {
        animate: {
          y: [0, -10, 0],
        },
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: delay,
        },
      }
    : {};

  // Hover animation properties
  const hoverProps =
    hoverEffect === "lift"
      ? {
          whileHover: { 
            y: isAnimated ? undefined : -6,
            scale: 1.02,
            boxShadow: "10px 10px 0px 0px #1D4ED8",
            borderColor: "#3B82F6"
          },
          whileTap: { scale: 0.98 }
        }
      : {};

  if (onClick) {
    return (
      <motion.button
        {...animationProps}
        {...hoverProps}
        onClick={onClick}
        className={cn(
          "relative backdrop-blur-xl bg-white/[0.04] border-[3px] border-white/10 rounded-[24px] p-6 text-white shadow-lg transition-colors duration-300 w-full text-left focus:outline-none focus:border-primary cursor-pointer",
          glowClasses[glowColor],
          className
        )}
      >
        {/* Frosted overlay */}
        <div className="absolute inset-0 bg-white/[0.02] rounded-[21px] pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </motion.button>
    );
  }

  return (
    <motion.div
      {...animationProps}
      {...hoverProps}
      className={cn(
        "relative backdrop-blur-xl bg-white/[0.04] border-[3px] border-white/10 rounded-[24px] p-6 text-white shadow-lg transition-colors duration-300",
        glowClasses[glowColor],
        className
      )}
    >
      {/* Frosted overlay */}
      <div className="absolute inset-0 bg-white/[0.02] rounded-[21px] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
