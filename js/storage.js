// storage.js — persisted progress
const KEY = 'sunny-movers-v1';

const defaults = () => ({ unlocked: 1, stars: {}, best: {}, sound: true, seenHelp: false });

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch { return defaults(); }
}

export function persist(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {}
}
