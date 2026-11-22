// Tiny procedural sounds: Web Audio bleeps only, no sound files.
// Every call is guarded so a missing audio context never breaks the game.
export function createSound() {
  return { context: null, muted: false, alarmOscillator: null, alarmGain: null, stepTimer: 0 };
}

function ensureContext(sound) {
  if (sound.context) return sound.context;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    sound.context = new AudioContextClass();
  } catch {
    sound.context = null;
  }
  return sound.context;
}

export function unlockSound(sound) {
  const context = ensureContext(sound);
  if (context && context.state === 'suspended') {
    context.resume().catch(() => {});
  }
}

export function toggleMute(sound) {
  sound.muted = !sound.muted;
  if (sound.muted) stopAlarmTone(sound);
  return sound.muted;
}

function playTone(sound, frequency, duration, type, volume, slideTo) {
  if (sound.muted) return;
  const context = ensureContext(sound);
  if (!context) return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + duration);
    gain.gain.setValueAtTime(volume || 0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch {
    // Sound never breaks the game.
  }
}

export function playFootstep(sound) {
  playTone(sound, 140, 0.05, 'triangle', 0.03);
}

export function playLootChime(sound) {
  playTone(sound, 880, 0.18, 'sine', 0.09);
  playTone(sound, 1318, 0.22, 'sine', 0.06);
}

export function playToolSound(sound) {
  playTone(sound, 520, 0.12, 'square', 0.05, 260);
}

export function playCaughtSting(sound) {
  playTone(sound, 220, 0.5, 'sawtooth', 0.1, 55);
}

export function playRoomJingle(sound) {
  playTone(sound, 523, 0.14, 'sine', 0.09);
  setTimeout(() => playTone(sound, 659, 0.14, 'sine', 0.09), 130);
  setTimeout(() => playTone(sound, 784, 0.26, 'sine', 0.09), 260);
}

// A rising tone while the alarm climbs; call every frame with the alarm value.
export function updateAlarmTone(sound, alarm, seen) {
  if (sound.muted || !seen) {
    stopAlarmTone(sound);
    return;
  }
  const context = ensureContext(sound);
  if (!context) return;
  try {
    if (!sound.alarmOscillator) {
      sound.alarmOscillator = context.createOscillator();
      sound.alarmGain = context.createGain();
      sound.alarmOscillator.type = 'sine';
      sound.alarmGain.gain.setValueAtTime(0.02, context.currentTime);
      sound.alarmOscillator.connect(sound.alarmGain);
      sound.alarmGain.connect(context.destination);
      sound.alarmOscillator.start();
    }
    sound.alarmOscillator.frequency.setValueAtTime(180 + alarm * 4, context.currentTime);
  } catch {
    // Sound never breaks the game.
  }
}

export function stopAlarmTone(sound) {
  if (!sound.alarmOscillator) return;
  try {
    sound.alarmOscillator.stop();
  } catch {
    // Already stopped.
  }
  sound.alarmOscillator = null;
  sound.alarmGain = null;
}
