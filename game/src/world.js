// The Midnight Gallery — the simulation: movement, patrols, vision cones,
// the alarm meter and guard reactions, loot, tools, lasers, win and lose.
import {
  ALARM,
  CAMERA,
  FIELD,
  GHOST_BONUS,
  GUARD,
  THIEF,
  TIME_BONUS_CAP,
  TIME_BONUS_PER_SECOND,
  TOOLS,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_ROOM_DONE = 4;
export const EVENT_TOOL = 8;

export function alarmStage(alarm) {
  if (alarm >= ALARM.caughtAt) return 'Caught';
  if (alarm >= ALARM.alertAt) return 'Alert';
  if (alarm >= ALARM.calmBelow) return 'Suspicious';
  return 'Calm';
}

// A fresh room state from a level definition. totalScore carries across rooms.
export function newRoomState(level, totalScore) {
  return {
    level,
    time: 0,
    alarm: 0,
    maxAlarm: 0,
    totalScore,
    totalBefore: totalScore,
    roomScore: 0,
    lootTaken: 0,
    exitUnlocked: false,
    breakdown: null,
    thief: {
      x: level.start.x,
      y: level.start.y,
      angle: -Math.PI / 2,
      moving: false,
      sneaking: false,
      walkTarget: null,
    },
    guards: level.guards.map((def) => ({
      def,
      x: def.waypoints[0].x,
      y: def.waypoints[0].y,
      angle: 0,
      waypointIndex: 1 % def.waypoints.length,
      mode: 'patrol',
      targetX: def.waypoints[0].x,
      targetY: def.waypoints[0].y,
      timer: 0,
    })),
    cameras: level.cameras.map((def) => ({ def, angle: def.baseAngle, disabledUntil: 0 })),
    smokes: [],
    decoy: null,
    empUntil: 0,
    tools: {
      smoke: TOOLS.smoke.startCount,
      emp: TOOLS.emp.startCount,
      decoy: TOOLS.decoy.startCount,
    },
    selectedTool: 'smoke',
    beltFlashUntil: 0,
    lastSeen: null,
    seenNow: false,
    laserHit: false,
    loot: level.loot.map((piece) => ({ ...piece, taken: false })),
  };
}

function circleHitsRect(x, y, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

// Walls, cases and ropes are solid for the thief; guards step over ropes.
function solidRects(state, forGuard) {
  const rects = state.level.walls.concat(state.level.cases);
  return forGuard ? rects : rects.concat(state.level.ropes);
}

function collidesAt(state, x, y, radius, forGuard) {
  if (x < radius || x > FIELD.width - radius || y < radius || y > FIELD.height - radius) return true;
  const rects = solidRects(state, forGuard);
  for (let i = 0; i < rects.length; i += 1) {
    if (circleHitsRect(x, y, radius, rects[i])) return true;
  }
  return false;
}

// Move a circle one step, sliding along a wall when only one axis is free.
function slideMove(state, x, y, dx, dy, radius, forGuard) {
  if (!collidesAt(state, x + dx, y + dy, radius, forGuard)) return { x: x + dx, y: y + dy };
  if (!collidesAt(state, x + dx, y, radius, forGuard)) return { x: x + dx, y };
  if (!collidesAt(state, x, y + dy, radius, forGuard)) return { x, y: y + dy };
  return { x, y };
}

// Does the segment from (x1,y1) to (x2,y2) cross a rectangle?
function segmentHitsRect(x1, y1, x2, y2, rect) {
  if ((x1 < rect.x && x2 < rect.x) || (x1 > rect.x + rect.w && x2 > rect.x + rect.w)) return false;
  if ((y1 < rect.y && y2 < rect.y) || (y1 > rect.y + rect.h && y2 > rect.y + rect.h)) return false;
  if (x1 >= rect.x && x1 <= rect.x + rect.w && y1 >= rect.y && y1 <= rect.y + rect.h) return true;
  if (x2 >= rect.x && x2 <= rect.x + rect.w && y2 >= rect.y && y2 <= rect.y + rect.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  for (let i = 0; i < edges.length; i += 1) {
    const [ex1, ey1, ex2, ey2] = edges[i];
    const denom = dx * (ey2 - ey1) - dy * (ex2 - ex1);
    if (denom === 0) continue;
    const t = ((ex1 - x1) * (ey2 - ey1) - (ey1 - y1) * (ex2 - ex1)) / denom;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

// Walls and display cases block sight; velvet ropes do not.
export function lineOfSightBlocked(state, x1, y1, x2, y2) {
  const blockers = state.level.walls.concat(state.level.cases);
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return true;
  }
  return false;
}

export function insideShadow(state, x, y) {
  for (let i = 0; i < state.level.shadows.length; i += 1) {
    const zone = state.level.shadows[i];
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) return true;
  }
  return false;
}

export function insideSmoke(state, x, y) {
  for (let i = 0; i < state.smokes.length; i += 1) {
    const cloud = state.smokes[i];
    const dx = x - cloud.x;
    const dy = y - cloud.y;
    if (dx * dx + dy * dy < 46 * 46) return true;
  }
  return false;
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

// How fast the alarm climbs while this watcher sees the thief (0 = not seen).
function watcherRate(state, watcherX, watcherY, watcherAngle, range, halfAngle, baseRate) {
  const thief = state.thief;
  const dx = thief.x - watcherX;
  const dy = thief.y - watcherY;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return 0;
  if (Math.abs(angleDifference(Math.atan2(dy, dx), watcherAngle)) > halfAngle) return 0;
  if (lineOfSightBlocked(state, watcherX, watcherY, thief.x, thief.y)) return 0;
  const closeness = 1.5 - distance / range;
  return baseRate * Math.max(0.5, closeness);
}

// Where a thief at (x, y) would end up after one step (dx, dy), with walls,
// cases and ropes in the way. The autopilot uses this to avoid directions
// that run into furniture.
export function previewStep(state, x, y, dx, dy) {
  return slideMove(state, x, y, dx, dy, THIEF.radius, false);
}

// Would a thief standing at (x, y) be seen by anyone right now? The autopilot
// and the play-test driver ask this before they commit to a step.
export function pointSeen(state, x, y) {
  const saved = { x: state.thief.x, y: state.thief.y };
  state.thief.x = x;
  state.thief.y = y;
  const seen = scanWatchers(state).rate > 0;
  state.thief.x = saved.x;
  state.thief.y = saved.y;
  return seen;
}

// The strongest watcher on the thief right now, and whether anyone sees them.
function scanWatchers(state) {
  let rate = 0;
  const hidden = insideSmoke(state, state.thief.x, state.thief.y);
  if (!hidden) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      const range = guard.def.elite ? GUARD.eliteConeRange : GUARD.coneRange;
      const half = guard.def.elite ? GUARD.eliteConeHalfAngle : GUARD.coneHalfAngle;
      const base = ALARM.guardBaseRate * (guard.def.elite ? ALARM.eliteMultiplier : 1);
      rate = Math.max(rate, watcherRate(state, guard.x, guard.y, guard.angle, range, half, base));
    }
    for (let i = 0; i < state.cameras.length; i += 1) {
      const camera = state.cameras[i];
      if (state.time < camera.disabledUntil) continue;
      rate = Math.max(rate, watcherRate(state, camera.def.x, camera.def.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, ALARM.cameraBaseRate));
    }
  }
  return { rate, seen: rate > 0 };
}

export function laserIsLive(laser, time) {
  return ((time + laser.offset) % laser.period) < laser.period / 2;
}

function thiefTouchesLaser(state) {
  for (let i = 0; i < state.level.lasers.length; i += 1) {
    const beam = state.level.lasers[i];
    if (!laserIsLive(beam, state.time)) continue;
    const dx = beam.x2 - beam.x1;
    const dy = beam.y2 - beam.y1;
    const lengthSq = dx * dx + dy * dy;
    let t = ((state.thief.x - beam.x1) * dx + (state.thief.y - beam.y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const px = beam.x1 + t * dx;
    const py = beam.y1 + t * dy;
    const dist = Math.hypot(state.thief.x - px, state.thief.y - py);
    if (dist < THIEF.radius + 5) return true;
  }
  return false;
}

function stepGuard(state, guard, dt) {
  const speed = guard.mode === 'chase' ? GUARD.chaseSpeed : guard.mode === 'patrol' ? guard.def.speed : GUARD.investigateSpeed;
  let targetX = guard.targetX;
  let targetY = guard.targetY;
  if (guard.mode === 'patrol') {
    const waypoint = guard.def.waypoints[guard.waypointIndex];
    targetX = waypoint.x;
    targetY = waypoint.y;
    const dx = targetX - guard.x;
    const dy = targetY - guard.y;
    if (Math.hypot(dx, dy) < 6) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.def.waypoints.length;
      return;
    }
  }
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) {
    if (guard.mode !== 'patrol') {
      guard.timer -= dt;
      if (guard.timer <= 0) {
        guard.mode = 'patrol';
        guard.targetX = guard.def.waypoints[guard.waypointIndex].x;
        guard.targetY = guard.def.waypoints[guard.waypointIndex].y;
      }
    }
    return;
  }
  const step = Math.min(distance, speed * dt);
  const moved = slideMove(state, guard.x, guard.y, (dx / distance) * step, (dy / distance) * step, GUARD.radius, true);
  guard.angle = Math.atan2(moved.y - guard.y, moved.x - guard.x);
  guard.x = moved.x;
  guard.y = moved.y;
}

function nearestGuard(state, x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    const distance = Math.hypot(guard.x - x, guard.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = guard;
    }
  }
  return best;
}

// Spend a held tool. Returns true when something actually happened.
export function useSelectedTool(state, clickX, clickY) {
  const name = state.selectedTool;
  if (state.tools[name] <= 0) {
    state.beltFlashUntil = state.time + 0.6;
    return false;
  }
  if (name === 'smoke') {
    state.tools.smoke -= 1;
    state.smokes.push({ x: state.thief.x, y: state.thief.y, until: state.time + TOOLS.smoke.duration });
    return true;
  }
  if (name === 'emp') {
    state.tools.emp -= 1;
    state.empUntil = state.time + TOOLS.emp.duration;
    for (let i = 0; i < state.cameras.length; i += 1) state.cameras[i].disabledUntil = state.empUntil;
    return true;
  }
  if (clickX === undefined || clickY === undefined) {
    state.beltFlashUntil = state.time + 0.6;
    return false;
  }
  state.tools.decoy -= 1;
  state.decoy = { x: clickX, y: clickY, until: state.time + TOOLS.decoy.duration };
  const guard = nearestGuard(state, clickX, clickY);
  if (guard) {
    guard.mode = 'investigate';
    guard.targetX = clickX;
    guard.targetY = clickY;
    guard.timer = TOOLS.decoy.duration;
  }
  return true;
}

// Buy one more of the selected tool with score.
export function buySelectedTool(state) {
  const name = state.selectedTool;
  const cost = TOOLS[name].cost;
  if (state.totalScore < cost) {
    state.beltFlashUntil = state.time + 0.6;
    return false;
  }
  state.totalScore -= cost;
  state.tools[name] += 1;
  return true;
}

// One fixed step of live play. input: { dx, dy, sneak, click, useTool, select, buy }.
export function stepRoom(state, dt, input) {
  let events = EVENT_NONE;
  state.time += dt;
  state.smokes = state.smokes.filter((cloud) => state.time < cloud.until);
  if (state.decoy && state.time >= state.decoy.until) state.decoy = null;
  if (input.select) state.selectedTool = input.select;
  if (input.buy) buySelectedTool(state);

  const thief = state.thief;
  let moveX = input.dx || 0;
  let moveY = input.dy || 0;
  if (moveX === 0 && moveY === 0 && thief.walkTarget) {
    const dx = thief.walkTarget.x - thief.x;
    const dy = thief.walkTarget.y - thief.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) {
      thief.walkTarget = null;
    } else {
      moveX = dx / distance;
      moveY = dy / distance;
    }
  }
  if (input.click) {
    if (state.selectedTool === 'decoy') {
      if (useSelectedTool(state, input.click.x, input.click.y)) events |= EVENT_TOOL;
    } else {
      thief.walkTarget = { x: input.click.x, y: input.click.y };
    }
  }
  if (input.useTool) {
    if (useSelectedTool(state)) events |= EVENT_TOOL;
  }
  thief.sneaking = !!input.sneak;
  const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
  const length = Math.hypot(moveX, moveY);
  thief.moving = length > 0;
  if (length > 0) {
    const moved = slideMove(state, thief.x, thief.y, (moveX / length) * speed * dt, (moveY / length) * speed * dt, THIEF.radius, false);
    thief.angle = Math.atan2(moved.y - thief.y, moved.x - thief.x);
    thief.x = moved.x;
    thief.y = moved.y;
  }

  // Cameras sweep.
  for (let i = 0; i < state.cameras.length; i += 1) {
    const camera = state.cameras[i];
    camera.angle = camera.def.baseAngle + Math.sin(state.time * camera.def.speed) * (camera.def.arc / 2);
  }

  // Vision and the alarm meter.
  const scan = scanWatchers(state);
  state.seenNow = scan.seen;
  const inShadow = insideShadow(state, thief.x, thief.y);
  if (scan.seen) {
    let rate = scan.rate;
    if (thief.sneaking) rate *= ALARM.sneakMultiplier;
    if (inShadow) rate *= ALARM.shadowMultiplier;
    state.alarm = Math.min(ALARM.caughtAt, state.alarm + rate * dt);
    state.lastSeen = { x: thief.x, y: thief.y };
  } else {
    const fall = inShadow ? ALARM.shadowFallRate : ALARM.fallRate;
    state.alarm = Math.max(0, state.alarm - fall * dt);
  }
  state.laserHit = thiefTouchesLaser(state);
  if (state.laserHit) state.alarm = Math.min(ALARM.caughtAt, state.alarm + ALARM.laserRate * dt);
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);

  // Guard reactions to the alarm stage.
  const stage = alarmStage(state.alarm);
  if (stage === 'Suspicious' && state.lastSeen) {
    const guard = nearestGuard(state, state.lastSeen.x, state.lastSeen.y);
    if (guard && guard.mode === 'patrol') {
      guard.mode = 'investigate';
      guard.targetX = state.lastSeen.x;
      guard.targetY = state.lastSeen.y;
      guard.timer = 4;
    }
  }
  if (stage === 'Alert') {
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      if (guard.mode !== 'chase') {
        guard.mode = 'chase';
        guard.targetX = thief.x;
        guard.targetY = thief.y;
        guard.timer = 2;
      } else {
        guard.targetX = thief.x;
        guard.targetY = thief.y;
        guard.timer = 2;
      }
    }
  }
  for (let i = 0; i < state.guards.length; i += 1) stepGuard(state, state.guards[i], dt);
  if (stage === 'Calm') {
    for (let i = 0; i < state.guards.length; i += 1) {
      const guard = state.guards[i];
      if (guard.mode === 'chase') guard.mode = 'patrol';
    }
  }

  // Loot pickup.
  for (let i = 0; i < state.loot.length; i += 1) {
    const piece = state.loot[i];
    if (piece.taken) continue;
    if (Math.hypot(thief.x - piece.x, thief.y - piece.y) < THIEF.pickupRadius) {
      piece.taken = true;
      state.lootTaken += 1;
      state.roomScore += piece.value;
      state.totalScore += piece.value;
      if (piece.main) state.exitUnlocked = true;
      events |= EVENT_LOOT;
    }
  }

  // The exit, once the main loot has unlocked it.
  if (state.exitUnlocked) {
    const exit = state.level.exit;
    if (thief.x >= exit.x && thief.x <= exit.x + exit.w && thief.y >= exit.y && thief.y <= exit.y + exit.h) {
      const lootPoints = state.roomScore;
      const timeBonus = Math.max(0, Math.min(TIME_BONUS_CAP, TIME_BONUS_CAP - Math.floor(state.time) * TIME_BONUS_PER_SECOND));
      const ghostBonus = state.maxAlarm < ALARM.ghostBelow ? GHOST_BONUS : 0;
      state.totalScore += timeBonus + ghostBonus;
      state.breakdown = { lootPoints, timeBonus, ghostBonus, roomTotal: lootPoints + timeBonus + ghostBonus, time: state.time };
      events |= EVENT_ROOM_DONE;
    }
  }

  if (state.alarm >= ALARM.caughtAt) events |= EVENT_CAUGHT;
  return events;
}

// Ambient motion for the title screen: guards patrol, cameras sweep, no thief,
// no alarm, no loot. The room stays alive behind the panel.
export function stepAmbient(state, dt) {
  state.time += dt;
  for (let i = 0; i < state.cameras.length; i += 1) {
    const camera = state.cameras[i];
    camera.angle = camera.def.baseAngle + Math.sin(state.time * camera.def.speed) * (camera.def.arc / 2);
  }
  for (let i = 0; i < state.guards.length; i += 1) stepGuard(state, state.guards[i], dt);
}
