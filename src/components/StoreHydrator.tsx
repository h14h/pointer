"use client";

import { useEffect } from "react";
import { useStore } from "@/store";
import { migrateFromLocalStorage } from "@/lib/persistence";

export function StoreHydrator() {
  useEffect(() => {
    if (!useStore.persist.hasHydrated()) {
      // Migrate any legacy localStorage data into Dexie before rehydrating.
      void migrateFromLocalStorage().then(() => useStore.persist.rehydrate());
    }
  }, []);

  return null;
}
