export const roadStageOrder = [
  "last_16",
  "last_8",
  "last_4",
  "finalists",
  "champion",
] as const;

export type RoadStageKey = (typeof roadStageOrder)[number];

export const roadStageCopy: Record<
  RoadStageKey,
  {
    shortName: string;
    title: string;
    body: string;
  }
> = {
  last_16: {
    shortName: "Last 16",
    title: "Guess Last 16",
    body: "Pick 16 teams you think will survive.",
  },
  last_8: {
    shortName: "Last 8",
    title: "Guess Last 8",
    body: "Pick 8 teams you think will reach quarter-final.",
  },
  last_4: {
    shortName: "Last 4",
    title: "Guess Last 4",
    body: "Pick 4 teams you think will reach semi-final.",
  },
  finalists: {
    shortName: "Final",
    title: "Guess Finalists",
    body: "Pick 2 teams you think will reach the final.",
  },
  champion: {
    shortName: "Champion",
    title: "Guess Champion",
    body: "Pick 1 team you think will win it all.",
  },
};

export function sortRoadStages<T extends { stage_key: string }>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      roadStageOrder.indexOf(a.stage_key as RoadStageKey) -
      roadStageOrder.indexOf(b.stage_key as RoadStageKey),
  );
}

export function formatMalaysiaDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toMalaysiaDateTimeInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

export function malaysiaInputToIso(value: string) {
  const [date, time] = value.split("T");
  if (!date || !time) return new Date().toISOString();

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour - 8, minute);
  return new Date(utcMs).toISOString();
}
