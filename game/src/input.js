// Keyboard and mouse: which keys are held, and the one-shot actions each
// press or click produces (confirm, pause, tool select, tool use, restart, mute).
export function createInput() {
  return {
    held: new Set(),
    pressed: [],
    clicks: [],
    mouse: { x: 0, y: 0 },
  };
}

const MOVE_KEYS = {
  ArrowUp: { dx: 0, dy: -1 },
  KeyW: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  KeyS: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  KeyA: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  KeyD: { dx: 1, dy: 0 },
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.push(event.code);
    input.held.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.held.delete(event.code);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.clicks.push({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    });
    input.mouse.x = (event.clientX - rect.left) * scaleX;
    input.mouse.y = (event.clientY - rect.top) * scaleY;
  });
  window.addEventListener('blur', () => input.held.clear());
}

// The held movement direction this frame, normalised.
export function heldMove(input) {
  let dx = 0;
  let dy = 0;
  for (const code of input.held) {
    const move = MOVE_KEYS[code];
    if (move) {
      dx += move.dx;
      dy += move.dy;
    }
  }
  const length = Math.hypot(dx, dy);
  if (length === 0) return { dx: 0, dy: 0 };
  return { dx: dx / length, dy: dy / length };
}

export function isSneaking(input) {
  return input.held.has('ShiftLeft') || input.held.has('ShiftRight');
}

// Take the one-shot presses since the last frame; the caller owns the list.
export function takePressed(input) {
  const pressed = input.pressed;
  input.pressed = [];
  return pressed;
}

// Take the clicks since the last frame; the caller owns the list.
export function takeClicks(input) {
  const clicks = input.clicks;
  input.clicks = [];
  return clicks;
}

// Which tool a number key selects, if any.
export function toolForKey(code) {
  if (code === 'Digit1') return 'smoke';
  if (code === 'Digit2') return 'emp';
  if (code === 'Digit3') return 'decoy';
  return null;
}

// True when the press starts something from a panel screen.
export function isConfirm(code) {
  return code === 'Space' || code === 'Enter' || code === 'NumpadEnter';
}
