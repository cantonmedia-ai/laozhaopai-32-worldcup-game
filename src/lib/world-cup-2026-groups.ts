export type WorldCup2026GroupTeam = {
  countryName: string;
  countryCode: string;
  flagUrl: string;
  groupName: string;
  groupKey: string;
  aliases?: string[];
};

const flag = (code: string) => `https://flagcdn.com/w160/${code}.png`;

export const worldCup2026Groups: WorldCup2026GroupTeam[] = [
  { countryName: "Mexico", countryCode: "MEX", flagUrl: flag("mx"), groupName: "Group A", groupKey: "A" },
  { countryName: "South Africa", countryCode: "RSA", flagUrl: flag("za"), groupName: "Group A", groupKey: "A" },
  { countryName: "South Korea", countryCode: "KOR", flagUrl: flag("kr"), groupName: "Group A", groupKey: "A", aliases: ["Korea Republic", "Republic of Korea"] },
  { countryName: "Czechia", countryCode: "CZE", flagUrl: flag("cz"), groupName: "Group A", groupKey: "A", aliases: ["Czech Republic"] },

  { countryName: "Canada", countryCode: "CAN", flagUrl: flag("ca"), groupName: "Group B", groupKey: "B" },
  { countryName: "Bosnia and Herzegovina", countryCode: "BIH", flagUrl: flag("ba"), groupName: "Group B", groupKey: "B", aliases: ["Bosnia"] },
  { countryName: "Qatar", countryCode: "QAT", flagUrl: flag("qa"), groupName: "Group B", groupKey: "B" },
  { countryName: "Switzerland", countryCode: "SUI", flagUrl: flag("ch"), groupName: "Group B", groupKey: "B" },

  { countryName: "Brazil", countryCode: "BRA", flagUrl: flag("br"), groupName: "Group C", groupKey: "C" },
  { countryName: "Morocco", countryCode: "MAR", flagUrl: flag("ma"), groupName: "Group C", groupKey: "C" },
  { countryName: "Haiti", countryCode: "HAI", flagUrl: flag("ht"), groupName: "Group C", groupKey: "C" },
  { countryName: "Scotland", countryCode: "SCO", flagUrl: flag("gb-sct"), groupName: "Group C", groupKey: "C" },

  { countryName: "United States", countryCode: "USA", flagUrl: flag("us"), groupName: "Group D", groupKey: "D", aliases: ["USA", "United States of America"] },
  { countryName: "Paraguay", countryCode: "PAR", flagUrl: flag("py"), groupName: "Group D", groupKey: "D" },
  { countryName: "Australia", countryCode: "AUS", flagUrl: flag("au"), groupName: "Group D", groupKey: "D" },
  { countryName: "Turkey", countryCode: "TUR", flagUrl: flag("tr"), groupName: "Group D", groupKey: "D" },

  { countryName: "Germany", countryCode: "GER", flagUrl: flag("de"), groupName: "Group E", groupKey: "E" },
  { countryName: "Curacao", countryCode: "CUW", flagUrl: flag("cw"), groupName: "Group E", groupKey: "E", aliases: ["Curacao"] },
  { countryName: "Ivory Coast", countryCode: "CIV", flagUrl: flag("ci"), groupName: "Group E", groupKey: "E", aliases: ["Cote d'Ivoire"] },
  { countryName: "Ecuador", countryCode: "ECU", flagUrl: flag("ec"), groupName: "Group E", groupKey: "E" },

  { countryName: "Netherlands", countryCode: "NED", flagUrl: flag("nl"), groupName: "Group F", groupKey: "F" },
  { countryName: "Japan", countryCode: "JPN", flagUrl: flag("jp"), groupName: "Group F", groupKey: "F" },
  { countryName: "Sweden", countryCode: "SWE", flagUrl: flag("se"), groupName: "Group F", groupKey: "F" },
  { countryName: "Tunisia", countryCode: "TUN", flagUrl: flag("tn"), groupName: "Group F", groupKey: "F" },

  { countryName: "Belgium", countryCode: "BEL", flagUrl: flag("be"), groupName: "Group G", groupKey: "G" },
  { countryName: "Egypt", countryCode: "EGY", flagUrl: flag("eg"), groupName: "Group G", groupKey: "G" },
  { countryName: "Iran", countryCode: "IRN", flagUrl: flag("ir"), groupName: "Group G", groupKey: "G" },
  { countryName: "New Zealand", countryCode: "NZL", flagUrl: flag("nz"), groupName: "Group G", groupKey: "G" },

  { countryName: "Spain", countryCode: "ESP", flagUrl: flag("es"), groupName: "Group H", groupKey: "H" },
  { countryName: "Cape Verde", countryCode: "CPV", flagUrl: flag("cv"), groupName: "Group H", groupKey: "H", aliases: ["Cabo Verde"] },
  { countryName: "Saudi Arabia", countryCode: "KSA", flagUrl: flag("sa"), groupName: "Group H", groupKey: "H" },
  { countryName: "Uruguay", countryCode: "URU", flagUrl: flag("uy"), groupName: "Group H", groupKey: "H" },

  { countryName: "France", countryCode: "FRA", flagUrl: flag("fr"), groupName: "Group I", groupKey: "I" },
  { countryName: "Senegal", countryCode: "SEN", flagUrl: flag("sn"), groupName: "Group I", groupKey: "I" },
  { countryName: "Iraq", countryCode: "IRQ", flagUrl: flag("iq"), groupName: "Group I", groupKey: "I" },
  { countryName: "Norway", countryCode: "NOR", flagUrl: flag("no"), groupName: "Group I", groupKey: "I" },

  { countryName: "Argentina", countryCode: "ARG", flagUrl: flag("ar"), groupName: "Group J", groupKey: "J" },
  { countryName: "Algeria", countryCode: "ALG", flagUrl: flag("dz"), groupName: "Group J", groupKey: "J" },
  { countryName: "Austria", countryCode: "AUT", flagUrl: flag("at"), groupName: "Group J", groupKey: "J" },
  { countryName: "Jordan", countryCode: "JOR", flagUrl: flag("jo"), groupName: "Group J", groupKey: "J" },

  { countryName: "Portugal", countryCode: "POR", flagUrl: flag("pt"), groupName: "Group K", groupKey: "K" },
  { countryName: "DR Congo", countryCode: "COD", flagUrl: flag("cd"), groupName: "Group K", groupKey: "K", aliases: ["Congo DR", "Democratic Republic of the Congo"] },
  { countryName: "Uzbekistan", countryCode: "UZB", flagUrl: flag("uz"), groupName: "Group K", groupKey: "K" },
  { countryName: "Colombia", countryCode: "COL", flagUrl: flag("co"), groupName: "Group K", groupKey: "K" },

  { countryName: "England", countryCode: "ENG", flagUrl: flag("gb-eng"), groupName: "Group L", groupKey: "L" },
  { countryName: "Croatia", countryCode: "CRO", flagUrl: flag("hr"), groupName: "Group L", groupKey: "L" },
  { countryName: "Ghana", countryCode: "GHA", flagUrl: flag("gh"), groupName: "Group L", groupKey: "L" },
  { countryName: "Panama", countryCode: "PAN", flagUrl: flag("pa"), groupName: "Group L", groupKey: "L" },
];
