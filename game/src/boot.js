// The Midnight Gallery — the boot file: the fixed-step game loop, the
// screens, the shot staging, and the ready flag the screenshot helper waits
// for. Reads the shot name and seed from the page URL.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { LEVELS } from './levels.js';
import {
  EVENT_CAUGHT,
  EVENT_LOOT,
  EVENT_ROOM_DONE,
  EVENT_TOOL,
  buySelectedTool,
  newRoomState,
  stepAmbient,
  stepRoom,
  useSelectedTool,
} from './world.js';
import {
  SCREEN_CAUGHT,
  SCREEN_COMPLETE,
  SCREEN_PAUSE,
  SCREEN_PLAY,
  SCREEN_ROOM_DONE,
  SCREEN_TITLE,
  drawScreen,
} from './render.js';
import {
  attachInput,
  createInput,
  heldMove,
  isConfirm,
  isSneaking,
  takeClicks,
  takePressed,
  toolForKey,
} from './input.js';
import {
  createSound,
  playCaughtSting,
  playFootstep,
  playLootChime,
  playRoomJingle,
  playToolSound,
  stopAlarmTone,
  toggleMute,
  unlockSound,
  updateAlarmTone,
} from './audio.js';
import { freshShotState, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7') || 7;

const input = createInput();
attachInput(input, canvas);
const sound = createSound();

const game = {
  roomIndex: 0,
  state: null,
  screen: SCREEN_TITLE,
  totalScore: 0,
  best: 0,
};

try {
  game.best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
} catch {
  game.best = 0;
}

function saveBest() {
  try {
    window.localStorage.setItem(BEST_KEY, String(game.best));
  } catch {
    // Best score is a nicety, never a breaker.
  }
}

function loadRoom(index) {
  game.roomIndex = index;
  game.state = newRoomState(LEVELS[index], game.totalScore);
  game.screen = SCREEN_PLAY;
}

function startRun() {
  game.totalScore = 0;
  loadRoom(0);
  updateStatus('The heist begins in the Foyer.');
}

function restartRoom() {
  // The retry keeps the total from earlier rooms; this room starts over.
  game.totalScore = game.state ? game.state.totalBefore : game.totalScore;
  loadRoom(game.roomIndex);
}

function updateStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

// One frame of input handling for the current screen.
function handleInput() {
  const pressed = takePressed(input);
  const clicks = takeClicks(input);
  for (let i = 0; i < pressed.length; i += 1) {
    const code = pressed[i];
    unlockSound(sound);
    if (code === 'KeyM') {
      toggleMute(sound);
      continue;
    }
    if (game.screen === SCREEN_TITLE) {
      if (isConfirm(code)) startRun();
      continue;
    }
    if (game.screen === SCREEN_PAUSE) {
      if (code === 'KeyP') game.screen = SCREEN_PLAY;
      if (code === 'KeyR') restartRoom();
      continue;
    }
    if (game.screen === SCREEN_CAUGHT) {
      if (code === 'KeyR') restartRoom();
      if (isConfirm(code)) restartRoom();
      continue;
    }
    if (game.screen === SCREEN_ROOM_DONE) {
      if (isConfirm(code)) advanceRoom();
      continue;
    }
    if (game.screen === SCREEN_COMPLETE) {
      if (code === 'KeyR' || isConfirm(code)) startRun();
      continue;
    }
    if (game.screen !== SCREEN_PLAY) continue;
    if (code === 'KeyP') {
      game.screen = SCREEN_PAUSE;
      continue;
    }
    if (code === 'KeyR') {
      restartRoom();
      continue;
    }
    const tool = toolForKey(code);
    if (tool) {
      game.state.selectedTool = tool;
      continue;
    }
    if (code === 'KeyB') {
      buySelectedTool(game.state);
      continue;
    }
    if (code === 'Space') {
      if (useSelectedTool(game.state)) {
        playToolSound(sound);
      }
    }
  }
  for (let i = 0; i < clicks.length; i += 1) {
    unlockSound(sound);
    const click = clicks[i];
    if (game.screen === SCREEN_TITLE) {
      startRun();
    } else if (game.screen === SCREEN_PAUSE) {
      game.screen = SCREEN_PLAY;
    } else if (game.screen === SCREEN_CAUGHT) {
      restartRoom();
    } else if (game.screen === SCREEN_ROOM_DONE) {
      advanceRoom();
    } else if (game.screen === SCREEN_COMPLETE) {
      startRun();
    } else if (game.screen === SCREEN_PLAY) {
      if (game.state.selectedTool === 'decoy') {
        if (useSelectedTool(game.state, click.x, click.y)) playToolSound(sound);
      } else {
        game.state.thief.walkTarget = { x: click.x, y: click.y };
      }
    }
  }
}

// After a room is cleared: next room, or the heist-complete screen.
function advanceRoom() {
  if (game.roomIndex + 1 >= LEVELS.length) {
    game.screen = SCREEN_COMPLETE;
    if (game.totalScore > game.best) {
      game.best = game.totalScore;
      saveBest();
    }
    updateStatus('Heist complete.');
    return;
  }
  loadRoom(game.roomIndex + 1);
}

// One fixed step of live play, with sound and screen changes.
function stepPlay() {
  const move = heldMove(input);
  const events = stepRoom(game.state, STEP, {
    dx: move.dx,
    dy: move.dy,
    sneak: isSneaking(input),
    click: null,
    useTool: false,
    select: null,
    buy: false,
  });
  game.totalScore = game.state.totalScore;
  if (game.state.thief.moving) {
    sound.stepTimer -= STEP;
    if (sound.stepTimer <= 0) {
      playFootstep(sound);
      sound.stepTimer = 0.32;
    }
  }
  updateAlarmTone(sound, game.state.alarm, game.state.seenNow);
  if (events & EVENT_LOOT) {
    playLootChime(sound);
    updateStatus(`Loot taken. Score ${game.totalScore}.`);
  }
  if (events & EVENT_TOOL) playToolSound(sound);
  if (events & EVENT_ROOM_DONE) {
    stopAlarmTone(sound);
    playRoomJingle(sound);
    game.screen = SCREEN_ROOM_DONE;
    updateStatus(`${game.state.level.name} cleared.`);
  }
  if (events & EVENT_CAUGHT) {
    stopAlarmTone(sound);
    playCaughtSting(sound);
    game.screen = SCREEN_CAUGHT;
    updateStatus('Caught. The alarm hit 100.');
  }
}

let accumulator = 0;
let lastTime = 0;

function frame(time) {
  requestAnimationFrame(frame);
  if (!lastTime) lastTime = time;
  let delta = (time - lastTime) / 1000;
  lastTime = time;
  if (delta > 0.25) delta = 0.25;
  handleInput();
  accumulator += delta;
  while (accumulator >= STEP) {
    accumulator -= STEP;
    if (game.screen === SCREEN_TITLE) {
      stepAmbient(game.state, STEP);
    } else if (game.screen === SCREEN_PLAY) {
      stepPlay();
    }
  }
  drawScreen(ctx, game.screen, game.state, game.best);
}

// A shot URL stages a scene, paints it twice, then flags ready.
function stageFromUrl() {
  if (!shotName) return false;
  const state = freshShotState(seed);
  const staged = stageShot(shotName, state);
  game.state = staged.state;
  game.roomIndex = 0;
  game.totalScore = staged.state.totalScore;
  game.screen = staged.screen;
  game.best = 0;
  drawScreen(ctx, game.screen, game.state, game.best);
  drawScreen(ctx, game.screen, game.state, game.best);
  window.__shotReady = true;
  return true;
}

game.state = newRoomState(LEVELS[0], 0);
game.screen = SCREEN_TITLE;
window.__game = game;
if (!stageFromUrl()) {
  requestAnimationFrame(frame);
}

