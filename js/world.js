// world.js — pastel seaside diorama: ground, road, houses, palms, sea, lighthouse
import * as THREE from 'three';
import { mat } from './items.js';

export const CREAM = 0xf4efe4;
const _v = new THREE.Vector3();
const SAND = 0xe9dfc9, SAND_D = 0xe0d3b8, SAGE = 0x9dbf9e, SAGE_D = 0x86ad86,
      TRUNK = 0xb08d6b, PEACH = 0xe8a68c, ROOF = 0xf0e6d2, CORAL = 0xd96a5a,
      TEAL = 0x5b9c8a, SEA = 0xa8cfc9, SEA_L = 0xd8ece8, ROCK = 0xd9d2c2;

function box(w, h, d, color, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------- houses ---------- */
function makeHouse({ door = CORAL, awning = false } = {}) {
  const g = new THREE.Group();
  g.add(box(2.6, 1.7, 2.2, PEACH, 0, 0, 0));                       // walls
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.1, 4), mat(ROOF));
  roof.position.y = 2.25; roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.35, 1, 1.2); roof.castShadow = true;
  g.add(roof);
  g.add(box(0.55, 0.95, 0.08, door, 0, 0, 1.12));                  // door
  g.add(box(0.07, 0.07, 0.1, 0xf2c14e, 0.18, 0.45, 1.14, false));  // knob
  for (const sx of [-0.85, 0.85]) {                                // windows
    g.add(box(0.55, 0.55, 0.07, 0xf7f1e3, sx, 0.65, 1.11, false));
    g.add(box(0.4, 0.4, 0.08, 0x7d8b94, sx, 0.72, 1.11, false));
    g.add(box(0.06, 0.55, 0.08, 0xf7f1e3, sx, 0.65, 1.115, false));
  }
  g.add(box(0.35, 0.6, 0.35, 0xd9b98f, 0.8, 2.2, -0.5));           // chimney
  if (awning) {
    const a = box(1.5, 0.06, 0.75, 0xfaf6ec, 0, 1.35, 1.42);
    a.rotation.x = 0.42; g.add(a);
    g.add(cyl(0.03, 0.03, 1.15, 0xf7f1e3, -0.65, 0, 1.62));
    g.add(cyl(0.03, 0.03, 1.15, 0xf7f1e3, 0.65, 0, 1.62));
    for (let i = 0; i < 5; i++)                                    // scallops
      g.add(cyl(0.13, 0.13, 0.05, 0xfaf6ec, -0.6 + i * 0.3, 1.06, 1.72, 8));
  }
  return g;
}

/* ---------- palms ---------- */
function makePalm(s = 1) {
  const g = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 1.1, 0), new THREE.Vector3(0.38, 2.1, 0.08));
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.09, 7), mat(TRUNK));
  trunk.castShadow = true; g.add(trunk);
  const top = curve.getPoint(1);
  for (let i = 0; i < 7; i++) {
    const pivot = new THREE.Group();
    pivot.position.copy(top);
    const frond = box(0.62, 0.035, 0.17, i % 2 ? SAGE : SAGE_D, 0.28, -0.02, 0);
    frond.geometry.translate(0, 0, 0);
    pivot.add(frond);
    pivot.rotation.y = (i / 7) * Math.PI * 2;
    pivot.rotation.z = -0.55 - (i % 3) * 0.12;
    g.add(pivot);
  }
  const nut = cyl(0.07, 0.07, 0.07, 0x8a6a4f, 0, 0, 0);
  nut.position.copy(top).add(_v.set(0.05, -0.06, 0.05));
  g.add(nut);
  g.scale.setScalar(s);
  return g;
}

/* ---------- road ribbon ---------- */
function ribbon(curve, width, color, y = 0.022) {
  const N = 64, pos = [], idx = [];
  const p = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    curve.getPointAt(t, p); curve.getTangentAt(t, tan);
    side.crossVectors(up, tan).normalize().multiplyScalar(width / 2);
    pos.push(p.x - side.x, y, p.z - side.z, p.x + side.x, y, p.z + side.z);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color));
  m.receiveShadow = true;
  return m;
}

export function buildWorld(scene, quality) {
  const world = { dynamics: [], sea: [], clouds: [] };

  scene.background = new THREE.Color(CREAM);
  scene.fog = new THREE.Fog(CREAM, 26, 58);

  /* lights */
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0xd8cbb2, quality === 'low' ? 1.25 : 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, quality === 'low' ? 1.25 : 1.4);
  sun.position.set(-9, 13, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(quality === 'high' ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 2; sc.far = 40;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  if (quality === 'high') {
    const fill = new THREE.DirectionalLight(0xe8f0ff, 0.3);
    fill.position.set(8, 6, -6);
    scene.add(fill);
  }

  /* ground */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(46, 48), mat(CREAM));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(13, 36), mat(0xe6ead6));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(-1, 0.01, 2); lawn.receiveShadow = true;
  scene.add(lawn);

  /* route: house A → house B by the sea */
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0, 1.0),
    new THREE.Vector3(-1.6, 0, 2.6),
    new THREE.Vector3(1.6, 0, 1.7),
    new THREE.Vector3(3.4, 0, -0.9),
    new THREE.Vector3(4.8, 0, -3.3),
    new THREE.Vector3(6.3, 0, -5.6),
  ], false, 'catmullrom', 0.35);
  world.curve = curve;
  world.length = curve.getLength();

  scene.add(ribbon(curve, 2.1, SAND_D));
  /* center dashes */
  const p = new THREE.Vector3(), tan = new THREE.Vector3();
  for (let s = 0.8; s < world.length - 0.8; s += 1.7) {
    const t = s / world.length;
    curve.getPointAt(t, p); curve.getTangentAt(t, tan);
    const dash = box(0.5, 0.012, 0.09, 0xfaf6ec, p.x, 0.045, p.z, false);
    dash.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI / 2;
    scene.add(dash);
  }

  /* house A (start, awning) + mailbox */
  const houseA = makeHouse({ door: CORAL, awning: true });
  houseA.position.set(-7.4, 0, 0.2);
  houseA.rotation.y = Math.PI / 2 + 0.35;
  scene.add(houseA);
  const mail = new THREE.Group();
  mail.add(cyl(0.035, 0.035, 0.85, 0x8a6a4f));
  mail.add(box(0.42, 0.26, 0.26, TEAL, 0.08, 0.85, 0));
  mail.add(box(0.03, 0.2, 0.03, CORAL, 0.26, 1.08, 0, false));
  mail.position.set(-4.6, 0, 2.9); mail.rotation.y = 0.6;
  scene.add(mail);

  /* house B (destination, by the sea) */
  const houseBPos = new THREE.Vector3(8.8, 0, -7.9);
  const houseB = makeHouse({ door: TEAL });
  houseB.position.copy(houseBPos);
  houseB.rotation.y = Math.atan2(6.3 - houseBPos.x, -5.6 - houseBPos.z);
  scene.add(houseB);
  world.houseBPos = houseBPos;

  /* porch slab + slots where items land */
  const doorDir = new THREE.Vector3(Math.sin(houseB.rotation.y), 0, Math.cos(houseB.rotation.y));
  const right = new THREE.Vector3(doorDir.z, 0, -doorDir.x);
  const porchC = houseBPos.clone().addScaledVector(doorDir, 2.2);
  const slab = box(2.7, 0.08, 2.0, ROOF, porchC.x, 0, porchC.z);
  slab.rotation.y = houseB.rotation.y;
  scene.add(slab);
  world.porchSlots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++)
    world.porchSlots.push(porchC.clone()
      .addScaledVector(right, (c - 0.5) * 1.05)
      .addScaledVector(doorDir, (r - 1) * 0.66)
      .setY(0.08));

  /* sea + lighthouse */
  const sea = cyl(6.5, 6.5, 0.12, SEA, 15, -0.09, -11, 36);
  sea.castShadow = false;
  scene.add(sea);
  for (let i = 0; i < 3; i++) {
    const w = box(1.8 - i * 0.3, 0.02, 0.14, SEA_L, 13.4 + i * 1.3, 0.02, -9.4 - i * 1.1, false);
    w.rotation.y = 0.5 + i * 0.3;
    scene.add(w); world.sea.push(w);
  }
  const lh = new THREE.Group();
  lh.add(cyl(0.6, 0.68, 0.5, CORAL));
  lh.add(cyl(0.5, 0.58, 0.5, 0xfaf6ec, 0, 0.5, 0));
  lh.add(cyl(0.42, 0.5, 0.5, CORAL, 0, 1.0, 0));
  lh.add(cyl(0.34, 0.42, 0.5, 0xfaf6ec, 0, 1.5, 0));
  lh.add(cyl(0.3, 0.3, 0.3, 0x33403a, 0, 2.0, 0));
  const lhTop = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.45, 10), mat(CORAL));
  lhTop.position.y = 2.52; lhTop.castShadow = true; lh.add(lhTop);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xf2c14e, 0.5));
  lamp.position.y = 2.16; lh.add(lamp);
  lh.position.set(11.6, 0, -5.6);
  scene.add(lh);

  /* palms along route + near houses */
  const palmSpots = [];
  for (const [t, side] of [[0.12, 1], [0.3, -1], [0.48, 1], [0.66, -1], [0.84, 1]]) {
    curve.getPointAt(t, p); curve.getTangentAt(t, tan);
    const off = new THREE.Vector3(tan.z, 0, -tan.x).multiplyScalar(2.6 * side);
    palmSpots.push([p.x + off.x, p.z + off.z, 0.8 + ((t * 37) % 0.35)]);
  }
  palmSpots.push([-8.6, 2.6, 1.05], [-6.2, -2.4, 0.85], [10.6, -9.6, 1.0], [7.4, -10.4, 0.8]);
  for (const [x, z, s] of palmSpots) {
    const palm = makePalm(s);
    palm.position.set(x, 0, z);
    palm.rotation.y = (x * 13.7) % Math.PI;
    scene.add(palm);
  }

  /* rocks + grass tufts */
  for (const [x, z, s] of [[-2.6, 4.4, 1], [2.6, 3.4, 0.7], [5.6, -1.4, 0.9], [-5.8, 4.0, 0.8], [8.9, -4.2, 0.7]]) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 * s, 0), mat(ROCK));
    rock.position.set(x, 0.1 * s, z); rock.scale.y = 0.6;
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }
  for (const [x, z] of [[-3.4, 0.4], [0.4, 3.6], [3.8, 0.6], [1.4, -1.8], [7.6, -3.4], [-6.9, 3.1], [5.2, -5.9]]) {
    const tuft = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28 + i * 0.06, 5), mat(i % 2 ? SAGE : SAGE_D));
      blade.position.set((i - 1) * 0.09, 0.14, (i % 2) * 0.06);
      blade.rotation.z = (i - 1) * 0.25;
      tuft.add(blade);
    }
    tuft.position.set(x, 0, z);
    scene.add(tuft);
  }

  /* clouds */
  for (const [x, y, z, s] of [[-6, 7.6, -6, 1], [3, 8.6, -9, 1.3], [9, 7.2, 2, 0.85], [-11, 8.2, 3, 1.1]]) {
    const cl = new THREE.Group();
    for (const [ox, oy, oz, r] of [[0, 0, 0, 0.8], [0.85, -0.1, 0.1, 0.55], [-0.8, -0.12, -0.05, 0.5], [0.2, 0.3, -0.2, 0.5]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(0xfbf8f0, 1));
      b.position.set(ox, oy, oz); b.scale.y = 0.62;
      cl.add(b);
    }
    cl.position.set(x, y, z); cl.scale.setScalar(s);
    scene.add(cl); world.clouds.push(cl);
  }

  /* per-frame gentle life */
  world.update = (dt, t) => {
    for (const c of world.clouds) {
      c.position.x += dt * 0.16;
      if (c.position.x > 20) c.position.x = -20;
    }
    for (let i = 0; i < world.sea.length; i++) {
      const w = world.sea[i];
      w.position.x += Math.sin(t * 0.8 + i * 2.1) * dt * 0.12;
      w.scale.x = 1 + Math.sin(t * 1.1 + i) * 0.08;
    }
  };

  return world;
}
