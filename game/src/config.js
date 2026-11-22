// The Midnight Gallery — tuning numbers, playfield and palette.
// One file holds every magic number so the rest of the game reads like prose.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const WALL = 24;

// The thief, Wren.
export const THIEF = {
  radius: 13,
  walkSpeed: 175,
  sneakSpeed: 88,
  pickupRadius: 30,
};

// Guards walk their patrols and chase what they notice.
export const GUARD = {
  radius: 15,
  walkSpeed: 58,
  eliteSpeed: 96,
  coneRange: 262,
  eliteConeRange: 322,
  coneHalfAngle: 0.61,
  eliteConeHalfAngle: 0.7,
  investigateSpeed: 92,
  chaseSpeed: 118,
};

// Wall cameras sweep back and forth.
export const CAMERA = {
  coneRange: 302,
  coneHalfAngle: 0.52,
  sweepArc: 1.57,
  sweepSpeed: 0.55,
};

// The alarm meter: 0 calm, 40 suspicious, 70 alert, 100 caught.
export const ALARM = {
  calmBelow: 40,
  alertAt: 70,
  caughtAt: 100,
  guardBaseRate: 19,
  cameraBaseRate: 15,
  eliteMultiplier: 1.5,
  laserRate: 34,
  sneakMultiplier: 0.5,
  shadowMultiplier: 1 / 3,
  fallRate: 3.2,
  shadowFallRate: 6.4,
  ghostBelow: 40,
};

// Tools are bought with score, so every use is a decision.
export const TOOLS = {
  smoke: { key: '1', name: 'Smoke', cost: 50, duration: 4, startCount: 2 },
  emp: { key: '2', name: 'EMP', cost: 75, duration: 6, startCount: 1 },
  decoy: { key: '3', name: 'Decoy', cost: 25, duration: 3, startCount: 3 },
};

export const LOOT_VALUES = { goldBar: 100, coins: 25, painting: 150, star: 500, orchid: 600 };
export const GHOST_BONUS = 300;
export const TIME_BONUS_CAP = 300;
export const TIME_BONUS_PER_SECOND = 4;
export const BEST_KEY = 'midnight-gallery-best';

// Palette: dark museum, gold loot, red danger, amber cameras, cool shadow.
export const PALETTE = {
  backdrop: '#070a12',
  floorA: '#171c28',
  floorB: '#1c2231',
  floorTrim: '#8a6d2f',
  wall: '#232833',
  wallEdge: '#c9a227',
  caseFill: 'rgba(150, 200, 235, 0.16)',
  caseEdge: '#d7ecff',
  rope: '#c0392b',
  post: '#d4af37',
  shadowZone: 'rgba(70, 110, 180, 0.16)',
  shadowEdge: 'rgba(120, 160, 220, 0.35)',
  lootGold: '#ffd94d',
  lootGlow: 'rgba(255, 217, 77, 0.35)',
  guardCone: 'rgba(231, 76, 60, 0.20)',
  guardConeEdge: 'rgba(231, 76, 60, 0.55)',
  cameraCone: 'rgba(245, 176, 65, 0.18)',
  cameraConeEdge: 'rgba(245, 176, 65, 0.5)',
  thiefCloth: '#1d2733',
  thiefTrim: '#2dd4bf',
  guardUniform: '#2c3e63',
  guardTrim: '#e74c3c',
  exitGlow: 'rgba(46, 204, 113, 0.5)',
  exitDoor: '#2ecc71',
  smoke: 'rgba(200, 205, 215, 0.55)',
  laserLive: '#ff2e4d',
  laserOff: 'rgba(255, 46, 77, 0.18)',
  panel: 'rgba(8, 11, 18, 0.88)',
  panelEdge: '#c9a227',
  text: '#f2ead8',
  dimText: '#9aa5b8',
  calm: '#2ecc71',
  suspicious: '#f5b041',
  alert: '#e74c3c',
};

