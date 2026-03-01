/* FraudGraph -- Root layout with Palantir-dark theme, Barlow display font, and icon-rail sidebar.
   Update when global layout structure, fonts, or theme wrapper changes. */

import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  weight: "600",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "FraudGraph -- Fraud Detection Platform",
  description: "Government-grade fraud detection and investigation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${barlowCondensed.variable} font-sans antialiased bg-bg-shell text-text-primary`}>
        <Sidebar />
        <main className="ml-[48px] min-h-screen">{children}</main>
      </body>
    </html>
  );
}
