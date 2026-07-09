/**
 * TanStack Start root route — mirrors src/app/layout.tsx (the Next.js root
 * layout) 1:1: same html/body structure, same globals.css (one shared file,
 * Fontsource imports included), same providers/overlay components, and the
 * same head metadata sourced from the framework-agnostic siteMetadata.
 */

import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toaster } from "@/components/ui/sonner";
import { DuskVeil } from "@/lib/nightTransition";
import { siteMetadata } from "@/lib/siteMetadata";
import appCss from "@/app/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteMetadata.title },
      { name: "description", content: siteMetadata.description },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppProviders>
        <StoreHydrator />
        <Outlet />
        <Toaster />
        <DuskVeil />
      </AppProviders>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
