-- AirportIQ database schema
-- Apply via Supabase SQL editor or `psql` against the Supabase Postgres URL.

-- Users (handled by Supabase Auth, this extends it)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  has_tsa_precheck BOOLEAN DEFAULT false,
  preferred_notification TEXT DEFAULT 'email', -- email | push | both
  home_airport TEXT, -- IATA code e.g. 'DEN'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Saved flights / tracked trips
CREATE TABLE saved_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  flight_iata TEXT NOT NULL,        -- e.g. 'UA245'
  flight_date DATE NOT NULL,
  departure_airport TEXT NOT NULL,  -- IATA
  arrival_airport TEXT NOT NULL,
  alert_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crowdsourced TSA wait time reports
CREATE TABLE tsa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_iata TEXT NOT NULL,
  terminal TEXT,
  checkpoint TEXT,
  wait_minutes INTEGER NOT NULL,
  has_precheck BOOLEAN DEFAULT false,
  reported_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- Alert log (for deduplication + audit)
CREATE TABLE alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  trip_id UUID REFERENCES saved_trips(id),
  alert_type TEXT NOT NULL,  -- 'delay' | 'cancel' | 'gate_change' | 'tsa_spike' | 'leave_now'
  sent_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB
);
