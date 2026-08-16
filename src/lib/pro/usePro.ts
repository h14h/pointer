"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/pro/clerk";
import { LAST_KNOWN_PRO_EVENT, lastKnownProForUser } from "./lastKnownPro";
import { isPaymentsConfigured } from "./config";

export type ProStatus = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isPro: boolean;
  paymentsLive: boolean;
};

export function usePro(): ProStatus {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const signedIn = isSignedIn ?? false;
  const [isPro, setIsPro] = useState(() => lastKnownProForUser(userId));

  useEffect(() => {
    const sync = () => setIsPro(lastKnownProForUser(userId));
    sync();
    window.addEventListener(LAST_KNOWN_PRO_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LAST_KNOWN_PRO_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  return {
    isLoaded,
    isSignedIn: signedIn,
    isPro: signedIn && isPro,
    paymentsLive: isPaymentsConfigured(),
  };
}
