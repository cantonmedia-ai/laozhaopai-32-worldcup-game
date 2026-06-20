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
  title: "老招牌 32强冠军竞猜赛",
  description: "Lao Zhao Pai 32-Team Champion Prediction Game",
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
