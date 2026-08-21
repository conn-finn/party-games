# 🎉 Game Night

A mobile-first web app for running a group game night: players log in with just
a **name + room code**, vote on what to play next, and track scores on a
colorful, animated leaderboard — individually or as teams. Whoever joins a
room first automatically becomes its **admin** (Jackbox-style), controlling
the game list, teams, and scoring.

Built with **Next.js (App Router) + React + JavaScript**, a **Postgres**
database hosted on **Supabase**, and plain **CSS** (no UI framework). Designed
to be cheap (free, at this scale) and simple to run and deploy.

---

## Table of contents

1. [How it works, at a glance](#how-it-works-at-a-glance)
2. [Running it locally](#running-it-locally)
3. [Deploying it for real (plain-English guide)](#deploying-it-for-real-plain-english-guide)
4. [Architecture & key design decisions](#architecture--key-design-decisions)
5. [How the core logic works](#how-the-core-logic-works)
6. [Project structure](#project-structure)
7. [Known limitations / good next steps](#known-limitations--good-next-steps)

---

## How it works, at a glance

1. **Someone creates a room.** They type a name, tap "New room," and get a
   4-character room code (e.g. `AB12`). They're now the room's admin.
2. **Everyone else joins.** They type their name and that room code. No
   password, no account.
3. **Admin starts a vote.** The app randomly offers **3** games out of the
   full list — players never see the rest of the list, so there's no
   "let's just vote for the one I know is next" gaming of the system.
4. **Everyone votes**, then the admin ends voting. The most-voted game wins
   (ties broken randomly) and is announced to the room.
5. **The group plays the game** — out in the room, away from the app.
6. **Admin enters scores** — per player, or per team if teams are set up —
   and finishes the round.
7. **Leaderboard updates** for everyone, with a podium, a colorful bar
   chart, and a full score history. Sort by highest or lowest score.
8. Repeat from step 3 for as many rounds as the group wants. The room stays
   open until the admin explicitly ends it.

If someone accidentally closes the app or their phone locks and kicks them
out, reopening it **silently signs them back into the same room and seat** —
nothing is lost.

---

## Running it locally

### Prerequisites

- [Node.js](https://nodejs.org) 18.18 or newer
- A free [Supabase](https://supabase.com) account (this is your Postgres
  database — see below)

### 1. Create the database

1. Create a new project at [supabase.com](https://supabase.com) (the free
   tier is more than enough — see [Deploying](#deploying-it-for-real-plain-english-guide)).
2. Open your project's **SQL Editor** and paste in the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql), then run it. This creates
   every table, the leaderboard view, and locks the database down with Row
   Level Security (see [Security model](#security-model-why-theres-no-login-and-no-rls-policies) below).
3. Go to **Settings → API** and copy:
   - **Project URL**
   - **`service_role` secret key** (not the "anon"/"public" one)

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in the two values you just copied:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Since it's mobile-first,
it's worth testing with your browser's device toolbar set to an iPhone
viewport, or by opening it on your actual phone (find your computer's local
IP, e.g. `http://192.168.1.23:3000`, since `localhost` won't be reachable
from another device).

---

## Deploying it for real (plain-English guide)

You need two things, both free at this scale: a place to run the app
(**Vercel**) and a database (**Supabase**, which you already set up above).

### Step 1 — Put the code on GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Game Night"
```

Create a new (private is fine) repository on [github.com](https://github.com)
and push this code to it.

### Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/log in (you can use
   your GitHub account).
2. Click **Add New → Project**, and pick the repository you just pushed.
3. Vercel auto-detects Next.js — you don't need to change any build
   settings.
4. Before clicking Deploy, open **Environment Variables** and add the same
   two values from your `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**. In about a minute you'll get a live URL like
   `game-night-yourname.vercel.app` — that's it, share that link (and have
   people tap "New room" / "Join room") and you're playing.

### Updating the app later

Any time you push new commits to your GitHub repo's main branch, Vercel
automatically rebuilds and redeploys — there's no manual "ship it" step.

### What this costs

At the traffic this app expects (a single room, well under 50 people at
once), you'll comfortably stay within:

- **Vercel's free "Hobby" plan** — generous enough for personal projects.
- **Supabase's free tier** — 500 MB of database storage (this app's data
  is tiny — a busy game night is a few hundred rows) and enough bandwidth
  for far more than 50 concurrent players polling every few seconds.

So: **$0/month** for typical use. If you ever wanted this running for many
simultaneous game nights across many groups, you'd outgrow the free tiers
eventually — but not from any single room's use.

---

## Architecture & key design decisions

### Why Next.js on Vercel + Supabase Postgres

This is the simplest stack that still follows good practice: one deploy
target (Vercel) serves both the React frontend *and* the backend API (as
Next.js [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)),
so there's no separate backend service to host, scale, or pay for. Supabase
gives a real Postgres database (as requested) with a generous free tier and
zero server management.

### Why polling instead of WebSockets

"Live" updates (new votes coming in, the admin starting a game, scores
posting) are done by having the browser **poll** a `state` API endpoint every
3 seconds via [SWR](https://swr.vercel.app/), rather than opening a
WebSocket connection.

At this scale (under 50 people in a single room), the difference in *feel*
between polling and true real-time is a couple of seconds — imperceptible
for a game where the "next play" happens after someone physically walks
across a room and finishes a party game. In exchange, polling is
dramatically simpler to host: Next.js's serverless functions on Vercel can
be short-lived request/response calls, with no persistent connections to
manage, no separate WebSocket server or service (like Supabase Realtime or
Pusher) to configure, and no reconnection/heartbeat logic to write. Simpler
infrastructure means fewer things that can break during an actual game
night.

### The "identity" model: no accounts, no passwords

There's no traditional auth system. Joining a room creates a row in the
`users` table (scoped to that room) and hands the browser a random,
unguessable `client_token`, which is saved in `localStorage`. Every
subsequent request proves "this is really that player" by presenting the
matching `(userId, token)` pair — functionally a session cookie, just an
explicit value instead of an HTTP cookie, which is easier to reason about
in a polling-based API tested from a browser console or curl.

This is also what powers **silent rejoin**: if the app is accidentally
closed, `localStorage` still has the token, so reopening it calls the state
endpoint with those saved credentials and — if they're still valid — drops
the player straight back into the room with everything intact. No
re-typing a name, no lost votes or team assignment.

### Security model: why there's no login, and no RLS policies

Row Level Security (RLS) is turned **on** for every table in
`supabase/schema.sql`, but **no policies are defined**. In Postgres/Supabase,
that combination means: *nobody* can read or write these tables through
Supabase's public API — except the `service_role` key, which intentionally
bypasses RLS.

The app only ever uses that `service_role` key from **server-side** Next.js
Route Handlers (see `lib/supabaseServer.js`) — never from the browser. So
even if someone inspected the app's network traffic, there's no Supabase
key to steal that would let them read or modify the database directly; they
can only go through our own API routes, which enforce the room/token checks
described above.

### Individual vs. team scoring, unified

A round is scored either **by player** or **by team** (`rounds.scoring_mode`).
Rather than making the leaderboard logic branch on which mode every round
used, the schema includes a SQL view, `user_round_scores`, that flattens
both shapes into "one row per user per round" — a team's score is expanded
to every member of that team. The leaderboard query then never needs to
know or care whether a given round was scored individually or by team; see
[`supabase/schema.sql`](./supabase/schema.sql) for the view definition.

### Keeping the vote pool secret

When the admin starts a voting round, the server randomly picks 3 games
from the room's full list (`lib/gameSelection.js`, preferring games that
haven't been played yet for variety) and stores them as that round's
`round_options`. The `state` API endpoint only ever returns the *current
round's* 3 options to non-admin players — never the full `game_options`
list — so there's no way for a player to see (or vote strategically around)
what else is in the pool. The admin's view of `state` does include the full
list, since they're the one managing it.

---

## How the core logic works

### The room lifecycle

A room (`rooms.status`) moves between four states:

```
lobby ──(admin starts a round)──▶ voting ──(admin ends voting)──▶ in_progress ──(admin submits scores)──▶ lobby
  │                                                                                                          │
  └──────────────────────────────── (repeats for as many rounds as the group wants) ◀───────────────────────┘

Any state ──(admin ends the room)──▶ ended
```

A "round" (`rounds` table) mirrors this for a single game: `voting` →
`in_progress` → `completed`. A room has **at most one active round** at a
time (`lib/rounds.js`'s `getActiveRound`), which is what the whole UI keys
off of to decide what to show.

### Starting a game

The admin has two ways to pick the next game, both from the Admin tab's
"Start the next round" section:

- **Random vote** (the original flow) — `POST /api/rooms/[code]/round/start`
  picks 3 games, creates the round, sets the room to `voting`.
- **Pick a game** (manual) — `POST /api/rooms/[code]/round/start-manual`
  lets the admin choose any game directly and jumps straight to
  `in_progress`, skipping the voting stage entirely. No `round_options` rows
  are created for this round, so the Vote tab never shows a vote for it —
  non-admin players go straight from "no vote right now" to "now playing."
  This is useful when the admin already knows what's next (or wants to
  re-run a specific game) without bothering the group with a vote.

Once a round is active (by either path):

- `POST /api/rooms/[code]/round/vote` (any player) — casts or changes a
  vote. Votes are stored one-per-player via a database `unique` constraint
  and an upsert, so re-voting just overwrites the previous choice. (Only
  applies to rounds started by vote, obviously.)
- `POST /api/rooms/[code]/round/end-voting` (admin only) — tallies votes,
  picks the winner (ties broken randomly), marks that game `played`, and
  moves the round to `in_progress`.

### Scoring

- `POST /api/rooms/[code]/round/scores` (admin only) — takes a list of
  `{ targetId, points }` entries (a player id or team id, depending on the
  round's scoring mode), replaces any existing scores for that round
  (so re-submitting after a refresh is safe), and marks the round
  `completed`, returning the room to `lobby`.

### Leaderboard

`GET /api/rooms/[code]/leaderboard?sort=desc|asc` reads the
`user_round_scores` view described above, sums each player's total in
JavaScript, and ranks them — using "dense" competition ranking, so tied
players share a rank (e.g. `1, 2, 2, 4`) instead of skipping numbers
arbitrarily. It also returns a `history` list — one entry per completed
round with each player/team's score — which powers the "Game history"
section under the chart.

### Rendering the leaderboard

- **Podium** (`components/Podium.js`) — the app's one deliberate "signature"
  visual: a real 3-pedestal podium (2nd–1st–3rd, tallest in the middle)
  colored gold/silver/bronze, with a confetti burst (`lib/confetti.js`,
  via `canvas-confetti`) whenever the #1 spot changes hands.
- **Bar chart** (`components/LeaderboardChart.js`, via
  [Recharts](https://recharts.org/)) — every player's total, colored by
  rank (gold/silver/bronze for the top 3, then cycling through the app's
  pink/mint/sky accents), flipping direction automatically based on the
  highest/lowest sort toggle.

---

## Project structure

```
app/
  page.js                    Home screen: create or join a room
  room/[code]/page.js        Room screen (thin wrapper around RoomClient)
  layout.js, globals.css     Fonts, design tokens, resets, shared animations
  api/rooms/                 All backend logic (Next.js Route Handlers)
    join/route.js               Create or join a room
    [code]/state/route.js       The main polling endpoint (room + round state)
    [code]/games/route.js       Admin: add a game
    [code]/teams/route.js       Admin: create a team
    [code]/teams/assign/route.js  Admin: assign a player to a team
    [code]/round/start/route.js       Admin: start a voting round
    [code]/round/start-manual/route.js  Admin: hand-pick a game, skipping the vote
    [code]/round/vote/route.js        Player: cast a vote
    [code]/round/end-voting/route.js  Admin: lock in the winning game
    [code]/round/scores/route.js      Admin: submit scores, finish round
    [code]/leaderboard/route.js       Standings + score history
    [code]/end/route.js               Admin: end the room

components/                  All UI, as React client components + CSS modules
  RoomClient.js               Session bootstrap, polling, tab switching
  VoteTab.js, LeaderboardTab.js, AdminTab.js   The 3 tabs
  Podium.js, LeaderboardChart.js, ScoreHistory.js
  admin/                       GamesManager, TeamsManager, RoundControl

hooks/
  useRoom.js                  SWR polling hook for room/round state
  useLeaderboard.js           SWR polling hook for the leaderboard

lib/
  supabaseServer.js           Server-only Supabase client (service_role key)
  apiHelpers.js                Shared auth/lookup helpers for API routes
  clientSession.js             Browser localStorage session (rejoin support)
  apiClient.js                 Browser fetch wrapper
  codes.js, defaultGames.js, gameSelection.js, rounds.js, confetti.js

supabase/schema.sql          The entire database schema (run once, see above)
```

---

## Known limitations / good next steps

This was built to match the brief as simply as possible, favoring the
smallest solution that's still correct. Some things it deliberately doesn't
do, in case you want to extend it:

- **No real-time websockets** — updates land within ~3 seconds via polling,
  not instantly. Fine for this app's pace; would matter for something
  faster-twitch.
- **One active room per browser** — the app only remembers one session in
  `localStorage` at a time. Someone playing in two different rooms at once
  (in two tabs) would need to use a private/incognito window for the
  second one.
- **No game deletion**, only adding — keeps the data model (and the "which
  games have been played" logic) simple. An unwanted game just never gets
  voted for.
- **No rate limiting or abuse protection** — reasonable for a trusted group
  of friends behind a shared link; would need hardening before opening a
  room's join link publicly on the internet.
- **Rejoin is device-based, not identity-based** — if someone clears their
  browser data or switches devices mid-game, they can't reclaim their old
  seat (they'd need to join under a new name). Verifying real identity
  would require actual accounts, which the brief specifically avoided.
