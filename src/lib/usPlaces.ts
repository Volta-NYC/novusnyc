/**
 * US states and their larger cities, for the application form's location fields.
 *
 * Cities are limited to roughly the 100,000+ population tier (2020 Census
 * ordering). That threshold is deliberate: it keeps each dropdown scannable,
 * and an applicant's exact municipality is not something Novus acts on. Anyone
 * in a smaller town picks the nearest listed city, which is accurate enough for
 * the only thing this field decides — which chapter to point them at.
 *
 * Every state has at least one entry so the city dropdown is never empty.
 */

const US_STATES: ReadonlyArray<{ abbr: string; name: string }> = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DC", name: "District of Columbia" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NY", name: "New York" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WY", name: "Wyoming" },
];

/** Sentinel appended to every state so nobody is forced into a wrong answer. */
const OTHER_CITY = "Other / not listed";

const CITIES: Record<string, string[]> = {
  AL: ["Birmingham", "Huntsville", "Mobile", "Montgomery", "Tuscaloosa"],
  AK: ["Anchorage"],
  AZ: ["Chandler", "Gilbert", "Glendale", "Goodyear", "Mesa", "Peoria", "Phoenix", "Scottsdale", "Surprise", "Tempe", "Tucson", "Yuma"],
  AR: ["Fayetteville", "Fort Smith", "Little Rock", "Springdale"],
  CA: [
    "Anaheim", "Antioch", "Bakersfield", "Berkeley", "Burbank", "Carlsbad", "Chico", "Chula Vista", "Clovis",
    "Concord", "Corona", "Costa Mesa", "Daly City", "Downey", "El Cajon", "El Monte", "Elk Grove", "Escondido",
    "Fairfield", "Fontana", "Fremont", "Fresno", "Fullerton", "Garden Grove", "Glendale", "Hayward",
    "Huntington Beach", "Inglewood", "Irvine", "Jurupa Valley", "Lancaster", "Long Beach", "Los Angeles",
    "Menifee", "Modesto", "Moreno Valley", "Murrieta", "Norwalk", "Oakland", "Oceanside", "Ontario", "Orange",
    "Oxnard", "Palmdale", "Pasadena", "Pomona", "Rancho Cucamonga", "Rialto", "Richmond", "Riverside",
    "Roseville", "Sacramento", "Salinas", "San Bernardino", "San Diego", "San Francisco", "San Jose",
    "San Mateo", "Santa Ana", "Santa Clara", "Santa Clarita", "Santa Maria", "Santa Rosa", "Simi Valley",
    "Stockton", "Sunnyvale", "Temecula", "Thousand Oaks", "Torrance", "Tracy", "Vacaville", "Vallejo",
    "Victorville", "Visalia", "West Covina", "Westminster",
  ],
  CO: ["Arvada", "Aurora", "Boulder", "Centennial", "Colorado Springs", "Denver", "Fort Collins", "Greeley", "Lakewood", "Longmont", "Pueblo", "Thornton", "Westminster"],
  CT: ["Bridgeport", "Hartford", "New Haven", "Stamford", "Waterbury"],
  DC: ["Washington"],
  DE: ["Wilmington"],
  FL: [
    "Cape Coral", "Clearwater", "Coral Springs", "Fort Lauderdale", "Gainesville", "Hialeah", "Hollywood",
    "Jacksonville", "Lakeland", "Miami", "Miami Gardens", "Miramar", "Orlando", "Palm Bay", "Pembroke Pines",
    "Pompano Beach", "Port St. Lucie", "St. Petersburg", "Tallahassee", "Tampa", "West Palm Beach",
  ],
  GA: ["Athens", "Atlanta", "Augusta", "Columbus", "Macon", "Sandy Springs", "Savannah", "South Fulton"],
  HI: ["Honolulu"],
  IA: ["Cedar Rapids", "Davenport", "Des Moines", "Iowa City"],
  ID: ["Boise", "Meridian", "Nampa"],
  IL: ["Aurora", "Chicago", "Elgin", "Joliet", "Naperville", "Peoria", "Rockford", "Springfield"],
  IN: ["Carmel", "Evansville", "Fishers", "Fort Wayne", "Indianapolis", "South Bend"],
  KS: ["Kansas City", "Olathe", "Overland Park", "Topeka", "Wichita"],
  KY: ["Lexington", "Louisville"],
  LA: ["Baton Rouge", "Lafayette", "New Orleans", "Shreveport"],
  MA: ["Boston", "Cambridge", "Lowell", "New Bedford", "Quincy", "Springfield", "Worcester"],
  MD: ["Baltimore", "Columbia", "Germantown", "Waldorf"],
  ME: ["Portland"],
  MI: ["Ann Arbor", "Detroit", "Grand Rapids", "Lansing", "Sterling Heights", "Warren"],
  MN: ["Bloomington", "Minneapolis", "Rochester", "St. Paul"],
  MO: ["Columbia", "Independence", "Kansas City", "Lee's Summit", "Springfield", "St. Louis"],
  MS: ["Gulfport", "Jackson"],
  MT: ["Billings", "Missoula"],
  NC: ["Cary", "Charlotte", "Concord", "Durham", "Fayetteville", "Greensboro", "High Point", "Raleigh", "Wilmington", "Winston-Salem"],
  ND: ["Fargo"],
  NE: ["Lincoln", "Omaha"],
  NH: ["Manchester", "Nashua"],
  NJ: ["Elizabeth", "Jersey City", "Newark", "Paterson", "Trenton"],
  NM: ["Albuquerque", "Las Cruces", "Rio Rancho"],
  NV: ["Enterprise", "Henderson", "Las Vegas", "North Las Vegas", "Paradise", "Reno", "Spring Valley", "Sunrise Manor"],
  // The five boroughs, not "New York City": offering both would leave an
  // applicant guessing whether the latter means Manhattan or anywhere in the
  // city, and split the answers unpredictably.
  NY: ["Albany", "Bronx", "Brooklyn", "Buffalo", "Manhattan", "New Rochelle", "Queens", "Rochester", "Staten Island", "Syracuse", "Yonkers"],
  OH: ["Akron", "Cincinnati", "Cleveland", "Columbus", "Dayton", "Parma", "Toledo"],
  OK: ["Broken Arrow", "Norman", "Oklahoma City", "Tulsa"],
  OR: ["Bend", "Eugene", "Gresham", "Hillsboro", "Portland", "Salem"],
  PA: ["Allentown", "Erie", "Philadelphia", "Pittsburgh", "Reading"],
  RI: ["Providence"],
  SC: ["Charleston", "Columbia", "North Charleston", "Rock Hill"],
  SD: ["Rapid City", "Sioux Falls"],
  TN: ["Chattanooga", "Clarksville", "Knoxville", "Memphis", "Murfreesboro", "Nashville"],
  TX: [
    "Abilene", "Amarillo", "Arlington", "Austin", "Beaumont", "Brownsville", "Carrollton", "College Station",
    "Conroe", "Corpus Christi", "Dallas", "Denton", "Edinburg", "El Paso", "Fort Worth", "Frisco", "Garland",
    "Grand Prairie", "Houston", "Irving", "Killeen", "Laredo", "League City", "Lewisville", "Lubbock",
    "McAllen", "McKinney", "Mesquite", "Midland", "New Braunfels", "Odessa", "Pasadena", "Pearland", "Plano",
    "Richardson", "Round Rock", "San Angelo", "San Antonio", "Sugar Land", "Tyler", "Waco", "Wichita Falls",
  ],
  UT: ["Provo", "Salt Lake City", "St. George", "West Jordan", "West Valley City"],
  VA: ["Alexandria", "Arlington", "Chesapeake", "Hampton", "Newport News", "Norfolk", "Richmond", "Virginia Beach"],
  VT: ["Burlington"],
  WA: ["Bellevue", "Everett", "Kent", "Renton", "Seattle", "Spokane", "Tacoma", "Vancouver"],
  WI: ["Green Bay", "Kenosha", "Madison", "Milwaukee"],
  WV: ["Charleston"],
  WY: ["Cheyenne"],
};

/**
 * Cities lifted to the top of their state's list, in the order given.
 *
 * A tier earns its place when the list is long enough to scan and the state's
 * dominant metros sit far down it. Texas is the clearest case: Houston is
 * nineteenth of forty-two alphabetically. Type-ahead helps only someone who
 * already knows what they are looking for, so it does not replace this.
 *
 * Short lists are left alone. Maryland has four cities; ordering four entries
 * is not a problem worth configuration.
 *
 * Chapter states lead their own tiers, and New Jersey and Connecticut cover
 * the NYC commuter belt, whose students join the New York chapter.
 */
const CITY_PRIORITY: Record<string, string[]> = {
  // Chapters
  NY: ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
  MA: ["Boston"],
  IL: ["Chicago"],
  CA: ["Los Angeles", "San Francisco", "San Diego", "San Jose"],
  MI: ["Detroit", "Ann Arbor"],

  // NYC commuter belt
  NJ: ["Jersey City", "Newark"],
  CT: ["Stamford", "Bridgeport"],

  // Long lists whose main metros would otherwise be buried
  TX: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
  FL: ["Miami", "Orlando", "Tampa", "Jacksonville"],
  CO: ["Denver", "Boulder", "Colorado Springs"],
  AZ: ["Phoenix", "Tucson", "Tempe"],
  NC: ["Charlotte", "Raleigh", "Durham"],
  VA: ["Arlington", "Richmond", "Virginia Beach"],
  WA: ["Seattle", "Tacoma"],
  NV: ["Las Vegas", "Reno"],
  OH: ["Columbus", "Cleveland", "Cincinnati"],
  PA: ["Philadelphia", "Pittsburgh"],
  GA: ["Atlanta"],
};

/**
 * Cities for a state: prioritised metros first, then everything else
 * alphabetically, always ending in the escape hatch.
 *
 * Sorted here rather than trusting the literal above, because hand-maintaining
 * alphabetical order across fifty arrays is a guarantee that one of them
 * eventually is not.
 */
export function citiesForState(abbr: string): string[] {
  const list = CITIES[abbr];
  if (!list) return [OTHER_CITY];

  // Only promote names that actually exist for the state, so a typo in the
  // priority table drops the entry rather than inventing a city.
  const promoted = (CITY_PRIORITY[abbr] ?? []).filter((c) => list.includes(c));
  const rest = list
    .filter((c) => !promoted.includes(c))
    .sort((a, b) => a.localeCompare(b, "en"));

  return [...promoted, ...rest, OTHER_CITY];
}

export const STATE_ABBRS: ReadonlyArray<string> = US_STATES.map((s) => s.abbr);
