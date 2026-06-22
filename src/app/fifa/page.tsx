import { redirect } from "next/navigation";

export default async function FifaReferralAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const ref = params.ref ? `?ref=${encodeURIComponent(params.ref)}` : "";
  redirect(`/fifa-last-32${ref}`);
}
