-- ============================================================================
-- GAME NIGHT — database schema
-- ============================================================================
-- Run this once in your Supabase project's SQL Editor (or via `psql`) before
-- deploying the app. It is safe to re-run on a fresh database; it is NOT
-- idempotent against an existing populated database (it will error on
-- duplicate objects), so only run it once per project.
--
-- Design notes (see README.md for the full write-up):
--   * One "room" = one game night. A room has a short human-typeable `code`.
--   * "users" are players *scoped to a room* — there is no global account
--     system. Identity is a (room, username) pair plus a private
--     `client_token` that the browser remembers in localStorage so a player
--     can silently rejoin after accidentally closing the tab.
--   * The game list (`game_options`) is per-room so the admin can add
--     custom games, and so voting pools never leak between rooms.
--   * A "round" is one instance of: 3 games proposed -> vote -> winner
--     chosen -> played -> scores entered. Games can be replayed across
--     multiple rounds, so scores are attached to a round, not a game.
--   * Scoring can be per-player or per-team for a given round
--     (`rounds.scoring_mode`). The `user_round_scores` view flattens both
--     shapes into "one row per user per round" so the leaderboard query
--     never has to special-case teams.
--   * Row Level Security is enabled on every table with NO policies. That
--     is intentional: the browser never talks to Supabase directly, only
--     our Next.js API routes do (using the service role key, which bypasses
--     RLS). This means even if the anon/public key ever leaked, it could
--     not read or write anything.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- rooms
-- ----------------------------------------------------------------------------
create table rooms (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  status         text not null default 'lobby'
                   check (status in ('lobby', 'voting', 'in_progress', 'ended')),
  admin_user_id  uuid, -- FK added below, after `users` exists (circular reference)
  created_at     timestamptz not null default now(),
  ended_at       timestamptz
);

-- ----------------------------------------------------------------------------
-- users  (players within a room — not a global account)
-- ----------------------------------------------------------------------------
create table users (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  username       text not null,
  -- generated lowercase column lets us enforce case-insensitive uniqueness
  -- ("Alex" and "alex" are the same player) with a normal unique index.
  username_lower text generated always as (lower(username)) stored,
  is_admin       boolean not null default false,
  team_id        uuid, -- FK added below, after `teams` exists
  -- Private token stored in the player's browser (localStorage). Presenting
  -- the correct token is what lets a player silently rejoin their seat.
  client_token   text not null unique,
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  unique (room_id, username_lower)
);

alter table rooms
  add constraint rooms_admin_user_fk
  foreign key (admin_user_id) references users(id);

-- ----------------------------------------------------------------------------
-- teams  (optional — a room can be played entirely individually)
-- ----------------------------------------------------------------------------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (room_id, name)
);

alter table users
  add constraint users_team_fk
  foreign key (team_id) references teams(id) on delete set null;

-- ----------------------------------------------------------------------------
-- game_options  (the pool of games a room can vote on / play)
-- ----------------------------------------------------------------------------
create table game_options (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  name        text not null,
  -- Once a game has been played at least once it's deprioritized from
  -- future random vote pools (see lib/gameSelection.js) so the group sees
  -- variety, but it can still be replayed manually by the admin.
  played      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (room_id, name)
);

-- ----------------------------------------------------------------------------
-- rounds  (one voting -> play -> scoring cycle)
-- ----------------------------------------------------------------------------
create table rounds (
  id                       uuid primary key default gen_random_uuid(),
  room_id                  uuid not null references rooms(id) on delete cascade,
  status                   text not null default 'voting'
                             check (status in ('voting', 'in_progress', 'completed', 'cancelled')),
  scoring_mode             text not null default 'individual'
                             check (scoring_mode in ('individual', 'team')),
  winning_game_option_id   uuid references game_options(id),
  created_at               timestamptz not null default now(),
  voting_ended_at          timestamptz,
  completed_at             timestamptz
);

-- The 3 games randomly offered for a given round's vote.
create table round_options (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds(id) on delete cascade,
  game_option_id  uuid not null references game_options(id) on delete cascade,
  unique (round_id, game_option_id)
);

-- One vote per player per round.
create table votes (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  game_option_id  uuid not null references game_options(id),
  created_at      timestamptz not null default now(),
  unique (round_id, user_id)
);

-- ----------------------------------------------------------------------------
-- scores  (exactly one of user_id / team_id is set, matching the round's
-- scoring_mode at the time it was played)
-- ----------------------------------------------------------------------------
create table scores (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  room_id     uuid not null references rooms(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  team_id     uuid references teams(id) on delete cascade,
  points      numeric not null default 0,
  created_at  timestamptz not null default now(),
  constraint scores_exactly_one_target check (
    (user_id is not null and team_id is null) or
    (user_id is null and team_id is not null)
  )
);

-- ----------------------------------------------------------------------------
-- Indexes for the lookups the app actually does
-- ----------------------------------------------------------------------------
create index idx_users_room            on users(room_id);
create index idx_teams_room            on teams(room_id);
create index idx_game_options_room     on game_options(room_id);
create index idx_rounds_room           on rounds(room_id);
create index idx_round_options_round   on round_options(round_id);
create index idx_votes_round           on votes(round_id);
create index idx_scores_room           on scores(room_id);
create index idx_scores_round          on scores(round_id);

-- ----------------------------------------------------------------------------
-- user_round_scores — flattens individual + team scores to "per user"
-- ----------------------------------------------------------------------------
-- A team score is credited to every current member of that team. This is
-- what makes the leaderboard math trivial: it never needs to know whether
-- a given round was scored individually or by team.
create view user_round_scores as
  select s.round_id, s.room_id, u.id as user_id, s.points
  from scores s
  join users u on u.id = s.user_id
  where s.user_id is not null
  union all
  select s.round_id, s.room_id, member.id as user_id, s.points
  from scores s
  join users member on member.team_id = s.team_id
  where s.team_id is not null;

-- ----------------------------------------------------------------------------
-- Row Level Security — locked down; only the service role (server) bypasses
-- this. The browser only ever talks to our own API routes.
-- ----------------------------------------------------------------------------
alter table rooms         enable row level security;
alter table users         enable row level security;
alter table teams         enable row level security;
alter table game_options  enable row level security;
alter table rounds        enable row level security;
alter table round_options enable row level security;
alter table votes         enable row level security;
alter table scores        enable row level security;
