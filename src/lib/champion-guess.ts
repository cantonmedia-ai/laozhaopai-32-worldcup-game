export const PRIZE_LIMIT = 153;
export const MAX_PLAYER_ENTRIES = 500;

export type ChampionCountry = {
  group: string;
  code: string;
  name: string;
  flag: string;
};

export const CHAMPION_COUNTRIES: ChampionCountry[] = [
  { group: "Group A", code: "MEX", name: "Mexico", flag: "🇲🇽" },
  { group: "Group A", code: "RSA", name: "South Africa", flag: "🇿🇦" },
  { group: "Group A", code: "KOR", name: "South Korea", flag: "🇰🇷" },
  { group: "Group A", code: "CZE", name: "Czechia", flag: "🇨🇿" },
  { group: "Group B", code: "CAN", name: "Canada", flag: "🇨🇦" },
  { group: "Group B", code: "BIH", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { group: "Group B", code: "QAT", name: "Qatar", flag: "🇶🇦" },
  { group: "Group B", code: "SUI", name: "Switzerland", flag: "🇨🇭" },
  { group: "Group C", code: "BRA", name: "Brazil", flag: "🇧🇷" },
  { group: "Group C", code: "MAR", name: "Morocco", flag: "🇲🇦" },
  { group: "Group C", code: "HAI", name: "Haiti", flag: "🇭🇹" },
  { group: "Group C", code: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { group: "Group D", code: "USA", name: "United States", flag: "🇺🇸" },
  { group: "Group D", code: "PAR", name: "Paraguay", flag: "🇵🇾" },
  { group: "Group D", code: "AUS", name: "Australia", flag: "🇦🇺" },
  { group: "Group D", code: "TUR", name: "Turkey", flag: "🇹🇷" },
  { group: "Group E", code: "GER", name: "Germany", flag: "🇩🇪" },
  { group: "Group E", code: "CUW", name: "Curaçao", flag: "🇨🇼" },
  { group: "Group E", code: "CIV", name: "Ivory Coast", flag: "🇨🇮" },
  { group: "Group E", code: "ECU", name: "Ecuador", flag: "🇪🇨" },
  { group: "Group F", code: "NED", name: "Netherlands", flag: "🇳🇱" },
  { group: "Group F", code: "JPN", name: "Japan", flag: "🇯🇵" },
  { group: "Group F", code: "SWE", name: "Sweden", flag: "🇸🇪" },
  { group: "Group F", code: "TUN", name: "Tunisia", flag: "🇹🇳" },
  { group: "Group G", code: "BEL", name: "Belgium", flag: "🇧🇪" },
  { group: "Group G", code: "EGY", name: "Egypt", flag: "🇪🇬" },
  { group: "Group G", code: "IRN", name: "Iran", flag: "🇮🇷" },
  { group: "Group G", code: "NZL", name: "New Zealand", flag: "🇳🇿" },
  { group: "Group H", code: "ESP", name: "Spain", flag: "🇪🇸" },
  { group: "Group H", code: "CPV", name: "Cape Verde", flag: "🇨🇻" },
  { group: "Group H", code: "KSA", name: "Saudi Arabia", flag: "🇸🇦" },
  { group: "Group H", code: "URU", name: "Uruguay", flag: "🇺🇾" },
  { group: "Group I", code: "FRA", name: "France", flag: "🇫🇷" },
  { group: "Group I", code: "SEN", name: "Senegal", flag: "🇸🇳" },
  { group: "Group I", code: "IRQ", name: "Iraq", flag: "🇮🇶" },
  { group: "Group I", code: "NOR", name: "Norway", flag: "🇳🇴" },
  { group: "Group J", code: "ARG", name: "Argentina", flag: "🇦🇷" },
  { group: "Group J", code: "ALG", name: "Algeria", flag: "🇩🇿" },
  { group: "Group J", code: "AUT", name: "Austria", flag: "🇦🇹" },
  { group: "Group J", code: "JOR", name: "Jordan", flag: "🇯🇴" },
  { group: "Group K", code: "POR", name: "Portugal", flag: "🇵🇹" },
  { group: "Group K", code: "COD", name: "DR Congo", flag: "🇨🇩" },
  { group: "Group K", code: "UZB", name: "Uzbekistan", flag: "🇺🇿" },
  { group: "Group K", code: "COL", name: "Colombia", flag: "🇨🇴" },
  { group: "Group L", code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { group: "Group L", code: "CRO", name: "Croatia", flag: "🇭🇷" },
  { group: "Group L", code: "GHA", name: "Ghana", flag: "🇬🇭" },
  { group: "Group L", code: "PAN", name: "Panama", flag: "🇵🇦" },
];

export function getCountryByName(name: string) {
  const value = name.trim().toLowerCase();
  return CHAMPION_COUNTRIES.find((country) => country.name.toLowerCase() === value) ?? null;
}

export function getCountryByCode(code: string) {
  const value = code.trim().toUpperCase();
  return CHAMPION_COUNTRIES.find((country) => country.code === value) ?? null;
}

export function normalizeWhatsapp(input: string) {
  let value = input.trim().replace(/[^\d+]/g, "");
  if (value.startsWith("+")) value = value.slice(1);
  if (value.startsWith("0")) value = `6${value}`;
  return value;
}

export function isValidWhatsapp(input: string) {
  const normalized = normalizeWhatsapp(input);
  return /^\d{9,15}$/.test(normalized);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

export function groupCountries(countries = CHAMPION_COUNTRIES) {
  return countries.reduce<Record<string, ChampionCountry[]>>((groups, country) => {
    groups[country.group] = [...(groups[country.group] ?? []), country];
    return groups;
  }, {});
}

export function maskName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  return `${trimmed.slice(0, 1)}${"*".repeat(Math.min(trimmed.length - 2, 4))}${trimmed.slice(-1)}`;
}
