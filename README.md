# MySpotify

A personal Spotify companion that goes beyond the official app — real-time playback, deep listening history, and a full analytics suite that visualises your music taste with statistical analysis.

---

## Screenshots

> _Add screenshots here after first deployment._

| Dashboard | Mood Trends | Taste DNA |
|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Mood Trends](docs/screenshots/mood-trends.png) | ![Taste DNA](docs/screenshots/taste-dna.png) |

---

## Live Demo

[**→ myspotify.vercel.app**](https://myspotify.vercel.app) _(placeholder — update after deploy)_

> **Note**: The app is in Spotify Development Mode. To log in, your Spotify email must be added to the allowlist — see [DEPLOYMENT.md](DEPLOYMENT.md#2-spotify-developer-app).

---

## Tech Stack

**Client**
- React 18 + TypeScript
- React Router v6
- Recharts (analytics visualisations)
- Tailwind CSS v3 (purple/violet dark theme)
- Vitest + React Testing Library

**Server**
- Express + TypeScript
- Mongoose + MongoDB Atlas
- Spotify Web API (OAuth 2.0, automatic token refresh)
- express-session + MongoStore
- Jest + Supertest

**Infrastructure**
- Client → Vercel
- Server → Render
- Database → MongoDB Atlas (free tier)
- CI/CD → GitHub Actions

---

## Features

### Core
- **Spotify OAuth login** — secure session-based auth, tokens refreshed automatically
- **Dashboard** — recently played, top artists, top tracks with mood badges
- **Audio preview playback** — full player bar with queue, seek, volume, and skip controls
- **Search** — debounced search across tracks, artists, and albums
- **Library** — browse your saved playlists
- **Detail pages** — track, artist, and album views with full metadata

### Analytics — My Stats
- **Mood Trends** — line chart of valence, energy, and danceability over your last 50 plays; raw vs. smoothed (moving average) toggle; linear regression trend line with R² badge; energy vs. valence scatter plot coloured by danceability
- **Listening Patterns** — 7×24 activity heatmap with anomaly detection (z-score > 2 pulses in accent-pink); bar charts of tracks by day of week and hour of day; peak bar highlighted automatically
- **Taste DNA** — k-means clustering (k=4) on your top 50 tracks, auto-labelled clusters (Party Anthems, Intense & Dark, Feel-Good Chill, Late Night Melancholy); donut chart of cluster split; per-cluster album art scroll rows; personalised one-liner summary

### Performance
- **MongoDB caching** — top tracks/artists cached 1 hour, recently played 15 minutes, audio features permanently (they never change)
- **Automatic token refresh** — Spotify 401 responses trigger a transparent refresh-and-retry

---

## Local Development

### Prerequisites
- Node.js 20+
- MongoDB running locally (`mongod`) **or** a MongoDB Atlas free cluster
- A [Spotify Developer App](https://developer.spotify.com/dashboard) with `https://localhost:5000/api/auth/callback` as a redirect URI (Spotify requires HTTPS even for localhost) and your account email on the allowlist

### 1. Clone and install

```bash
git clone https://github.com/your-username/myspotify.git
cd myspotify

# Client
npm install --prefix client --legacy-peer-deps

# Server
npm install --prefix server
```

### 2. Configure environment variables

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/myspotify
SPOTIFY_CLIENT_ID=<your_client_id>
SPOTIFY_CLIENT_SECRET=<your_client_secret>
SPOTIFY_REDIRECT_URI=https://localhost:5000/api/auth/callback
SESSION_SECRET=dev-secret-change-in-production
FRONTEND_URL=http://localhost:5173
```

### 3. Start development servers

```bash
# Terminal 1 — API server (hot-reload via ts-node-dev)
npm run dev --prefix server

# Terminal 2 — Vite dev server with HMR
npm run dev --prefix client
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Run tests

```bash
# Server — Jest + Supertest (33 tests, no DB connection required)
npm test --prefix server

# Client — Vitest + React Testing Library (45 tests)
npm test --prefix client

# Stats utility unit tests only
cd client && npx vitest run src/utils/stats.test.ts
```

---

## Project Structure

```
myspotify/
├── client/                     # Vite + React frontend
│   └── src/
│       ├── __tests__/          # Vitest component & integration tests
│       ├── components/
│       │   ├── layout/         # Sidebar, TopBar, PlayerBar, Layout
│       │   └── ui/             # Card, Button, SkeletonLoader
│       ├── contexts/           # AuthContext, PlayerContext
│       ├── lib/
│       │   └── api.ts          # Typed API client + helpers
│       ├── pages/
│       │   ├── stats/          # MoodTrends, ListeningPatterns, TasteProfile
│       │   └── ...             # Home, Explore, Library, TrackView, ...
│       ├── types/
│       │   └── api.ts          # Shared TypeScript interfaces
│       └── utils/
│           ├── stats.ts        # linearRegression, movingAverage, zScore,
│           │                   # pearsonCorrelation, kMeansClustering
│           └── stats.test.ts   # 24 unit tests for stats utilities
│
├── server/                     # Express API
│   └── src/
│       ├── __tests__/          # Jest + Supertest route tests
│       ├── lib/
│       │   └── spotifyFetch.ts # Axios wrapper with auto token refresh
│       ├── middleware/
│       │   └── requireAuth.ts  # Session auth guard
│       ├── models/             # Mongoose schemas + caching TTL logic
│       ├── routes/
│       │   ├── auth.ts         # OAuth login / callback / refresh / logout
│       │   ├── me.ts           # top-tracks, recently-played, audio-features
│       │   ├── search.ts       # Spotify search proxy
│       │   └── items.ts        # Track / artist / album detail endpoints
│       └── types/              # Express + session type augmentations
│
├── .github/workflows/ci.yml    # GitHub Actions: lint + typecheck + test
├── DEPLOYMENT.md               # Step-by-step production deployment guide
└── README.md
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/auth/login` | Redirect to Spotify OAuth |
| GET | `/api/auth/callback` | Exchange code for tokens, set session |
| GET | `/api/auth/refresh` | Refresh Spotify access token |
| GET | `/api/auth/me` | Return current user profile |
| GET | `/api/auth/logout` | Destroy session |
| GET | `/api/me/top-tracks` | Cached top tracks (1 h TTL) |
| GET | `/api/me/top-artists` | Cached top artists (1 h TTL) |
| GET | `/api/me/recently-played` | Cached recent plays (15 min TTL) |
| GET | `/api/me/audio-features` | Permanently cached audio features |
| GET | `/api/me/playlists` | Cached playlists (1 h TTL) |
| GET | `/api/search` | Proxy to Spotify search |
| GET | `/api/item/track/:id` | Single track details |
| GET | `/api/item/artist/:id` | Artist + top tracks |
| GET | `/api/item/album/:id` | Album details |

---

## Statistical Analysis

The `client/src/utils/stats.ts` module implements five functions from scratch — no external stats library:

| Function | What it does |
|---|---|
| `linearRegression(points)` | OLS best-fit line → slope, intercept, R² |
| `movingAverage(data, window)` | Symmetric sliding-window smoother |
| `zScore(value, mean, stdDev)` | Standard score for anomaly detection |
| `pearsonCorrelation(x, y)` | Linear correlation between two feature arrays |
| `kMeansClustering(points, k)` | Lloyd's algorithm with random init; returns centroids + cluster assignments |

These power the analytics pages: regression finds your mood trend, z-score flags unusual listening spikes in the heatmap, and k-means groups your top tracks into taste clusters. All five functions have full JSDoc comments explaining the math and are covered by 24 unit tests.

---

## CI/CD

Every push and pull request runs two parallel GitHub Actions jobs (`.github/workflows/ci.yml`):

1. **Client**: ESLint → `tsc --noEmit` → Vitest (45 tests)
2. **Server**: ESLint → `tsc --noEmit` → Jest (33 tests)

Both jobs must pass before merging to `main`.

For full deployment instructions see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## License

MIT
