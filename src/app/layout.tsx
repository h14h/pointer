import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pointer - Fantasy Baseball Draft Aid",
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
        <StoreHydrator />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
