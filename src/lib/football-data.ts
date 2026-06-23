type ProviderMatch = {
  utcDate?: string;
  stage?: string;
  status?: string;
};

export type FixtureDeadline = {
  kickoffAt: string;
  dueAt: string;
};

function footballDataUrl(path: string) {
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org";
  const url = new URL(`/v4/competitions/${competition}/${path}`, baseUrl);
  url.searchParams.set("season", season);
  return url;
}

function normalizeStage(value?: string) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function stageMatches(match: ProviderMatch, aliases: string[]) {
  const stage = normalizeStage(match.stage);
  return aliases.some((alias) => stage.includes(alias));
}

export async function loadFirstFixtureDeadline(
  aliases: string[],
  revalidate = 900,
): Promise<FixtureDeadline | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(footballDataUrl("matches"), {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { matches?: ProviderMatch[] };
    const kickoffAt = (data.matches ?? [])
      .filter((match) => stageMatches(match, aliases))
      .map((match) => match.utcDate)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    if (!kickoffAt) return null;

    return {
      kickoffAt,
      dueAt: new Date(new Date(kickoffAt).getTime() - 15 * 60 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export function loadFirstLast16Deadline() {
  return loadFirstFixtureDeadline(["LAST_16", "ROUND_OF_16", "ROUND_16"]);
}

export function loadFirstRoundOf32Deadline() {
  return loadFirstFixtureDeadline(["LAST_32", "ROUND_OF_32", "ROUND_32"]);
}
