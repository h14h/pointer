"use client";

import { useEffect } from "react";
import { useStore } from "@/store";

export function StoreHydrator() {
  useEffect(() => {
    if (!useStore.persist.hasHydrated()) {
      void useStore.persist.rehydrate();
    }
  }, []);

  return null;
}
