# AirportIQ — Product Requirements Document
### Optimized for Claude Code (Vibe Coding)
**Version:** 1.0 | **Last Updated:** May 2026

---

## How to Use This PRD with Claude Code

Each phase below is a self-contained Claude Code session. Copy the "Claude Code Prompt" at the start of each phase and paste it as your first message. Claude Code works best when you give it the full context of one phase at a time — don't try to build everything in a single session.

**Before any session:** open your project folder in terminal, run `claude`, and paste the phase prompt.

---

## 1. Product Overview

**AirportIQ** is a real-time airport intelligence platform for travelers. It combines live flight data, security checkpoint wait times, smart arrival recommendations, and proactive email alerts into a single sleek experience — available on web and mobile.

### The Core Value Proposition
> "Tell me my flight, and I'll tell you exactly when to leave, how long security will take, and whether anything's gone wrong — before you even get in the car."

### Target Users
- Frequent domestic US travelers
- People flying out of major US airports (top 30 by traffic)
- Travelers who want proactive updates rather than checking manually

---

## 2. Tech Stack (Decided)

These are fixed decisions. Do not deviate.

| Layer | Technology | Why |
|---|---|---|
| Web Frontend | Next.js 14 (App Router) + Tailwind CSS | SSR, easy deployment, great DX |
| Mobile | React Native + Expo | Code-sharing with web, easy to build |
| Shared UI Components | React Native Web or NativeWind | Single component library for both |
| Backend / API | Python FastAPI | Lightweight, async, easy to learn |
| Database | PostgreSQL (via Supabase) | Free tier, auth built-in, easy setup |
| Cache | Redis (via Upstash) | Free tier, caches live flight data |
| Flight Data | AeroDataBox via RapidAPI | Real-time flights, FIDS, delay stats |
| Airport Delays | FAA ASWS (free, no key needed) | Official US airport delay info |
| TSA Wait Times | MyTSA API + crowdsourced fallback | Historical + user-submitted data |
| Email | Resend (free tier: 3,000/mo) | Simple API, great DX for devs |
| Auth | Supabase Auth | Built-in, supports email/OAuth |
| Deployment (Web) | Vercel | Free tier, auto-deploys from GitHub |
| Deployment (API) | Railway | Free tier, easy FastAPI deploy |
| Deployment (Mobile) | Expo Go (dev) → EAS Build (prod) | Easiest mobile dev experience |

### API Signup Checklist (Do This First)
- [ ] Create account at [rapidapi.com](https://rapidapi.com) → subscribe to **AeroDataBox** (free tier)
- [ ] Create project at [supabase.com](https://supabase.com) → copy `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] Create account at [upstash.com](https://upstash.com) → create Redis DB → copy `UPSTASH_REDIS_REST_URL` and token
- [ ] Create account at [resend.com](https://resend.com) → copy `RESEND_API_KEY`
- [ ] Verify a sending domain in Resend (or use their sandbox domain for dev)

---

## 3. Repository Structure

```
airportiq/
├── apps/
│   ├── web/                  # Next.js app
│   │   ├── app/
│   │   │   ├── page.tsx          # Home / airport selector
│   │   │   ├── board/[airport]/  # Live departure board
│   │   │   ├── flight/[id]/      # Flight detail dashboard
│   │   │   ├── alerts/           # Alert management
│   │   │   └── account/          # User account
│   │   ├── components/
│   │   └── lib/
│   └── mobile/               # Expo React Native app
│       ├── app/
│       ├── components/
│       └── lib/
├── packages/
│   └── shared/               # Shared types, utils, API client
├── backend/                  # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── flights.py
│   │   ├── airports.py
│   │   ├── tsa.py
│   │   ├── alerts.py
│   │   └── users.py
│   ├── services/
│   │   ├── aerodatabox.py
│   │   ├── faa.py
│   │   ├── tsa.py
│   │   ├── risk_scorer.py
│   │   ├── arrival_calculator.py
│   │   └── email_service.py
│   ├── models/
│   └── database/
│       └── schema.sql
└── .env.example
```

---

## 4. Environment Variables

Create a `.env` file at root. Never commit this.

```env
# AeroDataBox
AERODATABOX_API_KEY=your_key_here

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Resend
RESEND_API_KEY=re_xxxx

# App
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

---

## 5. Database Schema

```sql
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
```

---

## 6. Feature Specifications

### Feature 1: Airport Selector (Home Page)
**What it does:** Entry point. User picks their airport from a searchable list.

**UI:**
- Full-screen landing with animated airport board aesthetic (dark background, amber/white text)
- Search input with autocomplete for US airports (name + IATA code)
- Quick-select for top 10 busiest US airports
- Shows current crowd level badge per airport (Light / Moderate / Busy / Very Busy) if data exists

**Data needed:**
- Static list of top 30 US airports (IATA, name, city, terminal count) — hardcode this
- FAA delay status (fetched on load)

---

### Feature 2: Live Departure Board
**What it does:** Real-time flight board for a selected airport, styled like an airport FIDS display.

**Route:** `/board/[airport]` (web) | `Board` screen (mobile)

**UI — The Board:**
- Dark background, monospace or airport-style font
- Flip/slide animation when flight data updates (CSS animation)
- Columns: Departure Time | Flight | Airline Logo | Destination | Terminal | Gate | Status
- Color-coded status: Green = On Time, Yellow = Delayed, Red = Canceled, Blue = Boarding, Gray = Scheduled
- Auto-refreshes every 60 seconds via polling (show countdown timer)
- Top banner: Airport name + FAA delay status + current crowd level

**Filters (sidebar or top bar):**
- Airline dropdown
- Departure window (next 2h / next 4h / all day)
- Status (Delayed only / Canceled only / Boarding now)
- Terminal selector

**Data source:** AeroDataBox `/flights/airports/iata/{airportCode}` endpoint

---

### Feature 3: Flight Detail Dashboard
**What it does:** Single-flight deep-dive page. The core user value screen.

**Route:** `/flight/[flightIata]/[date]` | `FlightDetail` screen

**Sections (in order):**

1. **Status Header**
   - Flight number + airline logo
   - Route: DEN → BOS
   - Status badge (On Time / Delayed X min / Canceled)
   - Risk Score (Low / Medium / High) with reason

2. **Timeline Card**
   - Scheduled departure + estimated departure
   - Boarding start (estimated = departure − 35min domestic, − 50min intl)
   - Gate + terminal
   - Arrival airport + estimated landing

3. **Your Arrival Plan**
   - Recommended arrival time (calculated — see Feature 7)
   - TSA wait time (current + predicted)
   - Security type (PreCheck or standard based on user profile)
   - Walking time to gate (estimated from stored data)
   - "Leave by" time if user has entered home location

4. **Airport Conditions**
   - FAA delay status for this airport
   - Crowd level
   - Weather summary at departure airport (use a free weather API like Open-Meteo)
   - Weather summary at arrival airport

5. **Inbound Aircraft**
   - Where the plane is coming from
   - Inbound flight status + ETA
   - "Aircraft on ground" confirmation if available

6. **Delay Explanation** (if delayed)
   - Plain-English reason pulled from FAA/AeroDataBox data
   - Categories: Weather / Late Inbound Aircraft / Crew / Maintenance / ATC / Airport

7. **Alternative Flights** (if canceled or delayed > 2 hours)
   - Other flights same route same day
   - Seats available (if API provides)

---

### Feature 4: TSA Wait Times
**What it does:** Shows current and predicted security wait times per airport/terminal.

**Data strategy (in priority order):**
1. MyTSA historical model (day of week + time of day averages)
2. Crowdsourced reports submitted in-app (last 30 minutes)
3. Fallback: show "No recent data — estimate based on historical average"

**UI:**
- Wait time displayed as a number + confidence badge
- Trend arrow (↑ Getting busier / → Stable / ↓ Clearing up)
- Timeline chart: predicted wait times for next 4 hours
- "Report your wait" CTA — user submits: entered line → cleared security = actual wait

**Confidence badge logic:**
- High: crowdsourced report < 15 min old OR historical data for same time ± 30 min on same day type
- Medium: report 15–45 min old
- Low: no recent report, only historical

---

### Feature 5: Smart Arrival Calculator
**What it does:** Computes "when should I arrive" and "when should I leave home."

**Inputs:**
- Flight departure time
- Current TSA wait (Feature 4)
- User's TSA PreCheck status (from profile)
- Domestic vs. international flight
- Gate walking time (stored per airport, estimated 10 min if unknown)
- Buffer: 15 min domestic, 20 min international
- Parking/transport type (if user selects)

**Formula:**
```
recommended_arrival = departure_time
  - boarding_buffer (35 min domestic / 50 min intl)
  - tsa_wait_minutes
  - gate_walk_minutes
  - transport_buffer (user-selected: 0/5/10/15/20 min)
  - safety_buffer (15 min)

leave_home_time = recommended_arrival - estimated_drive_time
```

**Output displayed as:**
> "Arrive at DEN by **2:35 PM**. Leave home by **1:50 PM** if you're 36 min away."

---

### Feature 6: Flight Risk Score
**What it does:** Calculates a simple 3-level risk indicator per flight.

**Scoring logic:**

| Signal | Points |
|---|---|
| Inbound aircraft delayed > 30 min | +3 |
| Inbound aircraft delayed 10–30 min | +2 |
| FAA ground stop active at airport | +3 |
| FAA delay program active | +2 |
| Airport crowd = Very Busy | +1 |
| Weather advisory at departure | +2 |
| Flight previously pushed back today | +1 |

**Score → Label:**
- 0–1: **Low Risk** (green)
- 2–4: **Medium Risk** (yellow)
- 5+: **High Risk** (red)

**Always show reason string:**
> "Medium Risk — Inbound aircraft is delayed 22 minutes from ORD."

---

### Feature 7: User Accounts & Saved Trips
**What it does:** Lets users save flights, set preferences, and receive alerts.

**Auth:** Supabase Auth — email/password + Google OAuth

**Account settings:**
- TSA PreCheck: Yes / No
- Home airport
- Default transport mode (drive / rideshare / transit)
- Average drive time to airport
- Notification preferences

**Saved trips:**
- Search for a flight → "Track This Flight" button
- Shows in "My Trips" tab
- Triggers background monitoring for that flight

---

### Feature 8: Email Alert System
**What it does:** Proactive email notifications for tracked flights.

**Alert types:**

| Alert | Trigger Condition |
|---|---|
| Flight Delayed | Status changes to delayed |
| Delay Extended | Delay time increases by ≥ 15 min |
| Flight Canceled | Status = canceled |
| Gate Changed | Gate field changes |
| Boarding Soon | 45 min before estimated boarding |
| TSA Spike | TSA wait increases > 15 min above prediction |
| Leave Now | Calculated leave time is within 30 min |
| Airport-Wide Delay | FAA issues a ground delay program |

**Email format (Resend + React Email):**
- Clean, minimal HTML email
- Flight summary at top
- Changed field highlighted (e.g., new gate bold in orange)
- Recommended arrival time recalculated
- "View full details" button linking to flight page

**Deduplication:** Check `alert_log` before sending — don't send same alert_type for same trip within 30 minutes.

---

### Feature 9: Crowd Level Score
**What it does:** Airport-level busyness indicator.

**Formula:**
```
crowd_score = (
  (tsa_wait / tsa_max_for_airport) * 0.35 +
  (departures_next_2h / avg_departures_next_2h) * 0.35 +
  (faa_delay_active ? 0.2 : 0) +
  (user_reports_stress_level * 0.1)
)
```

**Output levels:**
- 0–0.3: Light 🟢
- 0.3–0.55: Moderate 🟡
- 0.55–0.75: Busy 🟠
- 0.75+: Very Busy 🔴

---

### Feature 10: Crowdsourced TSA Reports
**What it does:** Let users submit real wait times to improve data quality.

**Flow:**
1. User taps "Report Wait Time" on TSA screen
2. Enters: airport, terminal, checkpoint (optional)
3. Taps "I just joined the line"
4. When through, taps "I just cleared security"
5. App calculates actual wait, stores in `tsa_reports` with timestamp
6. Shows in aggregate: "14 reports in last 30 min — avg 23 min"

**Validation:**
- Only accept if device location (web: IP geolocation, mobile: GPS) is within 5 miles of selected airport
- Cap at 1 report per user per 2-hour window

---

## 7. API Reference

### AeroDataBox (via RapidAPI)
```
GET /flights/airports/iata/{code}?offsetMinutes=-120&durationMinutes=720
→ Returns departure board for airport, last 2h + next 10h

GET /flights/{flightNumber}/{date}
→ Returns single flight status, inbound aircraft, delays

GET /airports/iata/{code}
→ Airport metadata

Host: aerodatabox.p.rapidapi.com
Headers: X-RapidAPI-Key, X-RapidAPI-Host
Cache: Redis, TTL 60 seconds for board / 30 seconds for individual flight
```

### FAA Airport Status (free, no key)
```
GET https://nasstatus.faa.gov/api/airport-status-information
→ Returns delay programs, ground stops, closures for all US airports

Cache: Redis, TTL 120 seconds
```

### MyTSA (historical / crowdsourced)
```
GET https://www.tsawaittimes.com/api/airports/{code}
→ Historical wait estimates by day/hour

Note: Use as baseline; supplement with in-app crowdsourced data
```

### Open-Meteo (weather, free, no key)
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current_weather=true
  &hourly=precipitation_probability
→ Current + hourly weather for departure/arrival airports

Cache: Redis, TTL 600 seconds
```

---

## 8. Backend Endpoints

### FastAPI Routes

```
# Airports
GET  /api/airports                    → list of supported airports
GET  /api/airports/{iata}/status      → FAA status + crowd level

# Flights
GET  /api/flights/{iata}/board        → departure board
GET  /api/flights/{flightNum}/{date}  → single flight detail
GET  /api/flights/{flightNum}/{date}/risk  → risk score

# TSA
GET  /api/tsa/{iata}                  → current + predicted wait
POST /api/tsa/{iata}/report           → submit crowdsourced report

# Arrival Calculator
POST /api/plan/arrival                → body: {flightId, hasTSAPreCheck, transportMode, driveMinutes}

# Alerts
GET  /api/alerts/user/{userId}        → user's alert preferences
PUT  /api/alerts/trip/{tripId}        → update alert preferences
POST /api/alerts/test                 → send test email

# User
GET  /api/users/me                    → profile
PUT  /api/users/me                    → update preferences

# Background Jobs (internal)
POST /api/jobs/refresh-flights        → called by cron every 60 sec
POST /api/jobs/check-alerts           → called by cron every 60 sec
```

---

## 9. Development Phases & Claude Code Prompts

---

### Phase 1: Project Scaffolding + Database

**Goal:** Monorepo set up, backend running, database connected.

**Claude Code Prompt:**
```
I'm building AirportIQ, a real-time airport tracking app. Set up a monorepo with:
- apps/web: Next.js 14 with App Router and Tailwind CSS
- apps/mobile: Expo (React Native) with NativeWind
- backend: Python FastAPI
- packages/shared: shared TypeScript types

Create the folder structure, install dependencies, and add a .env.example with these variables:
[paste env section from PRD]

In the backend, connect to Supabase using supabase-py and run this schema:
[paste database schema from PRD]

Add a /health endpoint to FastAPI that returns {"status": "ok"}.
Confirm the web app runs on localhost:3000 and backend on localhost:8000.
```

---

### Phase 2: Flight Data + Backend API

**Goal:** AeroDataBox integration, core API endpoints, Redis caching.

**Claude Code Prompt:**
```
AirportIQ backend Phase 2. I have FastAPI running and connected to Supabase.

Add these backend services:
1. aerodatabox.py — wrapper for AeroDataBox API via RapidAPI (use AERODATABOX_API_KEY from .env)
   - get_airport_board(iata, hours_window=12)
   - get_flight_detail(flight_iata, date)
2. faa.py — fetch FAA ASWS delay data from https://nasstatus.faa.gov/api/airport-status-information
3. Cache all responses in Upstash Redis with TTLs from PRD

Add these FastAPI routes (from PRD API Reference):
- GET /api/airports/{iata}/status
- GET /api/flights/{iata}/board
- GET /api/flights/{flightNum}/{date}

Return clean, typed Pydantic response models. Handle errors gracefully (return 503 with message if external API fails).
```

---

### Phase 3: Risk Score + Arrival Calculator

**Goal:** The two "smart" backend features.

**Claude Code Prompt:**
```
AirportIQ backend Phase 3. Add two services:

1. risk_scorer.py — implements the risk scoring logic from this spec:
[paste Feature 6 scoring table]
Return {score: int, label: "Low"|"Medium"|"High", reason: string}

2. arrival_calculator.py — implements the arrival formula:
[paste Feature 5 formula]
Inputs come from POST /api/plan/arrival body
Return {recommended_arrival: datetime, leave_home_by: datetime, breakdown: object}

Add the routes:
- GET /api/flights/{flightNum}/{date}/risk
- POST /api/plan/arrival

Write unit tests for both calculators using pytest. Test edge cases: PreCheck vs no PreCheck, international vs domestic, delayed flights.
```

---

### Phase 4: TSA + Crowdsourced Reports

**Goal:** TSA data pipeline and report submission.

**Claude Code Prompt:**
```
AirportIQ backend Phase 4. Build the TSA module.

1. tsa.py service:
   - fetch_historical(airport_iata, hour, day_of_week) from MyTSA API
   - get_recent_reports(airport_iata, minutes=30) from Supabase tsa_reports table
   - calculate_aggregate(historical_wait, recent_reports) → weighted average with confidence level

2. Routes:
   - GET /api/tsa/{iata} → returns {wait_minutes, confidence, trend, last_updated, report_count}
   - POST /api/tsa/{iata}/report → validates and stores a user report

Crowdsourced validation rules:
[paste from Feature 10 validation section]

Confidence badge logic:
[paste from Feature 4 confidence section]
```

---

### Phase 5: Auth + User Accounts + Saved Trips

**Goal:** Supabase Auth integration, user profiles, trip saving.

**Claude Code Prompt:**
```
AirportIQ Phase 5 — Auth and user accounts.

Backend:
- Add Supabase JWT verification middleware to FastAPI
- Protect all /api/users/* and /api/alerts/* routes
- Add routes: GET/PUT /api/users/me, POST /api/trips, GET /api/trips

Web frontend (Next.js):
- Add Supabase Auth with email/password and Google OAuth
- Login page at /login
- Redirect to /account after auth
- Account page with: TSA PreCheck toggle, home airport selector, notification preferences, saved trips list
- "Track This Flight" button on flight detail page → saves to Supabase, requires login

Mobile (Expo):
- Same auth flow using Supabase JS client
- Account tab with same settings
```

---

### Phase 6: Email Alerts

**Goal:** Resend integration, background monitoring jobs, alert emails.

**Claude Code Prompt:**
```
AirportIQ Phase 6 — Email alerts.

1. email_service.py using Resend Python SDK:
   - send_delay_alert(user, trip, old_time, new_time, new_arrival_rec)
   - send_cancellation_alert(user, trip, alternatives)
   - send_gate_change_alert(user, trip, old_gate, new_gate)
   - send_boarding_soon_alert(user, trip, boarding_time, tsa_wait)
   - send_leave_now_alert(user, trip, leave_by_time)

Use clean HTML email templates (inline CSS). Include: flight summary header, changed field highlighted in amber, recommended arrival time, link to /flight/{id} page.

2. Background job: check_alerts.py
   - Runs every 60 seconds (add as FastAPI startup background task)
   - For each active saved trip:
     a. Fetch current flight status
     b. Compare against last known status (store in Redis)
     c. Trigger appropriate email if condition met
     d. Check alert_log to prevent duplicate sends within 30 min

3. Add POST /api/alerts/test endpoint for sending a test email.
```

---

### Phase 7: Web Frontend — Board + Flight Detail

**Goal:** The main web UI.

**Claude Code Prompt:**
```
AirportIQ Phase 7 — Web frontend.

Design direction: Dark, sleek, airport aesthetic. Think Heathrow departure boards — dark background, amber/white text, monospace display font for flight data, clean sans-serif for UI chrome. Fluid animations when rows update. No purple gradients. No generic SaaS look.

Build these Next.js pages/components:

1. Home page (/) — Airport search
   - Full-screen dark landing
   - Search input with autocomplete (top 30 US airports, hardcoded list)
   - Airport crowd level badge next to each result
   - Recent/favorite airports for logged-in users

2. Departure board (/board/[airport])
   - Flight table with columns: Time | Flight | Airline | Destination | Gate | Status
   - Animate row changes (flip transition on status/time cells)
   - Filter sidebar
   - Auto-refresh every 60s with visible countdown
   - FAA status banner at top

3. Flight detail page (/flight/[id])
   - All sections from Feature 3 spec
   - Arrival plan card (from Feature 5 output)
   - Risk score badge (from Feature 6)
   - "Track This Flight" button

All data fetched from FastAPI backend at NEXT_PUBLIC_API_URL.
Use SWR or React Query for polling/revalidation.
```

---

### Phase 8: Mobile Frontend

**Goal:** React Native / Expo app with feature parity.

**Claude Code Prompt:**
```
AirportIQ Phase 8 — Mobile app (Expo / React Native).

Build the Expo app with NativeWind styling. Same dark airport aesthetic as web. Screens:

1. Home — airport search with autocomplete (same API)
2. Board — departure board as a FlatList with status color coding, pull-to-refresh
3. FlightDetail — scrollable screen with all sections from Phase 7 spec
4. MyTrips — list of saved/tracked flights
5. Account — settings screen

Use Expo Router for navigation (tab bar with: Home, Board, My Trips, Account).
Use same FastAPI backend endpoints as web.
Push notifications via Expo Notifications (add alongside email alerts).
Handle loading + error states on every screen.
```

---

### Phase 9: Polish, Testing, Deployment

**Goal:** Launch-ready build.

**Claude Code Prompt:**
```
AirportIQ Phase 9 — Polish and deploy.

1. Error handling: add error boundaries on web, error screens on mobile. All API failures show a user-friendly message, not a crash.

2. Loading states: add skeletons on the departure board and flight detail page. No blank screens while data loads.

3. Accessibility: add aria-labels to all interactive web elements, ensure color contrast meets WCAG AA.

4. Deploy:
   - Web (Next.js) → Vercel. Add all .env variables in Vercel dashboard.
   - Backend (FastAPI) → Railway. Add all .env variables in Railway dashboard.
   - Add a CRON job in Railway to hit POST /api/jobs/check-alerts every 60 seconds.
   - Mobile → Expo EAS Build for TestFlight / internal distribution.

5. Seed data: add a script that inserts 5 demo airports and fake flight rows into Supabase so the app looks alive without real API calls (for demos / offline testing).
```

---

## 10. Supported Airports (v1)

Hardcode these in the frontend for the airport selector:

| IATA | Name | City |
|---|---|---|
| ATL | Hartsfield-Jackson | Atlanta |
| LAX | Los Angeles International | Los Angeles |
| ORD | O'Hare International | Chicago |
| DFW | Dallas/Fort Worth | Dallas |
| DEN | Denver International | Denver |
| JFK | John F. Kennedy | New York |
| SFO | San Francisco International | San Francisco |
| SEA | Seattle-Tacoma | Seattle |
| LAS | Harry Reid International | Las Vegas |
| MCO | Orlando International | Orlando |
| EWR | Newark Liberty | Newark |
| PHX | Phoenix Sky Harbor | Phoenix |
| IAH | George Bush Intercontinental | Houston |
| MIA | Miami International | Miami |
| BOS | Logan International | Boston |
| MSP | Minneapolis-St. Paul | Minneapolis |
| DTW | Detroit Metropolitan | Detroit |
| PHL | Philadelphia International | Philadelphia |
| LGA | LaGuardia | New York |
| FLL | Fort Lauderdale-Hollywood | Fort Lauderdale |
| BWI | Baltimore/Washington | Baltimore |
| DCA | Reagan National | Washington DC |
| IAD | Dulles International | Washington DC |
| MDW | Chicago Midway | Chicago |
| SLC | Salt Lake City | Salt Lake City |
| PDX | Portland International | Portland |
| SAN | San Diego International | San Diego |
| DAL | Dallas Love Field | Dallas |
| HOU | William P. Hobby | Houston |
| OAK | Oakland International | Oakland |

---

## 11. Design System

**Colors:**
```css
--color-bg: #0a0a0f
--color-surface: #13131a
--color-border: #1e1e2e
--color-text-primary: #f0f0f5
--color-text-secondary: #8888aa
--color-amber: #f5a623        /* departure boards, On Time */
--color-green: #22c55e        /* on time status */
--color-yellow: #eab308       /* delayed status */
--color-red: #ef4444          /* canceled status */
--color-blue: #3b82f6         /* boarding status */
--color-risk-low: #22c55e
--color-risk-medium: #eab308
--color-risk-high: #ef4444
```

**Fonts:**
- Display / board data: `Roboto Mono` or `JetBrains Mono`
- UI chrome: `DM Sans` or `Outfit`

**Animation:**
- Board row update: 0.3s flip transition on changed cells
- Status badge pulse: subtle glow animation on High Risk
- Skeleton loaders on all data cards

---

## 12. Resume / Portfolio Notes

When presenting this project, highlight:

- **Real-time systems**: WebSocket/polling architecture, Redis caching, background jobs
- **API integration**: AeroDataBox, FAA ASWS, MyTSA — handling rate limits, errors, stale data
- **Full-stack**: FastAPI + PostgreSQL backend, Next.js web, React Native mobile — three surfaces from one codebase
- **Smart features**: Arrival calculator, risk scoring, crowdsourced data aggregation
- **Production thinking**: Auth, email notifications, deduplication, confidence indicators, graceful degradation

**Demo script for interviews:**
1. Open departure board for DEN
2. Click a flight → show flight detail + arrival plan
3. Click "Track this flight" → save it
4. Show settings (PreCheck toggle changes arrival time in real-time)
5. Trigger a test email alert

---

*End of AirportIQ PRD v1.0*