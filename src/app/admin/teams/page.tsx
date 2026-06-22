import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import { Last32AdminSelector, type AdminTeamOption } from "@/components/last32-admin-selector";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { teams as demoTeams } from "@/lib/demo-data";
import { stageInlineName } from "@/lib/stage-labels";

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
  }

  return (
    <AdminLayout active="/admin/teams">
      <SectionHeader
        eyebrow="Teams Database"
        title={`Manage ${stageInlineName("last_32")}`}
        body="Admin selects teams from the database. Team names are not typed manually."
      />
      <Last32AdminSelector teams={teams} selectedTeamIds={selectedTeamIds} />
    </AdminLayout>
  );
}
