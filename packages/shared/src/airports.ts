export type AirportRecord = { iata: string; name: string; city: string };

export const AIRPORTS: AirportRecord[] = [
  { iata: "ATL", name: "Hartsfield-Jackson", city: "Atlanta" },
  { iata: "LAX", name: "Los Angeles International", city: "Los Angeles" },
  { iata: "ORD", name: "O'Hare International", city: "Chicago" },
  { iata: "DFW", name: "Dallas/Fort Worth", city: "Dallas" },
  { iata: "DEN", name: "Denver International", city: "Denver" },
  { iata: "JFK", name: "John F. Kennedy", city: "New York" },
  { iata: "SFO", name: "San Francisco International", city: "San Francisco" },
  { iata: "SEA", name: "Seattle-Tacoma", city: "Seattle" },
  { iata: "LAS", name: "Harry Reid International", city: "Las Vegas" },
  { iata: "MCO", name: "Orlando International", city: "Orlando" },
  { iata: "EWR", name: "Newark Liberty", city: "Newark" },
  { iata: "PHX", name: "Phoenix Sky Harbor", city: "Phoenix" },
  { iata: "IAH", name: "George Bush Intercontinental", city: "Houston" },
  { iata: "MIA", name: "Miami International", city: "Miami" },
  { iata: "BOS", name: "Logan International", city: "Boston" },
  { iata: "MSP", name: "Minneapolis-St. Paul", city: "Minneapolis" },
  { iata: "DTW", name: "Detroit Metropolitan", city: "Detroit" },
  { iata: "PHL", name: "Philadelphia International", city: "Philadelphia" },
  { iata: "LGA", name: "LaGuardia", city: "New York" },
  { iata: "FLL", name: "Fort Lauderdale-Hollywood", city: "Fort Lauderdale" },
  { iata: "BWI", name: "Baltimore/Washington", city: "Baltimore" },
  { iata: "DCA", name: "Reagan National", city: "Washington DC" },
  { iata: "IAD", name: "Dulles International", city: "Washington DC" },
  { iata: "MDW", name: "Chicago Midway", city: "Chicago" },
  { iata: "SLC", name: "Salt Lake City", city: "Salt Lake City" },
  { iata: "PDX", name: "Portland International", city: "Portland" },
  { iata: "SAN", name: "San Diego International", city: "San Diego" },
  { iata: "DAL", name: "Dallas Love Field", city: "Dallas" },
  { iata: "HOU", name: "William P. Hobby", city: "Houston" },
  { iata: "OAK", name: "Oakland International", city: "Oakland" },
];

export const TOP_10_IATA = AIRPORTS.slice(0, 10).map((a) => a.iata);

export function findAirport(iata: string): AirportRecord | undefined {
  return AIRPORTS.find((a) => a.iata === iata.toUpperCase());
}

export function searchAirports(query: string, limit = 8): AirportRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, limit);
  return AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q),
  ).slice(0, limit);
}
