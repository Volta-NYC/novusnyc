export type ChapterLocation = {
  name: string;
  state: string;
  lat: number;
  lng: number;
  type: "hub" | "chapter";
  subtitle?: string;
  globeLabel?: string;
};

export type ChapterConnection = [from: string, to: string];

export const chapterLocations: ChapterLocation[] = [
  {
    name: "New York City",
    state: "NY",
    lat: 40.7128,
    lng: -74.006,
    type: "hub",
    subtitle: "Flagship Team",
  },
  {
    name: "Boston",
    state: "MA",
    lat: 42.3601,
    lng: -71.0589,
    type: "chapter",
  },
  {
    name: "Chicago",
    state: "IL",
    lat: 41.8781,
    lng: -87.6298,
    type: "chapter",
  },
  {
    name: "Hoover",
    state: "AL",
    lat: 33.4054,
    lng: -86.8114,
    type: "chapter",
    globeLabel: "AL",
  },
  {
    name: "Los Angeles",
    state: "CA",
    lat: 34.0522,
    lng: -118.2437,
    type: "chapter",
  },
  {
    name: "Tampa",
    state: "FL",
    lat: 27.9506,
    lng: -82.4572,
    type: "chapter",
  },
  {
    name: "Baltimore",
    state: "MD",
    lat: 39.2904,
    lng: -76.6122,
    type: "chapter",
  },
  {
    name: "Concord",
    state: "NC",
    lat: 35.4088,
    lng: -80.5795,
    type: "chapter",
    globeLabel: "NC",
  },
  {
    name: "Princeton",
    state: "NJ",
    lat: 40.3573,
    lng: -74.6672,
    type: "chapter",
    globeLabel: "NJ",
  },
  {
    name: "Austin",
    state: "TX",
    lat: 30.2672,
    lng: -97.7431,
    type: "chapter",
  },
  {
    name: "Salt Lake City",
    state: "UT",
    lat: 40.7608,
    lng: -111.891,
    type: "chapter",
  },
  {
    name: "Ashburn",
    state: "VA",
    lat: 39.0438,
    lng: -77.4874,
    type: "chapter",
    globeLabel: "VA",
  },
  {
    name: "Kent",
    state: "WA",
    lat: 47.3809,
    lng: -122.2348,
    type: "chapter",
    globeLabel: "WA",
  },
];

const hub = chapterLocations.find((location) => location.type === "hub");

if (!hub) {
  throw new Error("The Novus network requires a hub location.");
}

export const chapterConnections: ChapterConnection[] = chapterLocations
  .filter((location) => location.type === "chapter")
  .map((location) => [hub.name, location.name] as ChapterConnection);
