// The three rooms of The Midnight Gallery, as pure data.
// Every layout is rectangles: walls, display cases (block sight and movement),
// velvet ropes (block movement only), shadow zones, guard patrols, cameras,
// loot, lasers and the exit. The simulation never hard-codes a room.
import { FIELD, WALL } from './config.js';

function borderWalls() {
  return [
    { x: 0, y: 0, w: FIELD.width, h: WALL },
    { x: 0, y: FIELD.height - WALL, w: FIELD.width, h: WALL },
    { x: 0, y: 0, w: WALL, h: FIELD.height },
    { x: FIELD.width - WALL, y: 0, w: WALL, h: FIELD.height },
  ];
}

// Room 1 — The Foyer. A teaching room: two guards on short loops, one slow
// camera, the Aurum Star on a central pedestal, a shadow hall on the right.
const foyer = {
  name: 'The Foyer',
  hint: 'WASD / arrows to move — Shift to sneak. Grab the Aurum Star, then reach the green exit.',
  start: { x: 640, y: 648 },
  exit: { x: 60, y: 0, w: 80, h: 48, label: 'EXIT' },
  walls: borderWalls(),
  cases: [
    { x: 300, y: 180, w: 140, h: 70 },
    { x: 840, y: 180, w: 140, h: 70 },
    { x: 300, y: 470, w: 140, h: 70 },
    { x: 840, y: 470, w: 140, h: 70 },
  ],
  // Two short rope runs with a gap in the middle: the gap is the way in.
  ropes: [
    { x: 560, y: 300, w: 56, h: 6 },
    { x: 664, y: 300, w: 56, h: 6 },
    { x: 560, y: 404, w: 56, h: 6 },
    { x: 664, y: 404, w: 56, h: 6 },
  ],
  shadows: [{ x: 1128, y: 120, w: 104, h: 480, label: 'Shadow Hall' }],
  guards: [
    {
      name: 'Guard Mara',
      elite: false,
      speed: 56,
      waypoints: [
        { x: 380, y: 360 },
        { x: 900, y: 360 },
      ],
    },
    {
      name: 'Guard Piet',
      elite: false,
      speed: 50,
      waypoints: [
        { x: 640, y: 130 },
        { x: 640, y: 590 },
      ],
    },
  ],
  cameras: [
    { x: 1010, y: 24, baseAngle: 2.35, arc: 1.57, speed: 0.5 },
  ],
  lasers: [],
  loot: [
    { kind: 'star', name: 'Aurum Star', x: 640, y: 352, value: 500, main: true },
    { kind: 'goldBar', name: 'Gold Bar', x: 370, y: 268, value: 100 },
    { kind: 'coins', name: 'Coin Stack', x: 910, y: 580, value: 25 },
  ],
};

// Room 2 — The East Wing. Three guards on long crossing patrols, two cameras
// covering the two corridors, a painting worth more, a second shadow hall.
const eastWing = {
  name: 'The East Wing',
  hint: 'Two corridors, two cameras. Watch the sweeps, use the shadow halls, and mind the painting.',
  start: { x: 640, y: 648 },
  exit: { x: 60, y: 0, w: 80, h: 48, label: 'EXIT' },
  walls: borderWalls().concat([
    { x: 560, y: 240, w: 160, h: 18 },
    { x: 560, y: 462, w: 160, h: 18 },
  ]),
  cases: [
    { x: 180, y: 150, w: 130, h: 64 },
    { x: 970, y: 150, w: 130, h: 64 },
    { x: 180, y: 506, w: 130, h: 64 },
    { x: 970, y: 506, w: 130, h: 64 },
    { x: 430, y: 330, w: 110, h: 60 },
    { x: 740, y: 330, w: 110, h: 60 },
  ],
  ropes: [
    { x: 560, y: 330, w: 56, h: 6 },
    { x: 664, y: 330, w: 56, h: 6 },
  ],
  shadows: [
    { x: 48, y: 120, w: 100, h: 480, label: 'Shadow Hall' },
    { x: 1132, y: 120, w: 100, h: 480, label: 'Shadow Hall' },
  ],
  guards: [
    {
      name: 'Guard Mara',
      elite: false,
      speed: 62,
      waypoints: [
        { x: 220, y: 420 },
        { x: 1060, y: 420 },
      ],
    },
    {
      name: 'Guard Piet',
      elite: false,
      speed: 58,
      waypoints: [
        { x: 360, y: 120 },
        { x: 360, y: 600 },
      ],
    },
    {
      name: 'Guard Sanna',
      elite: false,
      speed: 58,
      waypoints: [
        { x: 920, y: 600 },
        { x: 920, y: 120 },
      ],
    },
  ],
  cameras: [
    { x: 270, y: 24, baseAngle: 1.35, arc: 1.57, speed: 0.65 },
    { x: 1010, y: 24, baseAngle: 1.79, arc: 1.57, speed: 0.65 },
  ],
  lasers: [],
  loot: [
    { kind: 'star', name: 'Aurum Star', x: 640, y: 360, value: 500, main: true },
    { kind: 'painting', name: 'Moonlit Portrait', x: 245, y: 250, value: 150 },
    { kind: 'goldBar', name: 'Gold Bar', x: 1035, y: 600, value: 100 },
    { kind: 'coins', name: 'Coin Stack', x: 640, y: 560, value: 25 },
  ],
};

// Room 3 — The Vault. Three guards plus an elite who walks faster and sees
// further, three cameras, a laser grid across the middle, and the big score:
// the Gilded Orchid. The exit sits behind the vault door at the far end.
const vault = {
  name: 'The Vault',
  hint: 'Lasers switch on and off — cross only while they are dark. The elite guard sees further. Take the Orchid.',
  start: { x: 640, y: 648 },
  exit: { x: 60, y: 0, w: 80, h: 48, label: 'VAULT EXIT' },
  walls: borderWalls().concat([
    { x: 420, y: 200, w: 18, h: 320 },
    { x: 842, y: 200, w: 18, h: 320 },
  ]),
  cases: [
    { x: 180, y: 150, w: 130, h: 64 },
    { x: 970, y: 150, w: 130, h: 64 },
    { x: 180, y: 506, w: 130, h: 64 },
    { x: 970, y: 506, w: 130, h: 64 },
  ],
  ropes: [
    { x: 560, y: 300, w: 56, h: 6 },
    { x: 664, y: 300, w: 56, h: 6 },
    { x: 560, y: 404, w: 56, h: 6 },
    { x: 664, y: 404, w: 56, h: 6 },
  ],
  shadows: [
    { x: 48, y: 120, w: 100, h: 480, label: 'Shadow Hall' },
    { x: 1132, y: 120, w: 100, h: 480, label: 'Shadow Hall' },
  ],
  guards: [
    {
      name: 'Guard Mara',
      elite: false,
      speed: 66,
      waypoints: [
        { x: 220, y: 600 },
        { x: 1060, y: 600 },
      ],
    },
    {
      name: 'Guard Sanna',
      elite: false,
      speed: 62,
      waypoints: [
        { x: 340, y: 120 },
        { x: 340, y: 600 },
      ],
    },
    {
      name: 'Guard Piet',
      elite: false,
      speed: 62,
      waypoints: [
        { x: 920, y: 600 },
        { x: 920, y: 120 },
      ],
    },
    {
      name: 'Elite Voss',
      elite: true,
      speed: 96,
      waypoints: [
        { x: 500, y: 180 },
        { x: 780, y: 180 },
        { x: 780, y: 540 },
        { x: 500, y: 540 },
      ],
    },
  ],
  cameras: [
    { x: 270, y: 24, baseAngle: 1.35, arc: 1.57, speed: 0.7 },
    { x: 640, y: 24, baseAngle: 1.57, arc: 1.57, speed: 0.55 },
    { x: 1010, y: 24, baseAngle: 1.79, arc: 1.57, speed: 0.7 },
  ],
  lasers: [
    { x1: 438, y1: 300, x2: 842, y2: 300, period: 3.2, offset: 0 },
    { x1: 438, y1: 360, x2: 842, y2: 360, period: 3.2, offset: 1.6 },
    { x1: 438, y1: 420, x2: 842, y2: 420, period: 3.2, offset: 0.8 },
  ],
  loot: [
    { kind: 'orchid', name: 'Gilded Orchid', x: 640, y: 352, value: 600, main: true },
    { kind: 'painting', name: 'Storm Portrait', x: 245, y: 250, value: 150 },
    { kind: 'goldBar', name: 'Gold Bar', x: 1035, y: 600, value: 100 },
    { kind: 'goldBar', name: 'Gold Bar', x: 245, y: 600, value: 100 },
    { kind: 'coins', name: 'Coin Stack', x: 640, y: 560, value: 25 },
  ],
};

export const LEVELS = [foyer, eastWing, vault];
