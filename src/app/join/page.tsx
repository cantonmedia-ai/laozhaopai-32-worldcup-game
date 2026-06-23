import { redirect } from "next/navigation";
import { logUserAction } from "@/lib/monitoring";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const referralCode = String(params.ref ?? "").trim();
  const suffix = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : "";

  if (referralCode) {
    await logUserAction({
      actionType: "referral_link_opened",
      actionStatus: "info",
      pagePath: "/join",
      referralCode,
      message: "Referral link opened.",
    });
  }

  redirect(`/fifa-last-32${suffix}`);
}
