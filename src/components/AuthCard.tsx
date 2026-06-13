"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { Eye, EyeOff, ShieldCheck, Mail, ArrowRight } from "lucide-react";

// Stockox Logo Component
const StockoxLogo = () => (
  <div className="flex items-center gap-3 select-none">
    <div className="relative w-11 h-11 flex items-center justify-center">
      {/* Node circle background */}
      <div className="absolute inset-0 bg-primary/15 rounded-full brutal-border border-primary flex items-center justify-center">
        {/* Central node */}
        <div className="w-2.5 h-2.5 bg-primary-light rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
      </div>
      {/* Surrounding connected nodes */}
      <div className="absolute top-[6px] left-[10px] w-2 h-2 bg-positive rounded-full animate-pulse-slow" />
      <div className="absolute bottom-[6px] right-[10px] w-2 h-2 bg-warning rounded-full animate-pulse-slow" style={{ animationDelay: "1s" }} />
      <div className="absolute top-[10px] right-[6px] w-2 h-2 bg-primary-light rounded-full animate-pulse-slow" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-[10px] left-[6px] w-2 h-2 bg-negative rounded-full animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
      
      {/* SVG Connecting lines in logo */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 44 44">
        <line x1="22" y1="22" x2="14" y2="10" stroke="rgba(96, 165, 250, 0.4)" strokeWidth="1.5" />
        <line x1="22" y1="22" x2="34" y2="14" stroke="rgba(96, 165, 250, 0.4)" strokeWidth="1.5" />
        <line x1="22" y1="22" x2="30" y2="34" stroke="rgba(96, 165, 250, 0.4)" strokeWidth="1.5" />
        <line x1="22" y1="22" x2="10" y2="30" stroke="rgba(96, 165, 250, 0.4)" strokeWidth="1.5" />
      </svg>
    </div>
    <span className="text-2xl font-extrabold tracking-widest text-white font-mono">
      STOCK<span className="text-primary-light font-black">OX</span>
    </span>
  </div>
);

// Custom Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export default function AuthCard() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!email) {
      tempErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      tempErrors.password = "Password is required";
    } else if (password.length < 8) {
      tempErrors.password = "Password must be at least 8 characters";
    }

    if (isSignUp && !name) {
      tempErrors.name = "Full name is required";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg(
        isSignUp
          ? "Account created! Setting up investment committee..."
          : "Welcome back to Stockox. Redirecting..."
      );
    }, 2000);
  };

  const handleSocialSubmit = (provider: string) => {
    setLoading(true);
    setSuccessMsg(`Authorizing secure session with ${provider}...`);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg(`Welcome back to Stockox!`);
    }, 1800);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto p-1.5 md:p-3 relative">
      {/* Brutalist card border and glass combination */}
      <div className="relative backdrop-blur-[24px] bg-slate-950/40 border-[3px] border-primary rounded-[28px] p-8 md:p-10 text-white shadow-brutal-card">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-positive/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <StockoxLogo />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? "signup-title" : "signin-title"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-center mt-6"
            >
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-sm text-text-muted font-medium">
                {isSignUp 
                  ? "Initialize your multi-agent investment engine" 
                  : "Sign in to access your AI investment committee."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Success Feedback Screen */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-[3px] bg-slate-950/95 rounded-[25px] flex flex-col items-center justify-center p-8 text-center z-50 backdrop-blur-md"
            >
              <div className="p-4 bg-positive/15 border-3 border-positive rounded-full text-positive mb-4 animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold mb-2 uppercase text-white">Authentication Verified</h3>
              <p className="text-text-secondary text-sm max-w-xs leading-relaxed font-semibold">
                {successMsg}
              </p>
              <div className="mt-8 flex items-center gap-2 text-primary-light font-mono text-xs animate-pulse">
                <span>Connecting to Secure Terminal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-ping" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Forms */}
        <div className="flex flex-col gap-6">
          {/* Primary Social Auth (Google only) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialSubmit("Google")}
            disabled={loading}
            className="w-full bg-white/[0.02] border-[3px] border-slate-800 hover:border-slate-600 rounded-[20px] py-4 text-white text-base font-bold shadow-sm"
            leftIcon={<GoogleIcon />}
          >
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="h-[2px] flex-grow bg-slate-800" />
            <span className="text-xs uppercase font-extrabold text-text-muted tracking-wider">
              or continue with email
            </span>
            <div className="h-[2px] flex-grow bg-slate-800" />
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
            <AnimatePresence initial={false}>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Input
                    label="Full Name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                    disabled={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label="Email Address"
              type="email"
              placeholder="name@institution.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={loading}
            />

            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-[47px] text-text-muted hover:text-white transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {!isSignUp && (
                <div className="flex justify-end px-1 mt-1">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password recovery dispatch active. Check your email.");
                    }}
                    className="text-xs font-bold text-primary-light hover:text-white transition-colors duration-200"
                  >
                    Forgot Password?
                  </a>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant={isSignUp ? "success" : "primary"}
              isLoading={loading}
              className="w-full py-4 mt-2"
              leftIcon={!loading && <Mail className="w-5 h-5" />}
            >
              {isSignUp ? "Initialize Account" : "Access Terminal"}
            </Button>
          </form>

          {/* Toggle Login/Sign Up */}
          <div className="text-center mt-4 pt-4 border-t border-slate-800">
            <p className="text-sm text-text-muted font-semibold">
              {isSignUp ? "Already a committee member?" : "New to the platform?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="text-primary-light font-bold hover:text-white inline-flex items-center gap-1 group transition-colors duration-200"
              >
                <span>{isSignUp ? "Sign In" : "Request Access"}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
