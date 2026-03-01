/* FraudGraph — Root layout with Palantir-dark theme and navigation sidebar.
   Update when: global font stack changes, sidebar width changes,
   or metadata/SEO fields need updating. */

import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FraudGraph — Fraud Detection Platform",
  description: "Government-grade fraud detection and investigation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${barlowCondensed.variable} antialiased bg-slate-950 text-slate-100`}>
        <Sidebar />
        <main className="ml-[48px] min-h-screen">{children}</main>
      </body>
    </html>
  );
}
