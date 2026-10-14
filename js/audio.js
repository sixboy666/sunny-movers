// audio.js — tiny WebAudio synth, no assets
let ctx = null, master = null, engine = null;
let muted = false;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05);
}
export function isMuted() { return muted; }

function env(g, t0, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone(type, f0, f1, dur, peak = 0.3, when = 0) {
  const c = ac(), t0 = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  env(g, t0, 0.008, peak, dur);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + dur + 0.1);
}

function noise(dur, peak = 0.15, freq = 900, when = 0) {
  const c = ac(), t0 = c.currentTime + when;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = peak;
  s.connect(f).connect(g).connect(master);
  s.start(t0);
}

export const sfx = {
  click()   { tone('triangle', 660, 660, 0.06, 0.12); },
  select()  { tone('triangle', 520, 700, 0.08, 0.14); },
  place()   { tone('sine', 190, 60, 0.22, 0.5); noise(0.08, 0.1, 700); },
  undo()    { tone('sine', 300, 520, 0.14, 0.18); },
  deny()    { tone('square', 220, 180, 0.1, 0.08); },
  go()      { [392, 523, 659].forEach((f, i) => tone('triangle', f, f, 0.12, 0.16, i * 0.07)); },
  bump()    { tone('sine', 120, 70, 0.12, 0.22); },
  deliver() { tone('triangle', 523, 523, 0.1, 0.2); tone('triangle', 784, 784, 0.16, 0.2, 0.09); },
  star(i)   { tone('triangle', 620 + i * 160, 620 + i * 160, 0.14, 0.2); },
  complete(){ [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.18, i * 0.09)); },
};

// engine loop while driving
export function engineStart() {
  const c = ac();
  if (engine) return;
  const o1 = c.createOscillator(), o2 = c.createOscillator();
  const g = c.createGain(), f = c.createBiquadFilter();
  o1.type = 'sawtooth'; o2.type = 'sawtooth';
  o1.frequency.value = 58; o2.frequency.value = 61;
  f.type = 'lowpass'; f.frequency.value = 260;
  g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g).connect(master);
  o1.start(); o2.start();
  engine = { o1, o2, g, f };
}
export function engineSet(speed01) {
  if (!engine) return;
  const t = ctx.currentTime;
  engine.g.gain.setTargetAtTime(speed01 * 0.16, t, 0.1);
  engine.o1.frequency.setTargetAtTime(58 + speed01 * 60, t, 0.15);
  engine.o2.frequency.setTargetAtTime(61 + speed01 * 64, t, 0.15);
  engine.f.frequency.setTargetAtTime(260 + speed01 * 500, t, 0.15);
}
export function engineStop() {
  if (!engine) return;
  const { o1, o2, g } = engine;
  g.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
  setTimeout(() => { try { o1.stop(); o2.stop(); } catch {} }, 400);
  engine = null;
}
