// Seeded into every new room so the vote pool isn't empty on night one.
// The admin can add more (or remove none — deleting isn't supported to
// keep the data model simple; an unwanted game just never gets voted for).
export const DEFAULT_GAMES = [
  "Flip Cup",
  "Pong",
  "Beer Mile (2x800)",
  "Route Running 1v1",
  "Beer Ball"
];
