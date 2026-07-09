import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toaster } from "@/components/ui/sonner";
import { DuskVeil } from "@/lib/nightTransition";
import { siteMetadata } from "@/lib/siteMetadata";
import "./globals.css";

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>
          <StoreHydrator />
          {children}
          <Toaster />
          <DuskVeil />
        </AppProviders>
      </body>
    </html>
  );
}
