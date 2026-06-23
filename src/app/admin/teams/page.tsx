import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { Last32AdminSelector, type AdminTeamOption } from "@/components/last32-admin-selector";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { teams as demoTeams } from "@/lib/demo-data";
import { stageInlineName } from "@/lib/stage-labels";

type SquadAdminRow = {
  id: string;
  team_no: number;
  team_name: string | null;
  status: string;
  owner_profile_id: string;
  owner?: {
    nickname: string | null;
    display_name: string | null;
    referral_code: string | null;
  } | null;
  score?: {
    team_final_score: number | null;
    member_count: number | null;
  } | null;
};

function ownerName(row: SquadAdminRow) {
  return row.owner?.nickname || row.owner?.display_name || "Owner";
}

export default async function AdminTeamsPage() {
  let teams: AdminTeamOption[] = demoTeams.map((team) => ({
    id: team.id,
    country_name: team.name,
    country_code: team.shortName,
    flag_url: team.flagImage,
    flag_asset_path: team.flagImage,
    group_name: team.groupName,
    is_active: true,
  }));
  let selectedTeamIds: string[] = [];
  let squadRows: SquadAdminRow[] = [];

  if (hasSupabaseServerEnv()) {
    const supabase = await createClient();
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, country_name, country_code, flag_url, flag_asset_path, group_name, is_active")
      .order("country_name", { ascending: true });

    if (teamData?.length) {
      teams = teamData as AdminTeamOption[];
    }

    const { data: selectedData } = await supabase
      .from("tournament_teams")
      .select("team_id, tournaments!inner(name)")
      .eq("stage", "last_32")
      .eq("tournaments.name", "FIFA World Cup 2026")
      .order("seed_position", { ascending: true });

    selectedTeamIds = (selectedData ?? []).map((row) => row.team_id as string);

    await supabase.rpc("rebuild_final_score_summaries");
    const { data: squadData } = await supabase
      .from("squad_teams")
      .select(
        "id, team_no, team_name, status, owner_profile_id, owner:owner_profile_id(nickname, display_name, referral_code), score:squad_team_score_summaries(team_final_score, member_count)",
      )
      .order("owner_profile_id", { ascending: true })
      .order("team_no", { ascending: true });

    squadRows = ((squadData ?? []) as unknown as Array<
      Omit<SquadAdminRow, "owner" | "score"> & {
        owner: SquadAdminRow["owner"] | SquadAdminRow["owner"][];
        score: SquadAdminRow["score"] | SquadAdminRow["score"][];
      }
    >).map((row) => ({
      ...row,
      owner: Array.isArray(row.owner) ? row.owner[0] ?? null : row.owner,
      score: Array.isArray(row.score) ? row.score[0] ?? null : row.score,
    }));
  }

  return (
    <AdminLayout active="/admin/teams">
      <SectionHeader
        eyebrow="Teams Database"
        title={`Manage ${stageInlineName("last_32")}`}
        body="Admin selects teams from the database. Team names are not typed manually."
      />
      <Last32AdminSelector teams={teams} selectedTeamIds={selectedTeamIds} />

      <section className="card mt-6 overflow-x-auto">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-xl font-black text-slate-950">Team Mode Overview</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Shows every referral team independently. One owner can have Team 1, Team 2, Team 3 with the same referral code.
          </p>
        </div>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="p-4">Owner</th>
              <th className="p-4">Referral Code</th>
              <th className="p-4">Team No.</th>
              <th className="p-4">Team Name</th>
              <th className="p-4">Members</th>
              <th className="p-4">Team Final Score</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {squadRows.length ? (
              squadRows.map((row) => {
                const memberCount = Number(row.score?.member_count ?? 0);
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-4 font-black text-slate-950">{ownerName(row)}</td>
                    <td className="p-4">{row.owner?.referral_code ?? "-"}</td>
                    <td className="p-4 font-black">Team {row.team_no}</td>
                    <td className="p-4">{row.team_name ?? `${ownerName(row)} 的第${row.team_no}队`}</td>
                    <td className="p-4">{memberCount}/5</td>
                    <td className="p-4 font-black text-[#d71920]">
                      {Number(row.score?.team_final_score ?? 0)}
                    </td>
                    <td className="p-4 font-black text-[#0f8a4b]">
                      {memberCount >= 5 ? "Full" : row.status}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-4 text-sm font-bold text-slate-500" colSpan={7}>
                  No referral teams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  );
}
