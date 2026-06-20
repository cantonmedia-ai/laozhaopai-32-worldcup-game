import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "FIFA World Cup 2026 Last 32 Challenge",
  description: "Last 32 Challenge prediction game on games.brainwaveai.my",
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
        {children}
      </body>
    </html>
  );
}
