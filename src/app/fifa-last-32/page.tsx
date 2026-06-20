import type { Metadata } from "next";
import { FifaLast32Page } from "@/components/fifa-last-32-page";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Last 32 Challenge",
  description: "Last 32 Challenge prediction page on games.brainwaveai.my",
  alternates: {
    canonical: "/fifa-last-32",
  },
};

export default function Page() {
  return <FifaLast32Page />;
}
