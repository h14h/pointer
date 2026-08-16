"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/pro/clerk";
import { clearLastKnownPro, writeLastKnownPro } from "@/lib/pro/lastKnownPro";

export function ConfirmPro() {
  const { userId } = useAuth();
  const mine = useQuery(api.entitlements.mine);

  useEffect(() => {
    if (!userId || mine === undefined) return;
    if (mine?.status === "active") {
      writeLastKnownPro({
        clerkUserId: userId,
        status: "active",
        period: mine.period,
        confirmedAt: Date.now(),
      });
      return;
    }
    clearLastKnownPro(userId);
  }, [userId, mine]);

  return null;
}
