/* FraudGraph — Root layout with Palantir-dark theme and navigation sidebar */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FraudGraph — Fraud Detection Platform",
  description: "Government-grade fraud detection and investigation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}>
        <Sidebar />
        <main className="ml-12 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
