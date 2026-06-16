"use client";

import React, { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const syncAttempted = useRef(false);

  useEffect(() => {
    async function syncUser() {
      if (isLoaded && isSignedIn && user && !syncAttempted.current) {
        syncAttempted.current = true;
        try {
          const token = await getToken();
          const res = await fetch("/api/v1/auth/sync-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              name: user.fullName || user.username || user.firstName || "Adviser",
              email: user.primaryEmailAddress?.emailAddress || "",
              avatar_url: user.imageUrl || ""
            })
          });

          let onboarded = true; // Default to true if check fails to prevent lockout
          if (res.ok) {
            const data = await res.json();
            console.log("[SYNC] User synced successfully. Onboarded status:", data.onboarded);
            onboarded = data.onboarded === true;
          } else {
            console.error("[SYNC] Sync failed with status:", res.status);
          }
          
          if (onboarded) {
            router.push("/dashboard");
          } else {
            router.push("/onboarding");
          }
        } catch (err) {
          console.error("[SYNC-ERR] Error calling sync-user endpoint:", err);
          router.push("/dashboard"); // Fallback safety
        }
      } else if (isLoaded && !isSignedIn) {
        router.push("/");
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black text-black">
          SO
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-black/50">
          Synchronizing advisor profile...
        </span>
      </div>
    </div>
  );
}
