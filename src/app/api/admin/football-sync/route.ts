export const dynamic = "force-dynamic";

import { getCurrentProfile } from "@/lib/auth-guards";

type ProviderTeam = {
  id?: number | string;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

type ProviderMatch = {
  id: number | string;
  utcDate?: string;
  status?: string;
  stage?: string;
  group?: string | null;
  homeTeam?: ProviderTeam;
  awayTeam?: ProviderTeam;
};

type ProviderStanding = {
  stage?: string;
  group?: string | null;
  table?: Array<{
    position?: number;
    team?: ProviderTeam;
    playedGames?: number;
    points?: number;
  }>;
};

function footballDataUrl(path: string) {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/${path}`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

async function fetchProviderJson<T>(path: string, apiKey: string) {
  const response = await fetch(footballDataUrl(path), {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

function normalizeStage(value?: string) {
  return String(value ?? "").toUpperCase();
}

function knockoutRoundLabel(match: ProviderMatch) {
  const stage = normalizeStage(match.stage);
  if (stage.includes("LAST_32") || stage.includes("ROUND_OF_32") || stage.includes("ROUND_32")) {
    return "32强生死战 / Round of 32";
  }
  if (stage.includes("LAST_16") || stage.includes("ROUND_OF_16") || stage.includes("ROUND_16")) {
    return "16强争霸战 / Sweet 16";
  }
  if (
    stage.includes("QUARTER_FINAL") ||
    stage.includes("LAST_8") ||
    stage.includes("ROUND_OF_8")
  ) {
    return "八强决战 / Elite 8";
  }
  if (
    stage.includes("SEMI_FINAL") ||
    stage.includes("LAST_4") ||
    stage.includes("ROUND_OF_4")
  ) {
    return "四强王者战 / Final 4";
  }
  if (stage.includes("FINAL")) return "冠军终极战 / Grand Final";
  return null;
}

function normalizeTeam(team?: ProviderTeam) {
  return {
    id: String(team?.id ?? ""),
    name: team?.name ?? "TBC",
    shortName: team?.tla ?? team?.shortName ?? "TBC",
    crest: team?.crest ?? "",
  };
}

async function requireAdminJson() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return null;
  }
  return profile;
}

export async function GET(request: Request) {
  const profile = await requireAdminJson();
  if (!profile) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return Response.json({
      source: "not_configured",
      message: "FOOTBALL_DATA_API_KEY is not configured in Vercel.",
      fixtures: [],
      standings: [],
    });
  }

  const action = new URL(request.url).searchParams.get("action") ?? "fixtures";

  try {
    if (action === "standings") {
      const data = await fetchProviderJson<{ standings?: ProviderStanding[] }>(
        "standings",
        apiKey,
      );
      return Response.json({
        source: "live",
        action,
        updatedAt: new Date().toISOString(),
        standings: (data.standings ?? []).map((standing) => ({
          stage: standing.stage ?? "Group Stage",
          group: standing.group ?? standing.stage ?? "Table",
          rows: (standing.table ?? []).map((row) => ({
            position: row.position ?? 0,
            team: normalizeTeam(row.team),
            playedGames: row.playedGames ?? 0,
            points: row.points ?? 0,
          })),
        })),
      });
    }

    const data = await fetchProviderJson<{ matches?: ProviderMatch[] }>(
      "matches",
      apiKey,
    );
    const fixtures = (data.matches ?? [])
      .map((match) => ({ match, round: knockoutRoundLabel(match) }))
      .filter((row): row is { match: ProviderMatch; round: string } => Boolean(row.round))
      .map(({ match, round }) => ({
        apiFixtureId: String(match.id),
        round,
        teamA: normalizeTeam(match.homeTeam),
        teamB: normalizeTeam(match.awayTeam),
        matchDateTime: match.utcDate ?? "",
        predictionDueAt: match.utcDate
          ? new Date(new Date(match.utcDate).getTime() - 15 * 60 * 1000).toISOString()
          : "",
        apiStatus: match.status ?? "UNKNOWN",
        publishStatus: "admin_review",
      }));

    return Response.json({
      source: "live",
      action,
      updatedAt: new Date().toISOString(),
      fixtures,
      message: fixtures.length
        ? "Knockout fixtures detected. Admin must review before publishing."
        : "No knockout fixtures detected yet. Keep Game 2 waiting.",
    });
  } catch (error) {
    return Response.json(
      {
        source: "error",
        action,
        message:
          error instanceof Error
            ? error.message
            : "Unable to sync football provider data.",
        fixtures: [],
        standings: [],
      },
      { status: 502 },
    );
  }
}

export async function POST() {
  const profile = await requireAdminJson();
  if (!profile) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  return Response.json(
    {
      publishStatus: "manual_review_required",
      message:
        "Auto-publish is disabled. Review detected fixtures, then create/publish matches through admin match controls.",
    },
    { status: 409 },
  );
}
