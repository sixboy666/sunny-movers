// main.js — boot, state machine (load → drive → deliver), camera, animation loop
import * as THREE from 'three';
import { ORDERS } from './orders.js';
import { makeItem } from './items.js';
import { buildWorld } from './world.js';
import { buildTruck } from './truck.js';
import { createUI } from './ui.js';
import { sfx, engineStart, engineSet, engineStop, setMuted } from './audio.js';
import { loadSave, persist } from './storage.js';

const TOUCH = matchMedia('(pointer: coarse)').matches;
const MAX_DPR = TOUCH ? 1.6 : 2;
const ACCEL = 6, BRAKE = 8, VMAX = 9;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !TOUCH });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
let dprScale = 1, frameEMA = 16.7, lastAdjust = performance.now() + 800;
function applyDPR() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MAX_DPR) * dprScale);
}
applyDPR();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
const world = buildWorld(scene, TOUCH ? 'low' : 'high');
const truck = buildTruck();
scene.add(truck.group);

/* ---------- state ---------- */
const save = loadSave();
const S = {
  phase: 'load',
  orderIndex: Math.min(save.unlocked, ORDERS.length) - 1,
  itemsState: [],          // [{id,count,placed,delivered}]
  bays: [null, null, null, null, null, null],
  placedStack: [],
  selectedId: null,
  usedAuto: false,
  holding: false,
  speed: 0, driveT: 0, prevYaw: 0,
  bumpT: 1, bumpZones: [0.35, 0.6],
  deliveredCount: 0, deliveredDone: 0,
  orderStart: 0,
  timers: [],
  anims: [],
  porchMeshes: [],
};
let order = ORDERS[S.orderIndex];

/* ---------- temp objects (no hot-loop allocation) ---------- */
const _p = new THREE.Vector3(), _tan = new THREE.Vector3(), _off = new THREE.Vector3(),
      _camT = new THREE.Vector3(), _lookT = new THREE.Vector3(), _w = new THREE.Vector3();
const camPos = new THREE.Vector3(6, 4, 8), camLook = new THREE.Vector3();

/* ---------- flight blob shadows (small pool) ---------- */
const blobTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 3, 32, 32, 30);
  gr.addColorStop(0, 'rgba(51,64,58,0.3)');
  gr.addColorStop(1, 'rgba(51,64,58,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const flightBlobs = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  scene.add(m);
  flightBlobs.push(m);
}

/* ---------- easing / anim runner ---------- */
const easeIn = (k) => k * k;
const easeIO = (k) => k * k * (3 - 2 * k);
const easeBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function animate(dur, fn, done) { S.anims.push({ t: 0, dur, fn, done }); }
function stepAnims(dt) {
  for (let i = S.anims.length - 1; i >= 0; i--) {
    const a = S.anims[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    a.fn(k);
    if (k >= 1) { S.anims.splice(i, 1); a.done && a.done(); }
  }
}
function later(ms, fn) { S.timers.push(setTimeout(fn, ms)); }
function clearTimers() { for (const t of S.timers) clearTimeout(t); S.timers.length = 0; }

/* ---------- camera framing ---------- */
const bandTopEl = document.getElementById('band-top');
const sheetEl = document.getElementById('sheet');
function reframe() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  const top = bandTopEl.getBoundingClientRect().bottom;
  const bandH = sheetEl.getBoundingClientRect().top - top;
  if (bandH > 60) camera.setViewOffset(W, H, 0, top, W, bandH);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

function truckPose(t) {
  world.curve.getPointAt(t, _p);
  world.curve.getTangentAt(t, _tan);
  truck.group.position.copy(_p);
  truck.group.rotation.y = Math.atan2(_tan.x, _tan.z);
}

/* ---------- free 360° orbit camera ----------
   one-finger drag = rotate around the focus (full 360° azimuth + tilt)
   two-finger pinch / mouse wheel = zoom                              */
const orbit = { az: 0, azT: 0, el: 0, elT: 0, zoom: 1, zoomT: 1 };
const _sph = new THREE.Spherical();
const ORBIT_MIN_R = 2.4, ORBIT_MAX_R = 40;
function resetOrbit() {
  orbit.az = orbit.azT = 0;
  orbit.el = orbit.elT = 0;
  orbit.zoom = orbit.zoomT = 1;
}
{
  const ptrs = new Map();
  let pinchD0 = 0, pinchZ0 = 1;
  canvas.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinchD0 = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
      pinchZ0 = orbit.zoomT;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) {
      orbit.azT += dx * 0.0075;                                  // full 360°, no clamp
      orbit.elT = THREE.MathUtils.clamp(orbit.elT + dy * 0.004, -0.14, 0.5);
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
      orbit.zoomT = THREE.MathUtils.clamp(pinchZ0 * pinchD0 / d, 0.55, 1.9);
    }
  });
  const endPtr = (e) => { ptrs.delete(e.pointerId); };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.zoomT = THREE.MathUtils.clamp(orbit.zoomT * (e.deltaY > 0 ? 1.08 : 0.93), 0.55, 1.9);
  }, { passive: false });
}
function applyOrbit(dt) {
  const f = 1 - Math.exp(-10 * dt);
  orbit.az += (orbit.azT - orbit.az) * f;
  orbit.el += (orbit.elT - orbit.el) * f;
  orbit.zoom += (orbit.zoomT - orbit.zoom) * f;
  _sph.setFromVector3(_off.copy(_camT).sub(_lookT));
  _sph.theta -= orbit.az;
  _sph.phi = THREE.MathUtils.clamp(_sph.phi - orbit.el, 0.3, 1.42);
  _sph.radius = THREE.MathUtils.clamp(_sph.radius * orbit.zoom, ORBIT_MIN_R, ORBIT_MAX_R);
  _camT.copy(_lookT).add(_off.setFromSpherical(_sph));
}

function camTargets() {
  if (S.phase === 'drive') {
    _off.set(4.2, 3.2, -6).applyAxisAngle(UP, truck.group.rotation.y);
    _camT.copy(truck.group.position).add(_off);
    _lookT.copy(truck.group.position); _lookT.y += 0.9;
  } else if (S.phase === 'deliver') {
    const c = _w.set(0, 0, 0);
    for (const s of world.porchSlots) c.add(s);
    c.multiplyScalar(1 / world.porchSlots.length);
    const dir = _off.copy(c).sub(world.houseBPos).setY(0).normalize();
    _camT.copy(c).addScaledVector(dir, 4.6);
    _camT.x += dir.z * 2.2; _camT.z += -dir.x * 2.2; _camT.y = 3.3;
    _lookT.copy(c); _lookT.y = 0.5;
  } else {
    _off.set(3.0, 3.5, 5.4).applyAxisAngle(UP, truck.group.rotation.y);
    _camT.copy(truck.group.position).add(_off);
    _lookT.copy(truck.group.position); _lookT.y += 0.6;
  }
}

/* ---------- items ---------- */
function totalItems() { return order.items.reduce((s, [, c]) => s + c, 0); }
function loadedCount() { return S.itemsState.reduce((s, st) => s + st.placed, 0); }

function refreshLoadUI() {
  ui.renderLoadList(S.itemsState, S.selectedId);
  ui.renderBays(S.bays);
  ui.updateLoad(loadedCount(), totalItems());
}

function placeInBay(id, bayIdx) {
  const st = S.itemsState.find((s) => s.id === id);
  const mesh = makeItem(id);
  const local = truck.bayLocal(bayIdx);
  mesh.position.set(local.x, 2.2, local.z);
  mesh.rotation.y = ((bayIdx * 37) % 10) / 10 * 0.4 - 0.2;
  truck.bedGroup.add(mesh);
  S.bays[bayIdx] = { id, mesh };
  S.placedStack.push(bayIdx);
  st.placed++;
  animate(0.4, (k) => { mesh.position.y = 2.2 * (1 - easeIn(k)); }, () => {
    sfx.place();
    const base = mesh.position.y;
    animate(0.22, (k) => {
      const s = 0.72 + 0.28 * easeBack(k);
      mesh.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6);
      mesh.position.y = base;
    });
  });
  refreshLoadUI();
}

function tryBay(i) {
  if (S.phase !== 'load') return;
  if (S.bays[i]) { sfx.deny(); ui.toast('That bay is full'); return; }
  if (!S.selectedId) { sfx.deny(); ui.flashBay(i); ui.toast('Pick an item first'); return; }
  const st = S.itemsState.find((s) => s.id === S.selectedId);
  if (st.placed >= st.count) { sfx.deny(); return; }
  placeInBay(S.selectedId, i);
  const left = st.count - st.placed;
  if (left === 0) {
    const next = S.itemsState.find((s) => s.placed < s.count);
    S.selectedId = next ? next.id : null;
    refreshLoadUI();
  }
}

function undo() {
  const bayIdx = S.placedStack.pop();
  if (bayIdx == null) return;
  const rec = S.bays[bayIdx];
  S.bays[bayIdx] = null;
  const st = S.itemsState.find((s) => s.id === rec.id);
  st.placed--;
  S.selectedId = rec.id;
  sfx.undo();
  const mesh = rec.mesh;
  animate(0.28, (k) => { mesh.position.y = 2.4 * easeIn(k); }, () => {
    truck.bedGroup.remove(mesh);
  });
  refreshLoadUI();
}

function autoLoad() {
  const remaining = [];
  for (const st of S.itemsState)
    for (let i = st.placed; i < st.count; i++) remaining.push(st.id);
  const free = S.bays.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
  for (let i = free.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [free[i], free[j]] = [free[j], free[i]];
  }
  S.usedAuto = true;
  sfx.click();
  remaining.forEach((id, n) => later(180 * n, () => {
    if (S.phase !== 'load') return;
    placeInBay(id, free[n]);
  }));
}

/* ---------- drive ---------- */
function startDrive() {
  S.phase = 'drive';
  S.driveT = 0; S.speed = 0;
  S.prevYaw = truck.group.rotation.y;
  ui.setPhase('drive');
  ui.setDrive(0);
  sfx.go();
  engineStart();
}

function updateDrive(dt) {
  S.speed = S.holding ? Math.min(VMAX, S.speed + ACCEL * dt) : Math.max(0, S.speed - BRAKE * dt);
  const prevT = S.driveT;
  S.driveT = Math.min(1, S.driveT + (S.speed * dt) / world.length);
  truckPose(S.driveT);

  const yaw = truck.group.rotation.y;
  let dy = yaw - S.prevYaw;
  if (dy > Math.PI) dy -= Math.PI * 2;
  if (dy < -Math.PI) dy += Math.PI * 2;
  S.prevYaw = yaw;
  const sway = THREE.MathUtils.clamp(-(dy / Math.max(dt, 1e-4)) * S.speed * 0.018, -0.13, 0.13);
  truck.tilt.rotation.z += (sway - truck.tilt.rotation.z) * Math.min(1, 8 * dt);

  for (const wh of truck.wheels) wh.rotation.x += (S.speed * dt) / 0.34;

  for (const z of S.bumpZones) {
    if (prevT < z && S.driveT >= z && S.speed > 2) { S.bumpT = 0; sfx.bump(); }
  }
  if (S.bumpT < 0.5) {
    S.bumpT += dt;
    truck.tilt.position.y = Math.sin(Math.min(1, S.bumpT / 0.5) * Math.PI) * 0.11 * Math.min(1, S.speed / 6);
  } else truck.tilt.position.y = 0;

  engineSet(S.speed / VMAX);
  ui.setDrive(S.driveT * 100);

  if (S.driveT >= 1) {
    S.phase = 'deliver';
    S.holding = false;
    engineStop();
    truck.tilt.rotation.z = 0;
    truckPose(1);
    ui.setPhase('deliver');
    refreshDeliverUI();
  }
}

/* ---------- deliver ---------- */
function refreshDeliverUI() {
  ui.renderDeliverList(S.itemsState);
  ui.updateDeliver(S.deliveredCount, totalItems());
}

function deliverOne(id) {
  if (S.phase !== 'deliver') return;
  const bayIdx = S.bays.findIndex((b) => b && b.id === id);
  if (bayIdx < 0) return;
  const rec = S.bays[bayIdx];
  S.bays[bayIdx] = null;
  const st = S.itemsState.find((s) => s.id === id);
  st.delivered++;
  const slotIdx = S.deliveredCount;          // claim slot at flight start (no double-booking)
  S.deliveredCount++;
  const mesh = rec.mesh;
  mesh.scale.set(1, 1, 1);
  scene.attach(mesh);
  const from = mesh.position.clone();
  const to = world.porchSlots[slotIdx % world.porchSlots.length];
  const blob = flightBlobs.find((b) => !b.visible);
  if (blob) blob.visible = true;
  animate(0.62, (k) => {
    const e = easeIO(k);
    mesh.position.lerpVectors(from, to, e);
    mesh.position.y += Math.sin(e * Math.PI) * 1.5;
    mesh.rotation.y += 0.04;
    if (blob) {
      blob.position.set(mesh.position.x, 0.12, mesh.position.z);
      const h = 1 - Math.min(1, mesh.position.y / 1.6);
      blob.scale.setScalar(0.45 + 0.55 * h);
    }
  }, () => {
    mesh.position.copy(to);
    sfx.deliver();
    if (blob) blob.visible = false;
    animate(0.2, (k) => {
      const s = 0.7 + 0.3 * easeBack(k);
      mesh.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6);
    });
    S.porchMeshes.push(mesh);
    S.deliveredDone++;
    if (S.deliveredDone >= totalItems()) completeOrder();
  });
  refreshDeliverUI();
}

function unloadAll() {
  sfx.click();
  const ids = [];
  for (const st of S.itemsState)
    for (let i = st.delivered; i < st.placed; i++) ids.push(st.id);
  ids.forEach((id, n) => later(190 * n, () => deliverOne(id)));
}

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`;
}

function completeOrder() {
  sfx.complete();
  const stars = S.usedAuto ? 2 : 3;
  const timeMs = performance.now() - S.orderStart;
  save.stars[order.id] = Math.max(save.stars[order.id] || 0, stars);
  save.best[order.id] = Math.min(save.best[order.id] || Infinity, Math.round(timeMs / 1000));
  save.unlocked = Math.max(save.unlocked, Math.min(ORDERS.length, S.orderIndex + 2));
  persist(save);
  const isLast = S.orderIndex >= ORDERS.length - 1;
  later(950, () => ui.showResult(order, stars, fmtTime(timeMs), fmtTime(save.best[order.id] * 1000), isLast));
}

/* ---------- order lifecycle ---------- */
function startOrder(i, snapCam = true) {
  clearTimers();
  S.anims.length = 0;
  engineStop();
  for (const m of S.porchMeshes) scene.remove(m);
  S.porchMeshes.length = 0;
  for (const b of flightBlobs) b.visible = false;
  truck.clearBed();
  truck.tilt.rotation.z = 0;
  truck.tilt.position.y = 0;

  S.orderIndex = i;
  order = ORDERS[i];
  S.itemsState = order.items.map(([id, count]) => ({ id, count, placed: 0, delivered: 0 }));
  S.bays = [null, null, null, null, null, null];
  S.placedStack = [];
  S.selectedId = S.itemsState[0].id;
  S.usedAuto = false;
  S.holding = false;
  S.speed = 0; S.driveT = 0;
  S.deliveredCount = 0; S.deliveredDone = 0;
  S.phase = 'load';
  S.orderStart = performance.now();

  truckPose(0);
  S.prevYaw = truck.group.rotation.y;
  resetOrbit();

  ui.setOrder(order, i, ORDERS.length);
  ui.setPhase('load');
  refreshLoadUI();
  if (snapCam) {
    camTargets();
    camPos.copy(_camT);
    camLook.copy(_lookT);
  }
}

/* ---------- ui callbacks ---------- */
const ui = createUI({
  onSelectItem(id) {
    if (S.phase !== 'load') return;
    S.selectedId = id;
    sfx.select();
    ui.renderLoadList(S.itemsState, S.selectedId);
  },
  onBay: tryBay,
  onUndo: undo,
  onAuto: autoLoad,
  onGo() {
    if (S.phase === 'load' && loadedCount() >= totalItems()) startDrive();
  },
  onDriveStart() { S.holding = true; },
  onDriveEnd() { S.holding = false; },
  onDeliver: deliverOne,
  onUnloadAll: unloadAll,
  onStar(i) { sfx.star(i); },
  onNext() {
    ui.hideResult();
    if (S.orderIndex >= ORDERS.length - 1) {
      ui.renderRoutes(ORDERS, save, S.orderIndex);
      ui.openOverlay('ov-routes');
    } else startOrder(S.orderIndex + 1);
  },
  onReplay() { ui.hideResult(); startOrder(S.orderIndex); },
  onShowRoutes() {
    sfx.click();
    ui.renderRoutes(ORDERS, save, S.orderIndex);
    ui.openOverlay('ov-routes');
  },
  onPickRoute(i) {
    sfx.click();
    ui.closeOverlays();
    if (i !== S.orderIndex) startOrder(i);
  },
  onHelp() { sfx.click(); ui.openOverlay('ov-help'); },
  onToggleSound() {
    save.sound = !save.sound;
    persist(save);
    setMuted(!save.sound);
    ui.setSound(!save.sound);
    sfx.click();
  },
  onPhaseShown() { reframe(); },
});

/* ---------- global wiring ---------- */
setMuted(!save.sound);
ui.setSound(!save.sound);
addEventListener('resize', reframe);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') ui.closeOverlays();
});
if (!save.seenHelp) {
  save.seenHelp = true;
  persist(save);
  ui.openOverlay('ov-help');
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let elapsed = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  stepAnims(dt);
  if (S.phase === 'drive') updateDrive(dt);
  world.update(dt, elapsed);

  camTargets();
  applyOrbit(dt);
  const damp = S.phase === 'drive' ? 3.2 : 2.6;
  const f = 1 - Math.exp(-damp * dt);
  camPos.lerp(_camT, f);
  camLook.lerp(_lookT, f);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  /* re-bake shadows only while the scene is actually moving (truck drive,
     item flights, place/undo pops) — keeps static frames free of cost */
  if (S.phase === 'drive' || S.anims.length) renderer.shadowMap.needsUpdate = true;

  renderer.render(scene, camera);

  /* adaptive resolution */
  const ms = dt * 1000;
  frameEMA = frameEMA * 0.9 + ms * 0.1;
  const now = performance.now();
  if (now - lastAdjust > 900) {
    if (frameEMA > 22 && dprScale > 0.55) {
      dprScale = Math.max(0.55, dprScale - 0.12);
      applyDPR(); lastAdjust = now;
    } else if (frameEMA < 15 && dprScale < 1) {
      dprScale = Math.min(1, dprScale + 0.12);
      applyDPR(); lastAdjust = now;
    }
  }
}

reframe();
startOrder(S.orderIndex);
loop();
