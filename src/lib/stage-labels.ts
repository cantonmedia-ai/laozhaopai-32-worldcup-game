export const knockoutStageLabels = {
  last_32: {
    cn: "32强生死战",
    en: "Round of 32",
    description: "第一轮淘汰正式开始，输一场就回家。",
  },
  last_16: {
    cn: "16强争霸战",
    en: "Sweet 16",
    description: "真正强队开始碰头，谁能继续冲冠军？",
  },
  last_8: {
    cn: "八强决战",
    en: "Elite 8",
    description: "进入八强，每一场都是硬仗。",
  },
  last_4: {
    cn: "四强王者战",
    en: "Final 4",
    description: "距离冠军只差一步，王者气势正式爆发。",
  },
  final: {
    cn: "冠军终极战",
    en: "Grand Final",
    description: "最后一战，决定谁是世界冠军！",
  },
} as const;

export type KnockoutStageKey = keyof typeof knockoutStageLabels;

const legacyRoundIdMap: Record<string, KnockoutStageKey> = {
  r32: "last_32",
  r16: "last_16",
  qf: "last_8",
  sf: "last_4",
  f: "final",
  finalists: "final",
};

export function normalizeKnockoutStageKey(value?: string | null): KnockoutStageKey {
  if (!value) return "last_32";
  const normalized = value.toLowerCase().trim().replace(/\s+/g, "_");
  const mapped = legacyRoundIdMap[normalized] ?? normalized;
  if (mapped in knockoutStageLabels) return mapped as KnockoutStageKey;
  return "last_32";
}

export function stageDisplayName(value?: string | null) {
  const label = knockoutStageLabels[normalizeKnockoutStageKey(value)];
  return `${label.cn}\n${label.en}`;
}

export function stageInlineName(value?: string | null) {
  const label = knockoutStageLabels[normalizeKnockoutStageKey(value)];
  return `${label.cn} / ${label.en}`;
}

export function stageDescription(value?: string | null) {
  return knockoutStageLabels[normalizeKnockoutStageKey(value)].description;
}

export function stageEnglishName(value?: string | null) {
  return knockoutStageLabels[normalizeKnockoutStageKey(value)].en;
}

export const knockoutStageOrder = [
  "last_32",
  "last_16",
  "last_8",
  "last_4",
  "final",
] as const satisfies readonly KnockoutStageKey[];
