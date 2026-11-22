// A small seeded generator so the same seed always gives the same game.
// Mulberry32: tiny, fast, and good enough for cosmetic jitter.
export function makeSeededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max) from a seeded generator.
export function seededInt(random, min, max) {
  return min + Math.floor(random() * (max - min));
}

// Shuffle a copy of an array with a seeded generator (Fisher-Yates).
export function seededShuffle(random, items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = copy[i];
    copy[i] = copy[j];
    copy[j] = held;
  }
  return copy;
}
