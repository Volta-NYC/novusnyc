export type ChapterLocation = {
  name: string;
  lat: number;
  lng: number;
  type: "hub" | "chapter";
  subtitle?: string;
};

export type ChapterConnection = [from: string, to: string];

export const chapterLocations: ChapterLocation[] = [
  {
    name: "New York City",
    lat: 40.7128,
    lng: -74.006,
    type: "hub",
    subtitle: "Flagship Chapter",
  },
  {
    name: "Boston",
    lat: 42.3601,
    lng: -71.0589,
    type: "chapter",
  },
  {
    name: "Chicago",
    lat: 41.8781,
    lng: -87.6298,
    type: "chapter",
  },
];

export const chapterConnections: ChapterConnection[] = [
  ["New York City", "Boston"],
  ["New York City", "Chicago"],
];
