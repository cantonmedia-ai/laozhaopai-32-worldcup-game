"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Save, Share2, UsersRound } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { getMe, profiles, referrals } from "@/lib/demo-data";
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

function demoMembers(): SquadMember[] {
  const me = getMe();
  const invited = referrals
    .map((referral) =>
      profiles.find((profile) => profile.id === referral.referredProfileId),
    )
    .filter(Boolean);
  const members = [me, ...invited];
  const teamSize = 5;

  return members.map((profile, index) => {
    const teamNo = Math.floor(index / teamSize) + 1;
    const teamMembers = members.slice((teamNo - 1) * teamSize, teamNo * teamSize);
    const friendCount = Math.max(0, teamMembers.length - 1);

    return {
      relationship: profile!.id === me.id ? "my_team_owner" : "invited_by_me",
      team_id: `demo-team-${teamNo}`,
      team_no: teamNo,
      team_name: `Team ${teamNo}`,
      team_status:
        teamMembers.length >= 5 ? "full" : friendCount >= 2 ? "active" : "forming",
      team_member_count: teamMembers.length,
      team_friend_count: friendCount,
      owner_profile_id: me.id,
      profile_id: profile!.id,
      display_name: profile!.displayName,
      avatar_url: profile!.avatarUrl,
      referral_code: profile!.referralCode,
      total_score: profile!.totalScore,
      rank_position: profile!.rank,
      joined_at: profile!.createdAt,
    };
  });
}

function groupByTeam(members: SquadMember[]) {
  return [...members].reduce<Record<string, SquadMember[]>>((groups, member) => {
    groups[member.team_id] ??= [];
    groups[member.team_id].push(member);
    return groups;
  }, {});
}

function statusLabel(status: SquadMember["team_status"], friendCount: number) {
  if (status === "full") return "已满员";
  if (status === "active") return "已成队";
  return `还差 ${Math.max(0, 2 - friendCount)} 位朋友成队`;
}

function inviteUrl(referralCode: string) {
  const origin =
    typeof window === "undefined"
      ? "https://games.brainwaveai.my"
      : window.location.origin;

  return `${origin}/fifa-last-32?ref=${encodeURIComponent(referralCode)}`;
}

export default function SquadPage() {
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [usingDemo, setUsingDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingTeamId, setEditingTeamId] = useState("");
  const [teamNameDrafts, setTeamNameDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSquad() {
      if (!isSupabaseConfigured()) {
        setMembers(demoMembers());
        setUsingDemo(true);
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setMembers(demoMembers());
          setUsingDemo(true);
          setMessage("请先登录后查看真实战队资料。当前显示 Demo 数据。");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profileError) throw new Error(profileError.message);

        if (profile?.id) {
          const { error: ensureError } = await supabase.rpc(
            "get_or_create_open_squad_team",
            { p_owner_profile_id: profile.id },
          );

          if (ensureError) throw new Error(ensureError.message);
        }

        const { data, error } = await supabase.rpc("get_my_squad");
        if (error) throw new Error(error.message);
        setMembers((data ?? []) as SquadMember[]);
        setUsingDemo(false);
      } catch (error) {
        setMembers(demoMembers());
        setUsingDemo(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "读取战队资料失败，当前显示 Demo 数据。",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSquad();
  }, []);

  const displayMembers =
    members.length > 0 || !usingDemo ? members : demoMembers();
  const me =
    displayMembers.find((member) => member.relationship === "my_team_owner") ??
    displayMembers.find((member) => member.profile_id === getMe().id) ??
    demoMembers()[0];
  const myOwnedMembers = displayMembers.filter(
    (member) => member.owner_profile_id === me.profile_id,
  );
  const groupedTeams = groupByTeam(
    myOwnedMembers.length ? myOwnedMembers : displayMembers,
  );
  const teamList = Object.values(groupedTeams).sort(
    (a, b) => a[0].team_no - b[0].team_no,
  );
  const invitedFriendCount = myOwnedMembers.filter(
    (member) => member.profile_id !== me.profile_id,
  ).length;
  const activeTeamCount = teamList.filter(
    (team) => team[0].team_status === "active" || team[0].team_status === "full",
  ).length;
  const inviteLink = inviteUrl(me.referral_code);

  const flow = useMemo(
    () => [
      "Every player has their own referral_code and can invite friends.",
      "When a friend joins from your code, they enter your current open team.",
      "A team can hold maximum 5 players total: owner + friends.",
      "A team is considered formed when it has at least 2 invited friends.",
      "When one team reaches 5 players, the next friend automatically starts your next team.",
      "That friend still keeps their own code and can build their own separate teams.",
    ],
    [],
  );

  async function renameTeam(teamId: string) {
    const nextName = (teamNameDrafts[teamId] ?? "").trim();

    if (nextName.length < 2 || nextName.length > 30) {
      setMessage("Team name must be 2 to 30 characters.");
      return;
    }

    setMessage("");

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase.rpc("rename_squad_team", {
          p_team_id: teamId,
          p_team_name: nextName,
        });

        if (error) throw new Error(error.message);
      }

      setMembers((current) =>
        current.map((member) =>
          member.team_id === teamId ? { ...member, team_name: nextName } : member,
        ),
      );
      setEditingTeamId("");
      setMessage("Team name saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to rename team.",
      );
    }
  }

  return (
    <PageShell active="/squad">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Squad"
          title="我的战队"
          body="每位玩家都有自己的邀请码。朋友加入后会进入你的队伍；满 5 人后，下一位朋友自动进入你的新队伍。"
        />

        {message ? (
          <div className="mb-5 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="我的邀请码" value={me.referral_code} tone="gold" />
          <StatCard
            label="我邀请的朋友"
            value={invitedFriendCount}
            tone="green"
            detail={loading ? "读取中..." : "直接邀请"}
          />
          <StatCard label="我的队伍数" value={teamList.length} />
          <StatCard label="已成队" value={activeTeamCount} tone="navy" />
        </div>

        <div className="mt-6 card p-5">
          <p className="text-sm font-black text-[#0f8a4b]">Invite Link</p>
          <p className="mt-2 break-all rounded bg-slate-100 p-3 font-semibold text-slate-700">
            {inviteLink}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="flex h-12 items-center justify-center gap-2 rounded bg-[#071525] font-black text-white"
            >
              <Copy size={18} /> 复制链接
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`我参加了【老招牌32强冠军竞猜赛】！用我的链接加入我的战队，一起预测冠军！ ${inviteLink}`)}`}
              className="flex h-12 items-center justify-center gap-2 rounded bg-[#0f8a4b] font-black text-white"
            >
              <Share2 size={18} /> 分享邀请
            </a>
          </div>
        </div>

        <section className="mt-6 grid gap-5">
          {teamList.map((teamMembers) => {
            const team = teamMembers[0];
            const sorted = [...teamMembers].sort((a, b) => {
              if (a.profile_id === team.owner_profile_id) return -1;
              if (b.profile_id === team.owner_profile_id) return 1;
              return b.total_score - a.total_score;
            });

            return (
              <div key={team.team_id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-[#0f8a4b]">
                      Team {team.team_no}
                    </p>
                    {team.owner_profile_id === me.profile_id &&
                    editingTeamId === team.team_id ? (
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
                        {team.owner_profile_id === me.profile_id ? (
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
                        ) : null}
                      </div>
                    )}
                    <p className="mt-1 text-sm font-black text-slate-500">
                      {statusLabel(team.team_status, team.team_friend_count)}
                    </p>
                  </div>
                  <div className="rounded bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                    {team.team_member_count}/5 players · {team.team_friend_count} friends
                  </div>
                </div>

                <div className="grid divide-y divide-slate-100">
                  {sorted.map((member) => {
                    const ownsThisTeam = member.profile_id === team.owner_profile_id;
                    const memberInviteLink = inviteUrl(member.referral_code);

                    return (
                      <div
                        key={`${team.team_id}-${member.profile_id}`}
                        className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto]"
                      >
                        <div>
                          <p className="font-black text-slate-950">
                            {member.display_name}
                            {ownsThisTeam ? (
                              <span className="ml-2 rounded bg-[#f4c542] px-2 py-1 text-xs text-[#071525]">
                                Owner
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Code: {member.referral_code}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xl font-black text-[#d71920]">
                            {member.total_score}
                          </p>
                          <p className="text-xs font-bold text-slate-500">
                            points
                          </p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(memberInviteLink)}
                          className="h-10 rounded bg-slate-100 px-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                        >
                          Copy member link
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <UsersRound className="text-[#d71920]" />
              <h2 className="text-xl font-black text-slate-950">
                How members are identified
              </h2>
            </div>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700">
              <p>Referral ownership: profiles.referral_code belongs to one player.</p>
              <p>Direct invite record: referrals.referrer_profile_id invited referrals.referred_profile_id.</p>
              <p>Team grouping: squad_team_members links profile_id to squad_teams.id.</p>
              <p>Multiple teams: squad_teams.owner_profile_id + team_no separates Team 1, Team 2, Team 3.</p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-black text-slate-950">Flow</h2>
            <ol className="mt-4 grid gap-3">
              {flow.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-[#d71920] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-slate-700">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
