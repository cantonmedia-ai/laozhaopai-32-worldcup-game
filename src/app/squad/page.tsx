"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Save, Share2, UserPlus } from "lucide-react";
import { PageShell, SectionHeader } from "@/components/app-shell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type SquadMember = {
  relationship:
    | "my_team_owner"
    | "invited_by_me"
    | "team_i_joined"
    | "same_team_member";
  team_id: string;
  team_no: number;
  team_name: string;
  team_status: "forming" | "active" | "full";
  team_member_count: number;
  team_friend_count: number;
  owner_profile_id: string;
  profile_id: string;
  display_name: string;
  avatar_url?: string;
  referral_code: string;
  total_score: number;
  rank_position?: number;
  joined_at: string;
};

type PlayerProfile = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  referral_code: string | null;
};

function groupByTeam(members: SquadMember[]) {
  return [...members].reduce<Record<string, SquadMember[]>>((groups, member) => {
    groups[member.team_id] ??= [];
    groups[member.team_id].push(member);
    return groups;
  }, {});
}

function statusLabel(status: SquadMember["team_status"], friendCount: number) {
  if (status === "full" || friendCount >= 4) return "Team is full";
  if (status === "active" || friendCount >= 2) return "已成队";
  return `还差 ${Math.max(0, 2 - friendCount)} 位朋友成队`;
}

function inviteUrl(referralCode: string) {
  const origin =
    typeof window === "undefined"
      ? "https://games.brainwaveai.my"
      : window.location.origin;

  return `${origin}/join?ref=${encodeURIComponent(referralCode)}`;
}

function playerName(profile: PlayerProfile | null) {
  return profile?.display_name || profile?.nickname || "Player";
}

function whatsappInviteUrl(inviteLink: string) {
  return `https://wa.me/?text=${encodeURIComponent(
    `Join my Brainwave Games team and predict the World Cup together! ${inviteLink}`,
  )}`;
}

export default function SquadPage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingTeamId, setEditingTeamId] = useState("");
  const [teamNameDrafts, setTeamNameDrafts] = useState<Record<string, string>>({});

  async function loadSquad() {
    setLoading(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured()) {
        setMembers([]);
        setMessage("Supabase is not configured. Real team data cannot be loaded.");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMembers([]);
        setMessage("Please sign in to view your real team.");
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, nickname, referral_code")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);
      if (!profileRow?.id) throw new Error("Profile not found.");

      let nextProfile = profileRow as PlayerProfile;
      if (!nextProfile.referral_code) {
        const { data: code, error: codeError } = await supabase.rpc(
          "ensure_profile_referral_code",
        );

        if (codeError) throw new Error(codeError.message);
        nextProfile = { ...nextProfile, referral_code: code as string };
      }

      setProfile(nextProfile);

      const { error: ensureError } = await supabase.rpc(
        "get_or_create_open_squad_team",
        { p_owner_profile_id: nextProfile.id },
      );

      if (ensureError) throw new Error(ensureError.message);

      const { data, error } = await supabase.rpc("get_my_squad");
      if (error) throw new Error(error.message);

      setMembers((data ?? []) as SquadMember[]);
    } catch (error) {
      setMembers([]);
      setMessage(error instanceof Error ? error.message : "Unable to load team data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSquad();
  }, []);

  const referralCode = profile?.referral_code ?? "";
  const ownInviteLink = referralCode ? inviteUrl(referralCode) : "";
  const groupedTeams = useMemo(() => groupByTeam(members), [members]);
  const teamList = Object.values(groupedTeams).sort(
    (a, b) => a[0].team_no - b[0].team_no,
  );

  async function copyInvite(link: string) {
    await navigator.clipboard.writeText(link);
    setMessage("Invite link copied.");
  }

  async function renameTeam(teamId: string) {
    const nextName = (teamNameDrafts[teamId] ?? "").trim();

    if (nextName.length < 2 || nextName.length > 30) {
      setMessage("Team name must be 2 to 30 characters.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("rename_squad_team", {
        p_team_id: teamId,
        p_team_name: nextName,
      });

      if (error) throw new Error(error.message);

      setMembers((current) =>
        current.map((member) =>
          member.team_id === teamId ? { ...member, team_name: nextName } : member,
        ),
      );
      setEditingTeamId("");
      setMessage("Team name saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to rename team.");
    }
  }

  return (
    <PageShell active="/squad">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          eyebrow="Team"
          title="我的团队"
          body="每位玩家只有一个邀请码。朋友用你的码加入，会进入你的队伍。每队总共 5 人：1 位队主 + 最多 4 位朋友。"
        />

        {message ? (
          <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="card p-5 text-sm font-bold text-slate-600">
            正在读取你的真实团队资料...
          </div>
        ) : null}

        {!loading && !teamList.length ? (
          <div className="card p-5">
            <h2 className="text-2xl font-black text-slate-950">还没有队伍资料</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              完成登录后系统会自动建立你的队主位置。请刷新或重新登录再试。
            </p>
          </div>
        ) : null}

        <section className="grid gap-5">
          {teamList.map((teamMembers) => {
            const team = teamMembers[0];
            const sorted = [...teamMembers].sort((a, b) => {
              if (a.profile_id === team.owner_profile_id) return -1;
              if (b.profile_id === team.owner_profile_id) return 1;
              return a.joined_at.localeCompare(b.joined_at);
            });
            const owner = sorted.find(
              (member) => member.profile_id === team.owner_profile_id,
            );
            const teammates = sorted.filter(
              (member) => member.profile_id !== team.owner_profile_id,
            );
            const emptySlots = Array.from({
              length: Math.max(0, 4 - teammates.length),
            });
            const inviteLink = ownInviteLink;
            const teamFull = teammates.length >= 4;

            return (
              <div key={team.team_id} className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#0f8a4b]">
                        Team {team.team_no}
                      </p>
                      {editingTeamId === team.team_id ? (
                        <div className="mt-2 flex max-w-md gap-2">
                          <input
                            value={teamNameDrafts[team.team_id] ?? team.team_name}
                            onChange={(event) =>
                              setTeamNameDrafts((current) => ({
                                ...current,
                                [team.team_id]: event.target.value,
                              }))
                            }
                            className="h-11 min-w-0 flex-1 rounded border border-slate-200 px-3 text-lg font-black text-slate-950"
                            maxLength={30}
                          />
                          <button
                            onClick={() => renameTeam(team.team_id)}
                            className="grid size-11 place-items-center rounded bg-[#0f8a4b] text-white"
                            aria-label="Save team name"
                          >
                            <Save size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-black text-slate-950">
                            {team.team_name}
                          </h2>
                          <button
                            onClick={() => {
                              setTeamNameDrafts((current) => ({
                                ...current,
                                [team.team_id]: team.team_name,
                              }));
                              setEditingTeamId(team.team_id);
                            }}
                            className="grid size-8 place-items-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                            aria-label="Rename team"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="rounded bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                      Owner + {teammates.length}/4 friends
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Team invite code
                      </p>
                      <p className="mt-1 text-3xl font-black text-slate-950">
                        {referralCode || "-"}
                      </p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-500">
                        {inviteLink || "Invite link will appear after referral code is ready."}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        disabled={!inviteLink}
                        onClick={() => copyInvite(inviteLink)}
                        className="flex h-11 items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white disabled:opacity-50"
                      >
                        <Copy size={17} /> Copy Link
                      </button>
                      <a
                        href={inviteLink ? whatsappInviteUrl(inviteLink) : undefined}
                        aria-disabled={!inviteLink}
                        className={`flex h-11 items-center justify-center gap-2 rounded px-4 font-black ${
                          inviteLink
                            ? "bg-[#0f8a4b] text-white"
                            : "pointer-events-none bg-slate-300 text-slate-600"
                        }`}
                      >
                        <Share2 size={17} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid divide-y divide-slate-100">
                  <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-black text-slate-950">
                        {owner?.display_name ?? playerName(profile)}
                        <span className="ml-2 rounded bg-[#f4c542] px-2 py-1 text-xs text-[#071525]">
                          Owner
                        </span>
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Code: {referralCode || owner?.referral_code || "-"}
                      </p>
                    </div>
                    <p className="rounded bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                      {statusLabel(team.team_status, teammates.length)}
                    </p>
                  </div>

                  {teammates.map((member, index) => (
                    <div
                      key={`${team.team_id}-${member.profile_id}`}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-black text-slate-950">
                          Teammate Slot {index + 1}: {member.display_name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Joined with your invite link
                        </p>
                      </div>
                      <p className="text-xl font-black text-[#d71920]">
                        {member.total_score} pts
                      </p>
                    </div>
                  ))}

                  {emptySlots.map((_, index) => {
                    const slotNo = teammates.length + index + 1;
                    return (
                      <div
                        key={`${team.team_id}-empty-${slotNo}`}
                        className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="font-black text-slate-950">
                            Teammate Slot {slotNo}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Empty Slot
                          </p>
                        </div>
                        <a
                          href={teamFull || !inviteLink ? undefined : whatsappInviteUrl(inviteLink)}
                          aria-disabled={teamFull || !inviteLink}
                          className={`flex h-11 items-center justify-center gap-2 rounded px-4 font-black ${
                            teamFull || !inviteLink
                              ? "pointer-events-none bg-slate-300 text-slate-600"
                              : "bg-[#d71920] text-white"
                          }`}
                        >
                          <UserPlus size={17} /> Add Teammate
                        </a>
                      </div>
                    );
                  })}
                </div>

                {teamFull ? (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700">
                    Team is full
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      </main>
    </PageShell>
  );
}
