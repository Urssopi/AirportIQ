// Re-export the shared list so web + mobile stay in sync.
export {
  AIRPORTS,
  TOP_10_IATA,
  findAirport,
  searchAirports,
} from "@airportiq/shared";
export type { AirportRecord as Airport } from "@airportiq/shared";
