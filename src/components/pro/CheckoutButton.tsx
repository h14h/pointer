"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";

export function CheckoutButton() {
  const startCheckout = useAction(api.polar.startCheckout);
  const [pending, setPending] = useState(false);
  const [stub, setStub] = useState(false);

  async function onClick() {
    setPending(true);
    setStub(false);
    try {
      const { url } = await startCheckout({
        successUrl: `${window.location.origin}/pricing?polar=success`,
      });
      window.location.href = url;
    } catch {
      setStub(true);
      setPending(false);
    }
  }

  if (stub) {
    return (
      <p className="text-sm text-[var(--color-fg-muted)]">
        payments not live on this build
      </p>
    );
  }

  return (
    <Button onClick={() => void onClick()} disabled={pending}>
      {pending ? "Starting checkout..." : "Get Founding Pro · $10"}
    </Button>
  );
}
