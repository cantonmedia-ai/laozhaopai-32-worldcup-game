import {
  stageDescription,
  stageDisplayName,
  stageEnglishName,
} from "@/lib/stage-labels";

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
    shortName: stageEnglishName("last_16"),
    title: stageDisplayName("last_16"),
    body: stageDescription("last_16"),
  },
  last_8: {
    shortName: stageEnglishName("last_8"),
    title: stageDisplayName("last_8"),
    body: stageDescription("last_8"),
  },
  last_4: {
    shortName: stageEnglishName("last_4"),
    title: stageDisplayName("last_4"),
    body: stageDescription("last_4"),
  },
  finalists: {
    shortName: stageEnglishName("final"),
    title: stageDisplayName("final"),
    body: stageDescription("final"),
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
