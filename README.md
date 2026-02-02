# BandPulse

## Product Definition (MVP)

### Overview

BandPulse is a web application designed to help music fans effortlessly track live concerts and events from their favorite artists. By simply following an artist (for example, *Metallica*), users can stay informed about upcoming concerts, tour announcements, and changes in availability — without needing to constantly search across multiple platforms.

The core idea is simple: **BandPulse listens to the live music ecosystem and surfaces relevant events automatically**.

This document defines the MVP scope, focusing on event discovery and tracking. Ticket purchasing and resale are explicitly out of scope for the initial version.

---

### Problem Statement

Live music information is fragmented across ticketing platforms, promoters, venues, and artist websites. Fans often:

* Miss concert announcements or tour dates
* Discover shows too late (sold out or expensive)
* Don’t realize an artist is touring in their region or across Europe
* Have to manually re-check multiple sources over time

BandPulse solves this by centralizing concert discovery and continuously monitoring changes.

---

### Target Users

* Music fans who regularly attend concerts
* Fans who follow specific artists or bands
* Users who want passive notifications instead of active searching
* Casual listeners who may not follow tour announcements closely

---

### Core Value Proposition

> "Follow an artist once. Never miss their concerts again."

BandPulse provides:

* Automatic discovery of concerts and live events
* Ongoing monitoring of availability and changes
* Timely reminders and alerts when something relevant happens

---

### MVP Scope

#### In Scope

1. **Artist Tracking**

   * Users can search for and follow one or more artists
   * Artist profiles are based on external data sources

2. **Event Discovery**

   * Aggregation of concerts and live events for tracked artists
   * Events include:

     * Date
     * City and country
     * Venue name
     * Event status (announced / available / sold out, if provided)

3. **Geographic Awareness**

   * Detection of events by region (local, national, European)
   * Ability to surface tours even if the user was unaware they existed

4. **Periodic Monitoring**

   * The system periodically re-checks data sources
   * Detects new events or changes (new dates, newly announced tours)

5. **Notifications & Reminders**

   * Alerts when:

     * A new concert is announced for a followed artist
     * An artist announces a tour in a new region
     * A concert is approaching (date-based reminder)

---

#### Out of Scope (for MVP)

* Ticket purchasing or checkout
* Ticket resale or marketplace integration
* Price comparison across ticket vendors
* Seat selection or detailed availability per section
* Social features (sharing, following other users)

---

### Data Sources (High-Level)

BandPulse relies on third-party event and music data providers to retrieve concert information. Typical data includes:

* Artist identifiers
* Event metadata (date, venue, location)
* Event URLs or references
* Basic availability signals (when provided)

The MVP focuses on **read-only aggregation and monitoring**, not transactions.

---

### User Flow (MVP)

1. User searches for an artist
2. User follows the artist
3. BandPulse fetches all known upcoming events
4. System periodically checks for updates
5. User receives notifications when something changes or becomes relevant

---

### Success Metrics (MVP)

* Number of artists followed per user
* Number of detected events per artist
* Notification open rate
* Retention: users returning to check tracked artists

---

### Product Principles

* Passive by default: minimal user effort after setup
* Aggregated, not fragmented
* Artist-centric, not platform-centric
* Trustworthy and up-to-date information

---

### Future Considerations (Post-MVP)

* Ticketing integrations
* Price tracking and alerts
* Venue-based discovery
* Personalized recommendations based on listening habits
* Calendar integrations (Google / Apple)

---

BandPulse aims to become the *live music radar* for fans — always on, quietly watching the scene, and tapping you on the shoulder when something matters.

---

## Development Setup

### Prerequisites

- Node.js 20+ LTS
- Docker and Docker Compose
- npm

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd band-pulse
   ```

2. **Start MongoDB**
   ```bash
   docker compose up -d
   ```

3. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
   Backend will run at http://localhost:3001

4. **Setup Frontend** (in a new terminal)
   ```bash
   cd frontend
   cp .env.local.example .env.local
   npm install
   npm run dev
   ```
   Frontend will run at http://localhost:3000

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled JavaScript

**Frontend:**
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
band-pulse/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Environment & database config
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utilities (logger, etc.)
│   └── package.json
├── frontend/               # Next.js application
│   ├── app/               # App Router pages
│   ├── lib/               # Utility functions
│   ├── types/             # TypeScript definitions
│   └── package.json
├── scripts/               # Database initialization scripts
├── docs/                  # Implementation phase documentation
└── docker-compose.yml     # MongoDB container
```

### Documentation

See [docs/README.md](docs/README.md) for detailed implementation phases.
