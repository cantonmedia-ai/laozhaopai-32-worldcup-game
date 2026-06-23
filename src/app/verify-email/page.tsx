import { redirect } from "next/navigation";
import { VerifyEmailCard } from "@/components/verify-email-card";
import { profileIsComplete } from "@/lib/auth-guards";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/game";

  if (!hasSupabaseServerEnv()) redirect(`/login?next=${encodeURIComponent(next)}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "profile_completed, display_name, nickname, email, email_verified",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.email_verified !== false) {
    if (!profileIsComplete(profile)) {
      redirect(`/profile/setup?next=${encodeURIComponent(next)}`);
    }

    redirect(next);
  }

  return (
    <main className="min-h-screen bg-[#edf1f5]">
      <VerifyEmailCard email={profile.email || user.email || ""} />
    </main>
  );
}
