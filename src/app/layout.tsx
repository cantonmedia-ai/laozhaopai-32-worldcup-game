import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  GlobalClickFeedback,
  ImportantRoutePrefetcher,
  PageTransition,
} from "@/components/instant-interactions";
import { ReferralCapture } from "@/components/referral-capture";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://games.brainwaveai.my"),
  title: "FIFA World Cup 2026 Knockout Challenge",
  description: "Knockout prediction game on games.brainwaveai.my",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hans"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#071525] text-slate-950">
        <ReferralCapture />
        <GlobalClickFeedback />
        <ImportantRoutePrefetcher />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
