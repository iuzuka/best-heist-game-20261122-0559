// The Midnight Gallery — all drawing: floor, walls, cases, ropes, shadows,
// vision cones, cameras, loot, thief, guards, exit, the HUD and the panels.
import { ALARM, CAMERA, FIELD, GUARD, PALETTE, THIEF, TOOLS } from './config.js';
import { alarmStage, laserIsLive } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ROOM_DONE = 'roomdone';
export const SCREEN_COMPLETE = 'complete';

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRect(ctx, rect, fill, edge, edgeWidth) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = edgeWidth || 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function centredText(ctx, text, x, y, size, colour, bold) {
  ctx.fillStyle = colour;
  ctx.font = `${bold ? 'bold ' : ''}${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function leftText(ctx, text, x, y, size, colour, bold) {
  ctx.fillStyle = colour;
  ctx.font = `${bold ? 'bold ' : ''}${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// The room itself: floor, shadow halls, cases, ropes, walls, lasers, exit.
function drawRoom(ctx, state, time) {
  const level = state.level;
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const tile = 80;
  for (let y = 0; y < FIELD.height / tile; y += 1) {
    for (let x = 0; x < FIELD.width / tile; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  ctx.strokeStyle = PALETTE.floorTrim;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;
  for (let x = 0; x <= FIELD.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= FIELD.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < level.shadows.length; i += 1) {
    const zone = level.shadows[i];
    drawRect(ctx, zone, PALETTE.shadowZone, PALETTE.shadowEdge, 1);
    ctx.fillStyle = PALETTE.shadowEdge;
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + 18);
  }

  for (let i = 0; i < level.cases.length; i += 1) {
    drawRect(ctx, level.cases[i], PALETTE.caseFill, PALETTE.caseEdge, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(level.cases[i].x + 8, level.cases[i].y + level.cases[i].h - 8);
    ctx.lineTo(level.cases[i].x + 34, level.cases[i].y + 8);
    ctx.lineTo(level.cases[i].x + 46, level.cases[i].y + 8);
    ctx.lineTo(level.cases[i].x + 20, level.cases[i].y + level.cases[i].h - 8);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < level.ropes.length; i += 1) {
    const rope = level.ropes[i];
    ctx.strokeStyle = PALETTE.rope;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rope.x, rope.y + rope.h / 2);
    ctx.lineTo(rope.x + rope.w, rope.y + rope.h / 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.post;
    ctx.beginPath();
    ctx.arc(rope.x, rope.y + rope.h / 2, 4, 0, Math.PI * 2);
    ctx.arc(rope.x + rope.w, rope.y + rope.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // The exit doorway glows green once the main loot is taken.
  const exit = level.exit;
  const exitOpen = state.exitUnlocked;
  ctx.fillStyle = exitOpen ? PALETTE.exitGlow : 'rgba(46, 204, 113, 0.12)';
  ctx.fillRect(exit.x - 6, exit.y, exit.w + 12, exit.h + 26);
  drawRect(ctx, exit, exitOpen ? '#1e8449' : '#145a32', PALETTE.exitDoor, 2);
  ctx.fillStyle = PALETTE.exitDoor;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(exit.label, exit.x + exit.w / 2, exit.y + exit.h + 13);
  if (exitOpen) {
    const bob = Math.sin(time * 4) * 4;
    ctx.beginPath();
    ctx.moveTo(exit.x + exit.w / 2 - 10, exit.y + exit.h - 12 + bob);
    ctx.lineTo(exit.x + exit.w / 2 + 10, exit.y + exit.h - 12 + bob);
    ctx.lineTo(exit.x + exit.w / 2, exit.y + exit.h + 2 + bob);
    ctx.closePath();
    ctx.fill();
  }

  // Laser grid: live beams burn red, dark beams are a faint threat.
  for (let i = 0; i < level.lasers.length; i += 1) {
    const beam = level.lasers[i];
    const live = laserIsLive(beam, state.time);
    ctx.strokeStyle = live ? PALETTE.laserLive : PALETTE.laserOff;
    ctx.lineWidth = live ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    if (live) {
      ctx.fillStyle = PALETTE.laserLive;
      ctx.beginPath();
      ctx.arc(beam.x1, beam.y1, 5, 0, Math.PI * 2);
      ctx.arc(beam.x2, beam.y2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < level.walls.length; i += 1) {
    drawRect(ctx, level.walls[i], PALETTE.wall, PALETTE.wallEdge, 2);
  }
}

function drawLoot(ctx, state, time) {
  for (let i = 0; i < state.loot.length; i += 1) {
    const piece = state.loot[i];
    if (piece.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(time * 3 + i);
    const glow = 26 + 8 * pulse;
    ctx.fillStyle = PALETTE.lootGlow;
    ctx.beginPath();
    ctx.arc(piece.x, piece.y, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lootGold;
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 2;
    if (piece.kind === 'star' || piece.kind === 'orchid') {
      // A four-point star for the big scores.
      ctx.beginPath();
      for (let k = 0; k < 8; k += 1) {
        const angle = (k * Math.PI) / 4 - Math.PI / 2;
        const radius = k % 2 === 0 ? 18 : 8;
        const px = piece.x + Math.cos(angle) * radius;
        const py = piece.y + Math.sin(angle) * radius;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (piece.kind === 'painting') {
      ctx.fillRect(piece.x - 16, piece.y - 12, 32, 24);
      ctx.strokeRect(piece.x - 16, piece.y - 12, 32, 24);
      ctx.fillStyle = '#7d5ba6';
      ctx.fillRect(piece.x - 11, piece.y - 7, 22, 14);
    } else if (piece.kind === 'goldBar') {
      ctx.beginPath();
      ctx.moveTo(piece.x - 14, piece.y + 7);
      ctx.lineTo(piece.x - 9, piece.y - 7);
      ctx.lineTo(piece.x + 9, piece.y - 7);
      ctx.lineTo(piece.x + 14, piece.y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(piece.x - 6, piece.y, 7, 0, Math.PI * 2);
      ctx.arc(piece.x + 6, piece.y, 7, 0, Math.PI * 2);
      ctx.arc(piece.x, piece.y - 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#3a2c05';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(piece.name, piece.x, piece.y + 34);
  }
}

function drawWatcher(ctx, state) {
  for (let i = 0; i < state.cameras.length; i += 1) {
    const camera = state.cameras[i];
    const disabled = state.time < camera.disabledUntil;
    if (!disabled) {
      drawCone(ctx, camera.def.x, camera.def.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, PALETTE.cameraCone, PALETTE.cameraConeEdge);
    }
    ctx.fillStyle = disabled ? '#555' : '#f5b041';
    ctx.beginPath();
    ctx.arc(camera.def.x, camera.def.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = disabled ? '#888' : '#1a1a1a';
    ctx.beginPath();
    ctx.arc(camera.def.x + Math.cos(camera.angle) * 5, camera.def.y + Math.sin(camera.angle) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    const range = guard.def.elite ? GUARD.eliteConeRange : GUARD.coneRange;
    const half = guard.def.elite ? GUARD.eliteConeHalfAngle : GUARD.coneHalfAngle;
    drawCone(ctx, guard.x, guard.y, guard.angle, range, half, PALETTE.guardCone, PALETTE.guardConeEdge);
  }
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    ctx.fillStyle = guard.def.elite ? '#4a235a' : PALETTE.guardUniform;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.def.elite ? '#f5b041' : PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 7), guard.y + Math.sin(guard.angle) * (GUARD.radius + 7));
    ctx.stroke();
    if (guard.mode === 'investigate' || guard.mode === 'chase') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(guard.mode === 'chase' ? '!' : '?', guard.x, guard.y - GUARD.radius - 8);
    }
  }
}

function drawThief(ctx, state) {
  const thief = state.thief;
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(45, 212, 191, 0.18)';
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, THIEF.radius + 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.thiefCloth;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point and facing tick.
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.moveTo(thief.x + Math.cos(thief.angle) * (THIEF.radius + 6), thief.y + Math.sin(thief.angle) * (THIEF.radius + 6));
  ctx.lineTo(thief.x + Math.cos(thief.angle + 2.6) * THIEF.radius, thief.y + Math.sin(thief.angle + 2.6) * THIEF.radius);
  ctx.lineTo(thief.x + Math.cos(thief.angle - 2.6) * THIEF.radius, thief.y + Math.sin(thief.angle - 2.6) * THIEF.radius);
  ctx.closePath();
  ctx.fill();
  if (thief.walkTarget) {
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(thief.walkTarget.x, thief.walkTarget.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSmokeAndDecoy(ctx, state) {
  for (let i = 0; i < state.smokes.length; i += 1) {
    const cloud = state.smokes[i];
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(cloud.x - 14, cloud.y - 6, 24, 0, Math.PI * 2);
    ctx.arc(cloud.x + 14, cloud.y - 4, 26, 0, Math.PI * 2);
    ctx.arc(cloud.x, cloud.y + 12, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.decoy) {
    ctx.fillStyle = PALETTE.lootGold;
    ctx.beginPath();
    ctx.arc(state.decoy.x, state.decoy.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.decoy.x, state.decoy.y, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The HUD: alarm bar top centre, score top left, room and time top right,
// tool belt along the bottom, one hint line bottom left.
function drawHud(ctx, state) {
  const stage = alarmStage(state.alarm);
  const barX = FIELD.width / 2 - 170;
  const barY = 14;
  const barW = 340;
  const barH = 18;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(barX - 8, barY - 8, barW + 16, barH + 34);
  const colour = stage === 'Calm' ? PALETTE.calm : stage === 'Suspicious' ? PALETTE.suspicious : PALETTE.alert;
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = colour;
  ctx.fillRect(barX, barY, (barW * state.alarm) / 100, barH);
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  centredText(ctx, `ALARM ${Math.round(state.alarm)} — ${stage.toUpperCase()}`, FIELD.width / 2, barY + barH + 13, 13, colour, true);

  // Score and loot sit right of the exit doorway so they never cover it.
  leftText(ctx, `SCORE ${state.totalScore}`, 170, 26, 18, PALETTE.text, true);
  leftText(ctx, `LOOT ${state.lootTaken}/${state.loot.length}${state.exitUnlocked ? '  ·  EXIT OPEN' : ''}`, 170, 50, 14, state.exitUnlocked ? PALETTE.exitDoor : PALETTE.dimText, false);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(state.level.name, FIELD.width - 30, 26);
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(`TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, FIELD.width - 30, 50);
  ctx.textAlign = 'left';

  const beltY = FIELD.height - 34;
  const flash = state.time < state.beltFlashUntil;
  ctx.fillStyle = flash ? 'rgba(231, 76, 60, 0.35)' : 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(FIELD.width / 2 - 330, beltY - 16, 660, 32);
  const names = ['smoke', 'emp', 'decoy'];
  let beltX = FIELD.width / 2 - 310;
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    const tool = TOOLS[name];
    const selected = state.selectedTool === name;
    const label = `[${tool.key}] ${tool.name} x${state.tools[name]} ($${tool.cost})`;
    ctx.font = `${selected ? 'bold ' : ''}15px Georgia, serif`;
    ctx.fillStyle = selected ? PALETTE.lootGold : PALETTE.text;
    ctx.fillText(label, beltX, beltY);
    beltX += ctx.measureText(label).width + 34;
  }
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText('[Space] use  ·  [B] buy selected  ·  [P] pause  ·  [R] restart', beltX, beltY);

  leftText(ctx, state.level.hint, 30, FIELD.height - 18, 14, PALETTE.dimText, false);
}

export function drawWorld(ctx, state) {
  drawRoom(ctx, state, state.time);
  drawLoot(ctx, state, state.time);
  drawWatcher(ctx, state);
  drawSmokeAndDecoy(ctx, state);
  drawThief(ctx, state);
  drawHud(ctx, state);
}

// Panels drawn over the live room.
export function drawScreen(ctx, screen, state, best) {
  if (screen === SCREEN_PLAY) {
    drawWorld(ctx, state);
    return;
  }
  drawWorld(ctx, state);
  if (screen === SCREEN_TITLE) {
    panel(ctx, 340, 170, 600, 380);
    centredText(ctx, 'THE MIDNIGHT GALLERY', 640, 220, 40, PALETTE.lootGold, true);
    centredText(ctx, 'A stealth heist in three rooms', 640, 262, 18, PALETTE.text, false);
    centredText(ctx, 'Steal the Aurum Star. Dodge the cones.', 640, 300, 16, PALETTE.dimText, false);
    centredText(ctx, 'Reach the green exit before the alarm fills.', 640, 326, 16, PALETTE.dimText, false);
    centredText(ctx, 'WASD / arrows — move    Shift — sneak', 640, 372, 15, PALETTE.text, false);
    centredText(ctx, 'Click floor — walk there    1/2/3 — tools    Space — use tool', 640, 400, 15, PALETTE.text, false);
    centredText(ctx, 'P — pause    R — restart    M — mute', 640, 428, 15, PALETTE.text, false);
    if (best > 0) centredText(ctx, `Best heist total: ${best}`, 640, 466, 16, PALETTE.lootGold, true);
    centredText(ctx, 'Click or press Enter to begin', 640, 510, 17, PALETTE.text, true);
  } else if (screen === SCREEN_PAUSE) {
    panel(ctx, 440, 250, 400, 180);
    centredText(ctx, 'PAUSED', 640, 300, 34, PALETTE.text, true);
    centredText(ctx, 'P to resume · R to restart the room', 640, 348, 16, PALETTE.dimText, false);
    centredText(ctx, 'M to mute', 640, 378, 16, PALETTE.dimText, false);
  } else if (screen === SCREEN_CAUGHT) {
    panel(ctx, 390, 230, 500, 240);
    centredText(ctx, 'CAUGHT!', 640, 280, 40, PALETTE.alert, true);
    centredText(ctx, 'The alarm hit 100 and the guards closed in.', 640, 324, 16, PALETTE.text, false);
    centredText(ctx, `Score so far: ${state.totalScore}`, 640, 360, 18, PALETTE.lootGold, true);
    centredText(ctx, 'Press R to retry the room — Space to continue', 640, 406, 15, PALETTE.dimText, false);
  } else if (screen === SCREEN_ROOM_DONE) {
    const breakdown = state.breakdown || { lootPoints: 0, timeBonus: 0, ghostBonus: 0, roomTotal: 0, time: 0 };
    panel(ctx, 390, 190, 500, 320);
    centredText(ctx, `${state.level.name} — CLEARED!`, 640, 236, 30, PALETTE.exitDoor, true);
    centredText(ctx, `Loot: ${breakdown.lootPoints}`, 640, 290, 18, PALETTE.text, false);
    centredText(ctx, `Time bonus: ${breakdown.timeBonus}`, 640, 322, 18, PALETTE.text, false);
    centredText(ctx, `Ghost bonus: ${breakdown.ghostBonus}${breakdown.ghostBonus > 0 ? ' — never spotted!' : ' — the alarm rose'}`, 640, 354, 18, PALETTE.text, false);
    centredText(ctx, `Room total: ${breakdown.roomTotal}`, 640, 392, 20, PALETTE.lootGold, true);
    centredText(ctx, `Heist total: ${state.totalScore}`, 640, 424, 18, PALETTE.text, false);
    centredText(ctx, 'Press Space or click for the next room', 640, 470, 15, PALETTE.dimText, false);
  } else if (screen === SCREEN_COMPLETE) {
    panel(ctx, 340, 190, 600, 330);
    centredText(ctx, 'THE HEIST IS DONE!', 640, 240, 36, PALETTE.lootGold, true);
    centredText(ctx, 'Three rooms, one clean getaway.', 640, 288, 18, PALETTE.text, false);
    centredText(ctx, `Final total: ${state.totalScore}`, 640, 334, 24, PALETTE.text, true);
    if (best > 0) centredText(ctx, `Best total: ${best}`, 640, 372, 18, PALETTE.lootGold, false);
    centredText(ctx, 'Press R to run it all again', 640, 428, 16, PALETTE.dimText, false);
    centredText(ctx, 'Click or press Space to play again', 640, 462, 16, PALETTE.dimText, false);
  }
}
