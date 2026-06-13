"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { Eye, EyeOff, ShieldCheck, Mail, ArrowRight, Bot } from "lucide-react";

// Redesigned Brutalist Stockox Logo
const StockoxLogo = () => (
  <div className="flex items-center gap-3 select-none">
    <div className="w-10 h-10 bg-[#FACC15] border-3 border-black rounded-lg flex items-center justify-center shadow-[3px_3px_0px_#000000] rotate-[-2deg]">
      <Bot className="w-5 h-5 text-black" />
    </div>
    <span className="text-2xl font-black tracking-tight text-[#0F172A] font-sans">
      STOCK<span className="text-[#2563EB]">OX</span>
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

// Custom GitHub Icon
const GitHubIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
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
          ? "Account successfully created. Welcome aboard!"
          : "Credentials verified. Access granted."
      );
    }, 2000);
  };

  const handleSocialSubmit = (provider: string) => {
    setLoading(true);
    setSuccessMsg(`Authorizing secure session with ${provider}...`);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg(`OAuth verification success. Welcome back!`);
    }, 1800);
  };

  return (
    <div className="w-full max-w-[460px] mx-auto p-2 relative">
      {/* Brutalist card border and shadow */}
      <div className="relative bg-white border-4 border-black rounded-2xl p-6 md:p-8 text-[#0F172A] shadow-[8px_8px_0px_#000000] overflow-hidden">
        
        {/* Decorative corner visual */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#FACC15]/10 border-b-2 border-l-2 border-black/5 rounded-bl-3xl pointer-events-none" />

        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-5">
          <StockoxLogo />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? "signup-title" : "signin-title"}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="text-center mt-4"
            >
              <h2 className="text-3xl font-black uppercase tracking-tight text-[#0F172A] mb-2 font-sans">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-sm text-black/60 font-bold uppercase tracking-wider">
                {isSignUp 
                  ? "Access your AI investment committee" 
                  : "Access your AI investment committee."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Success Feedback Screen */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute inset-0 bg-[#22C55E] border-4 border-black rounded-xl flex flex-col items-center justify-center p-8 text-center z-50 shadow-[4px_4px_0px_#000000]"
            >
              <div className="p-4 bg-white border-3 border-black rounded-xl text-black mb-4 shadow-[3px_3px_0px_#000000] rotate-[-2deg]">
                <ShieldCheck className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase text-black tracking-tight">ACCESS GRANTED</h3>
              <p className="text-black font-bold text-sm max-w-xs leading-snug">
                {successMsg}
              </p>
              <div className="mt-8 flex items-center gap-2 text-black font-black text-xs uppercase tracking-widest bg-white/25 border-2 border-black/20 px-3 py-1.5 rounded-lg">
                <span>Connecting to Terminal</span>
                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Forms */}
        <div className="flex flex-col gap-4">
          {/* Primary Social Auth */}
          <div className="grid grid-cols-2 gap-3.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSocialSubmit("Google")}
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase text-black"
              leftIcon={<GoogleIcon />}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSocialSubmit("GitHub")}
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase text-black"
              leftIcon={<GitHubIcon />}
            >
              GitHub
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="h-[3px] flex-grow bg-black" />
            <span className="text-[10px] uppercase font-black text-black/60 tracking-widest">
              OR EMAIL SECURE
            </span>
            <div className="h-[3px] flex-grow bg-black" />
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
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
              placeholder="name@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={loading}
            />

            <div className="flex flex-col gap-1">
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
                  className="absolute right-4 top-[43px] text-black/60 hover:text-black transition-colors duration-150"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {!isSignUp && (
                <div className="flex justify-end mt-1 px-1">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset terminal link dispatched to your secure inbox.");
                    }}
                    className="text-xs font-black text-[#2563EB] hover:underline uppercase tracking-wider"
                  >
                    Forgot?
                  </a>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant={isSignUp ? "accent" : "primary"}
              isLoading={loading}
              className="w-full py-3.5 mt-2 font-black uppercase text-base"
              leftIcon={!loading && <Mail className="w-5 h-5" />}
            >
              {isSignUp ? "Initialize Committee" : "Access Terminal"}
            </Button>
          </form>

          {/* Toggle Login/Sign Up */}
          <div className="text-center mt-1.5 pt-3 border-t-2 border-black/10">
            <p className="text-xs text-black/70 font-bold uppercase tracking-wider">
              {isSignUp ? "Already a committee member?" : "New to the platform?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="text-[#2563EB] font-black hover:underline inline-flex items-center gap-1 group"
              >
                <span>{isSignUp ? "Sign In" : "Register"}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 text-black" strokeWidth={3} />
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
