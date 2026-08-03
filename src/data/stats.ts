export interface NovusStat {
  value: number;
  suffix: string;
}

export const NOVUS_STATS = {
  businessesServed: { value: 60, suffix: "+" } satisfies NovusStat,
  nycNeighborhoods: { value: 12, suffix: "+" } satisfies NovusStat,
  studentMembers: { value: 175, suffix: "+" } satisfies NovusStat,
  serviceTracks: { value: 3, suffix: "" } satisfies NovusStat,
  bidPartners: { value: 14, suffix: "+" } satisfies NovusStat,
  floridaBusinessesServed: { value: 40, suffix: "+" } satisfies NovusStat,
  operatingCities: { value: 6, suffix: "" } satisfies NovusStat,
} as const;

export function formatStat(stat: NovusStat): string {
  return `${stat.value}${stat.suffix}`;
}
