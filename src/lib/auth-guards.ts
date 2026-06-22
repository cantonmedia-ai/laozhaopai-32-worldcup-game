import { redirect } from "next/navigation";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

export type PlayerProfile = {
  id: string;
  auth_user_id: string;
  user_id: string | null;
  role: "player" | "admin" | "owner";
  display_name: string | null;
  nickname: string | null;
  phone: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  referral_code: string;
  referred_by_profile_id: string | null;
  profile_completed: boolean | null;
};

export function profileIsComplete(profile: Pick<
  PlayerProfile,
  | "profile_completed"
  | "display_name"
  | "nickname"
  | "phone"
  | "phone_number"
  | "whatsapp_number"
> | null) {
  return Boolean(
    profile?.profile_completed &&
      (profile.display_name || profile.nickname) &&
      (profile.phone || profile.phone_number || profile.whatsapp_number),
  );
}

export function displayName(profile: Pick<PlayerProfile, "display_name" | "nickname">) {
  return profile.nickname || profile.display_name || "Player";
}

export async function getCurrentProfile() {
  if (!hasSupabaseServerEnv()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, user_id, role, display_name, nickname, phone, phone_number, whatsapp_number, email, referral_code, referred_by_profile_id, profile_completed",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return profile as PlayerProfile | null;
}

export async function requireCompletedProfile(next = "/game") {
  if (!hasSupabaseServerEnv()) return null;

  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!profileIsComplete(profile)) {
    redirect(`/profile-setup?next=${encodeURIComponent(next)}`);
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await requireCompletedProfile("/admin");

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    redirect("/game");
  }

  return profile;
}
