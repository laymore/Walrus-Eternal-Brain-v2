// WC 2026 — Group Stage data và helper
// 32 đội, 8 bảng, mỗi bảng 4 đội (format gần giống WC 2026 mở rộng)

export interface Team {
  id: string;
  name: string;
  flag: string; // emoji flag
}

export interface WCMatch {
  id: string;
  label: string;
  group: string;
  teamA: Team;
  teamB: Team;
  winner?: string;
  date?: string;
}

export interface Group {
  name: string;
  teams: Team[];
  // 2 trận per group (giống seed data)
}

export const WC_2026_TEAMS: Team[] = [
  { id: "arg", name: "Argentina", flag: "🇦🇷" },
  { id: "mar", name: "Morocco", flag: "🇲🇦" },
  { id: "por", name: "Portugal", flag: "🇵🇹" },
  { id: "can", name: "Canada", flag: "🇨🇦" },
  { id: "fra", name: "France", flag: "🇫🇷" },
  { id: "sen", name: "Senegal", flag: "🇸🇳" },
  { id: "ned", name: "Netherlands", flag: "🇳🇱" },
  { id: "chi", name: "Chile", flag: "🇨🇱" },
  { id: "bra", name: "Brazil", flag: "🇧🇷" },
  { id: "nga", name: "Nigeria", flag: "🇳🇬" },
  { id: "jpn", name: "Japan", flag: "🇯🇵" },
  { id: "usa", name: "USA", flag: "🇺🇸" },
  { id: "eng", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "alg", name: "Algeria", flag: "🇩🇿" },
  { id: "kor", name: "South Korea", flag: "🇰🇷" },
  { id: "cro", name: "Croatia", flag: "🇭🇷" },
  { id: "esp", name: "Spain", flag: "🇪🇸" },
  { id: "egy", name: "Egypt", flag: "🇪🇬" },
  { id: "irn", name: "Iran", flag: "🇮🇷" },
  { id: "aus", name: "Australia", flag: "🇦🇺" },
  { id: "ger", name: "Germany", flag: "🇩🇪" },
  { id: "civ", name: "Ivory Coast", flag: "🇨🇮" },
  { id: "ksa", name: "Saudi Arabia", flag: "🇸🇦" },
  { id: "uru", name: "Uruguay", flag: "🇺🇾" },
  { id: "ita", name: "Italy", flag: "🇮🇹" },
  { id: "cmr", name: "Cameroon", flag: "🇨🇲" },
  { id: "ecu", name: "Ecuador", flag: "🇪🇨" },
  { id: "rsa", name: "South Africa", flag: "🇿🇦" },
  { id: "bel", name: "Belgium", flag: "🇧🇪" },
  { id: "gha", name: "Ghana", flag: "🇬🇭" },
  { id: "mex", name: "Mexico", flag: "🇲🇽" },
  { id: "den", name: "Denmark", flag: "🇩🇰" },
];

export const WC_2026_GROUPS: Group[] = [
  { name: "Group A", teams: [WC_2026_TEAMS[0], WC_2026_TEAMS[1], WC_2026_TEAMS[2], WC_2026_TEAMS[3]] },
  { name: "Group B", teams: [WC_2026_TEAMS[4], WC_2026_TEAMS[5], WC_2026_TEAMS[6], WC_2026_TEAMS[7]] },
  { name: "Group C", teams: [WC_2026_TEAMS[8], WC_2026_TEAMS[9], WC_2026_TEAMS[10], WC_2026_TEAMS[11]] },
  { name: "Group D", teams: [WC_2026_TEAMS[12], WC_2026_TEAMS[13], WC_2026_TEAMS[14], WC_2026_TEAMS[15]] },
  { name: "Group E", teams: [WC_2026_TEAMS[16], WC_2026_TEAMS[17], WC_2026_TEAMS[18], WC_2026_TEAMS[19]] },
  { name: "Group F", teams: [WC_2026_TEAMS[20], WC_2026_TEAMS[21], WC_2026_TEAMS[22], WC_2026_TEAMS[23]] },
  { name: "Group G", teams: [WC_2026_TEAMS[24], WC_2026_TEAMS[25], WC_2026_TEAMS[26], WC_2026_TEAMS[27]] },
  { name: "Group H", teams: [WC_2026_TEAMS[28], WC_2026_TEAMS[29], WC_2026_TEAMS[30], WC_2026_TEAMS[31]] },
];

export const WC_MATCHES: WCMatch[] = WC_2026_GROUPS.flatMap((group, gi) => [
  {
    id: `wc2026_gs_${gi}_1`,
    label: `${group.name} M1`,
    group: group.name,
    teamA: group.teams[0],
    teamB: group.teams[1],
  },
  {
    id: `wc2026_gs_${gi}_2`,
    label: `${group.name} M2`,
    group: group.name,
    teamA: group.teams[2],
    teamB: group.teams[3],
  },
]);

// Thống kê bias và confidence
export function calcConfidenceLabel(confidence: number): { label: string; level: 'conservative' | 'moderate' | 'confident' | 'overconfident' } {
  if (confidence < 60) return { label: 'Doubtful', level: 'conservative' };
  if (confidence < 80) return { label: 'Hesitant', level: 'moderate' };
  if (confidence < 99) return { label: 'Confident', level: 'confident' };
  return { label: 'LOCK 🔒', level: 'overconfident' };
}

// Point system cho game vote
export function calcPointsForMatch(confidence: number, correct: boolean): number {
  if (!correct) return 0;
  // Người confident hơn được nhiều điểm hơn nếu đúng
  if (confidence >= 99) return 30;
  if (confidence >= 80) return 20;
  if (confidence >= 60) return 12;
  return 5;
}
