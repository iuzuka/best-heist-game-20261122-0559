// The screenshot scenes behind ?shot=play|title|spotted|getaway.
// Each one plays the real rules forward from a fresh room for a fixed number
// of steps, steered by a simple autopilot, with a fixed seed, so the same
// seed always gives the same frame. The boot stages a scene when the page
// URL names it, paints it twice, then sets the ready flag.
import { STEP, THIEF } from './config.js';
import { EVENT_CAUGHT, EVENT_NONE, EVENT_ROOM_DONE, newRoomState, pointSeen, previewStep, stepRoom, stepAmbient } from './world.js';
import { LEVELS } from './levels.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_ROOM_DONE, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 5;
const PLAY_SECONDS = 16;
const GETAWAY_LIMIT_SECONDS = 90;
const SPOTTED_ALARM = 82;
const PEEK_ALARM = 9;

// Eight compass directions the autopilot can try, best first by target.
const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 0.7071, dy: 0.7071 },
  { dx: -0.7071, dy: 0.7071 },
  { dx: 0.7071, dy: -0.7071 },
  { dx: -0.7071, dy: -0.7071 },
];

// The autopilot's next move toward a target: the direction that gets closest
// to the target without stepping into a cone; it waits when every way is
// watched, and flees a cone it is already standing in.
export function autopilotMove(state, target) {
  const thief = state.thief;
  const step = THIEF.walkSpeed * STEP;
  const toTargetX = target.x - thief.x;
  const toTargetY = target.y - thief.y;
  const toTarget = Math.hypot(toTargetX, toTargetY);
  if (toTarget < 6) return { dx: 0, dy: 0 };
  const wantX = toTargetX / toTarget;
  const wantY = toTargetY / toTarget;
  const currentlySeen = pointSeen(state, thief.x, thief.y);
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < DIRECTIONS.length; i += 1) {
    const dir = DIRECTIONS[i];
    // Where the thief would actually end up: a direction into a wall or a
    // case goes nowhere, so it scores badly and a sidestep wins instead.
    const landed = previewStep(state, thief.x, thief.y, dir.dx * step, dir.dy * step);
    const moved = Math.hypot(landed.x - thief.x, landed.y - thief.y);
    const seen = pointSeen(state, landed.x, landed.y);
    const toward = dir.dx * wantX + dir.dy * wantY;
    let score = toward * 2 - (seen ? 5 : 0) - (moved < 0.5 ? 10 : 0);
    if (currentlySeen && !seen) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  if (!best) return { dx: 0, dy: 0 };
  if (bestScore < -3 && !currentlySeen) return { dx: 0, dy: 0 };
  return { dx: best.dx, dy: best.dy };
}

function stepWithMove(state, move) {
  return stepRoom(state, STEP, { dx: move.dx, dy: move.dy, sneak: false, click: null, useTool: false, select: null, buy: false });
}

// Walk a list of waypoints with the autopilot, stopping early on an event.
function walkWaypoints(state, waypoints, limitSeconds) {
  const limit = Math.floor(limitSeconds / STEP);
  let waypointIndex = 0;
  for (let i = 0; i < limit; i += 1) {
    if (waypointIndex >= waypoints.length) return EVENT_NONE;
    const target = waypoints[waypointIndex];
    if (Math.hypot(state.thief.x - target.x, state.thief.y - target.y) < 14) {
      waypointIndex += 1;
      continue;
    }
    const events = stepWithMove(state, autopilotMove(state, target));
    if (events & (EVENT_CAUGHT | EVENT_ROOM_DONE)) return events;
  }
  return EVENT_NONE;
}

// The main loot of the current room, still on its pedestal.
function mainLoot(state) {
  for (let i = 0; i < state.loot.length; i += 1) {
    if (state.loot[i].main && !state.loot[i].taken) return state.loot[i];
  }
  return null;
}

function nearestGuard(state) {
  let best = null;
  let bestDistance = Infinity;
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    const distance = Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = guard;
    }
  }
  return best;
}

// The cover: a mid-heist play frame. The autopilot walks the rope gap toward
// the Aurum Star and stops just short of it, peeks into a cone until the
// alarm reads low but non-zero, then slips back toward the cases.
function stagePlay(state) {
  walkWaypoints(state, [
    { x: 640, y: 560 },
    { x: 640, y: 470 },
    { x: 640, y: 420 },
  ], PLAY_SECONDS);
  const star = mainLoot(state);
  if (star && Math.hypot(state.thief.x - star.x, state.thief.y - star.y) > 70) {
    walkWaypoints(state, [{ x: 640, y: 400 }], 6);
  }
  // Peek: walk straight at the nearest guard until the alarm reads a little.
  let peekSteps = 0;
  while (state.alarm < PEEK_ALARM && peekSteps < 240) {
    const guard = nearestGuard(state);
    if (!guard) break;
    const dx = guard.x - state.thief.x;
    const dy = guard.y - state.thief.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 30) break;
    const events = stepWithMove(state, { dx: dx / distance, dy: dy / distance });
    peekSteps += 1;
    if (events & (EVENT_CAUGHT | EVENT_ROOM_DONE)) break;
  }
  // Slip back toward the cases while the alarm cools.
  walkWaypoints(state, [{ x: 480, y: 200 }], 2);
  return { screen: SCREEN_PLAY, state };
}

// The title scene: the room idles for a few seconds behind the panel.
function stageTitle(state) {
  for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) stepAmbient(state, STEP);
  return { screen: SCREEN_TITLE, state };
}

// The spotted scene: a naive thief walks straight at the loot, ignoring the
// cones, then keeps walking straight at the nearest guard until the alarm is
// deep in Alert — the caught moment, still fair.
function stageSpotted(state) {
  const star = mainLoot(state);
  const limit = Math.floor(60 / STEP);
  for (let i = 0; i < limit; i += 1) {
    if (!star || state.alarm >= SPOTTED_ALARM) break;
    const dx = star.x - state.thief.x;
    const dy = star.y - state.thief.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 10) break;
    const events = stepWithMove(state, { dx: dx / distance, dy: dy / distance });
    if (events & EVENT_CAUGHT) break;
  }
  // The star is taken (or nearly): now hunt for a cone. The thief steps to a
  // point in front of the nearest guard, then stands still inside the cone
  // and lets the alarm climb — at Alert every guard converges on them.
  for (let i = 0; i < limit; i += 1) {
    if (state.alarm >= SPOTTED_ALARM) break;
    const guard = nearestGuard(state);
    if (!guard) break;
    let move;
    if (pointSeen(state, state.thief.x, state.thief.y)) {
      move = { dx: 0, dy: 0 };
    } else {
      const aheadX = guard.x + Math.cos(guard.angle) * 110;
      const aheadY = guard.y + Math.sin(guard.angle) * 110;
      const dx = aheadX - state.thief.x;
      const dy = aheadY - state.thief.y;
      const distance = Math.hypot(dx, dy);
      move = distance < 6 ? { dx: 0, dy: 0 } : { dx: dx / distance, dy: dy / distance };
    }
    const events = stepWithMove(state, move);
    if (events & EVENT_CAUGHT) break;
  }
  return { screen: SCREEN_PLAY, state };
}

// The getaway: the autopilot steals the star and reaches the exit, so the
// room-complete panel shows the score breakdown over the glowing exit.
function stageGetaway(state) {
  const events = walkWaypoints(state, [
    { x: 640, y: 560 },
    { x: 640, y: 470 },
    { x: 640, y: 420 },
    { x: 640, y: 352 },
    { x: 480, y: 200 },
    { x: 240, y: 120 },
    { x: 100, y: 40 },
  ], GETAWAY_LIMIT_SECONDS);
  if (events & EVENT_ROOM_DONE) return { screen: SCREEN_ROOM_DONE, state };
  if (events & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT, state };
  return { screen: SCREEN_PLAY, state };
}

// Set `state` to the named scene (play, title, spotted, getaway; any other
// name is play) and return the screen to draw over it.
export function stageShot(name, state) {
  if (name === 'title') return stageTitle(state);
  if (name === 'spotted') return stageSpotted(state);
  if (name === 'getaway') return stageGetaway(state);
  return stagePlay(state);
}

export function freshShotState(seed) {
  return newRoomState(LEVELS[0], 0);
}

