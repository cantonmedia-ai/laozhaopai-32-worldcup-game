import { PageShell, SectionHeader } from "@/components/app-shell";
import {
  RoadToChampionGame,
  type RoadPrediction,
  type RoadStage,
  type RoadTeam,
} from "@/components/road-to-champion-game";
import { requireCompletedProfile } from "@/lib/auth-guards";
import { getCurrentRound } from "@/lib/demo-data";
import { sortRoadStages } from "@/lib/road-to-champion";
import { stageInlineName } from "@/lib/stage-labels";
import { createClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

type RankingRow = {
  user_id: string;
  total_points: number;
  rank_position: number;
};

function demoStages(): RoadStage[] {
  return sortRoadStages([
    {
      stage_key: "last_16",
      stage_name: stageInlineName("last_16"),
      required_selection_count: 16,
      points_per_correct: 1,
      perfect_bonus_points: 20,
      due_at: "2026-06-28T15:59:00.000Z",
      status: "open",
    },
    {
      stage_key: "last_8",
      stage_name: stageInlineName("last_8"),
      required_selection_count: 8,
      points_per_correct: 2,
      perfect_bonus_points: 20,
      due_at: "2026-07-02T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "last_4",
      stage_name: stageInlineName("last_4"),
      required_selection_count: 4,
      points_per_correct: 4,
      perfect_bonus_points: 20,
      due_at: "2026-07-06T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "finalists",
      stage_name: stageInlineName("final"),
      required_selection_count: 2,
      points_per_correct: 6,
      perfect_bonus_points: 20,
      due_at: "2026-07-10T15:59:00.000Z",
      status: "draft",
    },
    {
      stage_key: "champion",
      stage_name: "Champion",
      required_selection_count: 1,
      points_per_correct: 10,
      perfect_bonus_points: 0,
      due_at: "2026-07-13T15:59:00.000Z",
      status: "draft",
    },
  ] as RoadStage[]);
}

function demoRoadTeams(): RoadTeam[] {
  const countries = [
    ["arg", "Argentina", "ARG", "ar"],
    ["aus", "Australia", "AUS", "au"],
    ["aut", "Austria", "AUT", "at"],
    ["bel", "Belgium", "BEL", "be"],
    ["bra", "Brazil", "BRA", "br"],
    ["cpv", "Cabo Verde", "CPV", "cv"],
    ["can", "Canada", "CAN", "ca"],
    ["col", "Colombia", "COL", "co"],
    ["crc", "Costa Rica", "CRC", "cr"],
    ["cro", "Croatia", "CRO", "hr"],
    ["cze", "Czechia", "CZE", "cz"],
    ["den", "Denmark", "DEN", "dk"],
    ["ecu", "Ecuador", "ECU", "ec"],
    ["egy", "Egypt", "EGY", "eg"],
    ["eng", "England", "ENG", "gb-eng"],
    ["fra", "France", "FRA", "fr"],
    ["ger", "Germany", "GER", "de"],
    ["gha", "Ghana", "GHA", "gh"],
    ["hai", "Haiti", "HAI", "ht"],
    ["hon", "Honduras", "HON", "hn"],
    ["irn", "Iran", "IRN", "ir"],
    ["irq", "Iraq", "IRQ", "iq"],
    ["ita", "Italy", "ITA", "it"],
    ["jpn", "Japan", "JPN", "jp"],
    ["jor", "Jordan", "JOR", "jo"],
    ["kor", "Korea Republic", "KOR", "kr"],
    ["mex", "Mexico", "MEX", "mx"],
    ["mar", "Morocco", "MAR", "ma"],
    ["ned", "Netherlands", "NED", "nl"],
    ["nzl", "New Zealand", "NZL", "nz"],
    ["nga", "Nigeria", "NGA", "ng"],
    ["nor", "Norway", "NOR", "no"],
    ["pan", "Panama", "PAN", "pa"],
    ["par", "Paraguay", "PAR", "py"],
    ["pol", "Poland", "POL", "pl"],
    ["por", "Portugal", "POR", "pt"],
    ["ksa", "Saudi Arabia", "KSA", "sa"],
    ["sen", "Senegal", "SEN", "sn"],
    ["srb", "Serbia", "SRB", "rs"],
    ["rsa", "South Africa", "RSA", "za"],
    ["esp", "Spain", "ESP", "es"],
    ["sui", "Switzerland", "SUI", "ch"],
    ["tun", "Tunisia", "TUN", "tn"],
    ["uru", "Uruguay", "URU", "uy"],
    ["usa", "USA", "USA", "us"],
    ["uzb", "Uzbekistan", "UZB", "uz"],
    ["ven", "Venezuela", "VEN", "ve"],
    ["wal", "Wales", "WAL", "gb-wls"],
  ];

  return countries.map(([id, name, code, flagCode]) => ({
    id: `mock-${id}`,
    country_name: name,
    country_code: code,
    flag_url: `https://flagcdn.com/w160/${flagCode}.png`,
    flag_asset_path: null,
  }));
}

export default async function RoadToChampionPage() {
  const profile = await requireCompletedProfile("/road-to-champion");
  let stages = demoStages();
  let teams = demoRoadTeams();
  let predictions: RoadPrediction[] = [];
  let totalPoints = 0;
  let rank: number | null = null;
  let referralCount = 0;
  let referralPoints = 0;

  if (hasSupabaseServerEnv() && profile) {
    const supabase = await createClient();

    const { data: pointRows } = await supabase
      .from("point_transactions")
      .select("source_type, points")
      .eq("user_id", profile.auth_user_id);

    totalPoints = (pointRows ?? []).reduce(
      (sum, row) => sum + Number(row.points ?? 0),
      0,
    );
    referralPoints = (pointRows ?? [])
      .filter((row) => row.source_type === "referral")
      .reduce((sum, row) => sum + Number(row.points ?? 0), 0);

    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_profile_id", profile.id);
    referralCount = count ?? 0;

    const { data: rankingRows } = await supabase.rpc(
      "get_road_to_champion_leaderboard",
      { p_limit: 500 },
    );
    rank =
      ((rankingRows ?? []) as RankingRow[]).find(
        (row) => row.user_id === profile.auth_user_id,
      )?.rank_position ?? null;
  }

  const round = getCurrentRound();

  return (
    <PageShell active="/road-to-champion">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeader
          eyebrow={`${round.labelCn} Road Game`}
          title="Road to Champion Prediction"
          body="Predict which teams will reach each stage. Submit before the due date. The closer your prediction, the more points you earn."
        />
        <RoadToChampionGame
          stages={stages}
          teams={teams}
          predictions={predictions}
          summary={{
            totalPoints,
            rank,
            referralCode: profile?.referral_code ?? "",
            referralCount,
            referralPoints,
          }}
        />
      </main>
    </PageShell>
  );
}
