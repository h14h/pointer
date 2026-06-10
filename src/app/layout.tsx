import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppProviders } from "@/components/providers/AppProviders";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pointer - Fantasy Draft Aid",
  description: "Calculate projected fantasy points and track your draft",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <AppProviders>
          <StoreHydrator />
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
