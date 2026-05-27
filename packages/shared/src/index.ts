export * from "./airports";

export type FlightStatus =
  | "on_time"
  | "delayed"
  | "canceled"
  | "boarding"
  | "scheduled";

export type RiskLevel = "Low" | "Medium" | "High";

export type AlertType =
  | "delay"
  | "cancel"
  | "gate_change"
  | "tsa_spike"
  | "leave_now";

export type NotificationPreference = "email" | "push" | "both";

export type CrowdLevel = "Light" | "Moderate" | "Busy" | "Very Busy";

export interface Airport {
  iata: string;
  name: string;
  city: string;
  terminalCount?: number;
}

export interface Flight {
  flightIata: string;
  flightDate: string;
  departureAirport: string;
  arrivalAirport: string;
  scheduledDeparture: string;
  estimatedDeparture?: string;
  gate?: string;
  terminal?: string;
  status: FlightStatus;
  airline?: string;
}

export interface RiskScore {
  score: number;
  label: RiskLevel;
  reason: string;
}

export interface TsaReport {
  airportIata: string;
  terminal?: string;
  checkpoint?: string;
  waitMinutes: number;
  hasPrecheck: boolean;
  reportedAt: string;
}

export interface ArrivalPlan {
  recommendedArrival: string;
  leaveHomeBy?: string;
  breakdown: {
    boardingBuffer: number;
    tsaWaitMinutes: number;
    gateWalkMinutes: number;
    transportBuffer: number;
    safetyBuffer: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  hasTsaPrecheck: boolean;
  preferredNotification: NotificationPreference;
  homeAirport?: string;
}

export interface SavedTrip {
  id: string;
  userId: string;
  flightIata: string;
  flightDate: string;
  departureAirport: string;
  arrivalAirport: string;
  alertPreferences: Record<string, unknown>;
}
