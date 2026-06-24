import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import {
  createServiceClient,
  hasSupabaseServiceEnv,
} from "@/lib/supabase/service";

type TeamRef = {
  country_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  flag_asset_path: string | null;
};

type LiveMatch = {
  id: string;
  round_key: string;
  match_number: number;
  match_start_at: string;
  prediction_lock_at: string;
  status: string;
  team_a?: TeamRef | null;
  team_b?: TeamRef | null;
};

type RawLiveMatch = Omit<LiveMatch, "team_a" | "team_b"> & {
  team_a?: TeamRef | TeamRef[] | null;
  team_b?: TeamRef | TeamRef[] | null;
};

async function loadMatches() {
  if (!hasSupabaseServiceEnv()) return { rows: [] as LiveMatch[], error: "" };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("knockout_matches")
      .select(
        "id, round_key, match_number, match_start_at, prediction_lock_at, status, team_a:teams!knockout_matches_team_a_id_fkey(country_name, country_code, flag_url, flag_asset_path), team_b:teams!knockout_matches_team_b_id_fkey(country_name, country_code, flag_url, flag_asset_path)",
      )
      .order("match_start_at", { ascending: true });

    if (error) throw error;
    const rows = ((data ?? []) as RawLiveMatch[]).map((match) => ({
      ...match,
      team_a: Array.isArray(match.team_a) ? match.team_a[0] : match.team_a,
      team_b: Array.isArray(match.team_b) ? match.team_b[0] : match.team_b,
    }));

    return { rows, error: "" };
  } catch (error) {
    return {
      rows: [] as LiveMatch[],
      error:
        error instanceof Error ? error.message : "Unable to load live matches.",
    };
  }
}

function flagPath(team?: TeamRef | null) {
  return team?.flag_asset_path || team?.flag_url || "";
}

function teamName(team?: TeamRef | null) {
  return team?.country_name || team?.country_code || "Waiting team";
}

function TeamCell({ team }: { team?: TeamRef | null }) {
  const flag = flagPath(team);

  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-11 shrink-0 place-items-center overflow-hidden rounded bg-slate-100 text-[10px] font-black text-slate-500">
        {flag ? (
          <img src={flag} alt="" className="h-full w-full object-cover" />
        ) : (
          team?.country_code || "-"
        )}
      </span>
      <span className="font-bold">{teamName(team)}</span>
    </div>
  );
}

export default async function AdminMatchesPage() {
  const { rows, error } = await loadMatches();

  return (
    <AdminLayout active="/admin/matches">
      <SectionHeader eyebrow="Matches" title="比赛管理" />
      {error ? (
        <div className="mb-4 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {error}
        </div>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="p-4">Round</th>
              <th className="p-4">No.</th>
              <th className="p-4">Team A</th>
              <th className="p-4">Team B</th>
              <th className="p-4">Kickoff</th>
              <th className="p-4">Lock Time</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-5 text-sm font-bold text-slate-500" colSpan={7}>
                  No live match records yet.
                </td>
              </tr>
            ) : null}
            {rows.map((match) => (
              <tr key={match.id} className="border-t border-slate-100">
                <td className="p-4 font-black">{match.round_key}</td>
                <td className="p-4 font-black">{match.match_number}</td>
                <td className="p-4">
                  <TeamCell team={match.team_a} />
                </td>
                <td className="p-4">
                  <TeamCell team={match.team_b} />
                </td>
                <td className="p-4">
                  {new Date(match.match_start_at).toLocaleString("zh-MY")}
                </td>
                <td className="p-4">
                  {new Date(match.prediction_lock_at).toLocaleString("zh-MY")}
                </td>
                <td className="p-4 font-black text-[#0f8a4b]">
                  {match.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
