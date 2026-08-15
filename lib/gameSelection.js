// Picks 3 games to offer for a vote. Players only ever see these 3 (see
// app/api/rooms/[code]/round/start/route.js), never the full list, which is
// what satisfies "each user cannot see the remaining games".
//
// Strategy: prefer games that haven't been played yet so the group sees
// variety night-to-night; only reach into already-played games once fewer
// than 3 unplayed ones remain.
export function pickRandomGames(allGameOptions, count = 3) {
  const unplayed = shuffle(allGameOptions.filter((g) => !g.played));
  const played = shuffle(allGameOptions.filter((g) => g.played));
  return [...unplayed, ...played].slice(0, count);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
