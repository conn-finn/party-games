// Seeded into every new room so the vote pool isn't empty on night one.
// The admin can add more (or remove none — deleting isn't supported to
// keep the data model simple; an unwanted game just never gets voted for).
export const DEFAULT_GAMES = [
  "Charades",
  "Trivia Showdown",
  "Cornhole",
  "Flip Cup",
  "Pictionary",
  "Beer Pong (or Water Pong)",
  "Cards Against Humanity",
  "Two Truths and a Lie",
  "Scattergories",
  "Musical Chairs",
  "Giant Jenga",
  "Karaoke Battle",
];
