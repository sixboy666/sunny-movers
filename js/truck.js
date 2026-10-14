// truck.js — the little mint pickup: cab, bed with 6 bays, logo panels, blob shadow
import * as THREE from 'three';
import { mat } from './items.js';

const MINT = 0x9fc8b8, MINT_D = 0x8ab5a5, WHITE = 0xfaf6ec, GLASS = 0xc4ddd8,
      WOOD = 0xb08d6b, INK = 0x33403a, GOLD = 0xf2c14e, CORAL = 0xd96a5a;

function B(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}

function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9fc8b8';
  g.fillRect(0, 0, 512, 128);
  // little sun
  g.fillStyle = '#f2c14e';
  g.beginPath(); g.arc(58, 64, 24, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2c14e'; g.lineWidth = 6; g.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(58 + Math.cos(a) * 32, 64 + Math.sin(a) * 32);
    g.lineTo(58 + Math.cos(a) * 42, 64 + Math.sin(a) * 42);
    g.stroke();
  }
  // wordmark
  g.fillStyle = '#faf6ec';
  g.font = '800 44px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SUNNY MOVERS', 296, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(51,64,58,0.34)');
  grad.addColorStop(0.7, 'rgba(51,64,58,0.16)');
  grad.addColorStop(1, 'rgba(51,64,58,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const BAY_X = [-0.42, 0.42];
const BAY_Z = [-0.2, -0.76, -1.31];

export function buildTruck() {
  const group = new THREE.Group();
  const tilt = new THREE.Group();          // sway/hop applied here (shadow stays flat)
  group.add(tilt);

  /* chassis + bed */
  tilt.add(B(1.5, 0.2, 2.9, MINT_D, 0, 0.28, -0.1));               // chassis
  tilt.add(B(1.66, 0.07, 1.72, 0xcbaa80, 0, 0.48, -0.76));         // wooden bed floor
  tilt.add(B(0.06, 0.42, 1.66, MINT, -0.86, 0.55, -0.76));         // side walls
  tilt.add(B(0.06, 0.42, 1.66, MINT, 0.86, 0.55, -0.76));
  tilt.add(B(1.66, 0.42, 0.06, MINT, 0, 0.55, 0.1));               // front wall
  tilt.add(B(1.66, 0.42, 0.06, MINT, 0, 0.55, -1.62));             // tailgate

  /* logo panels */
  const logo = logoTexture();
  const panelMat = new THREE.MeshStandardMaterial({ map: logo, roughness: 0.92, metalness: 0 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), panelMat);
    p.position.set(s * 0.895, 0.76, -0.76);
    p.rotation.y = s * Math.PI / 2;
    tilt.add(p);
  }

  /* wooden slat rails */
  for (const s of [-1, 1]) {
    for (const z of [0.05, -0.5, -1.0, -1.55])
      tilt.add(B(0.05, 0.2, 0.05, WOOD, s * 0.86, 0.97, z));
    tilt.add(B(0.06, 0.05, 1.66, WOOD, s * 0.86, 1.17, -0.76));
  }
  for (const x of [-0.45, 0, 0.45]) tilt.add(B(0.05, 0.2, 0.05, WOOD, x, 0.97, -1.64));
  tilt.add(B(1.66, 0.05, 0.06, WOOD, 0, 1.17, -1.64));

  /* cab (front = +z) */
  tilt.add(B(1.2, 0.5, 0.95, MINT, 0, 0.48, 0.8));                 // cab base
  tilt.add(B(1.1, 0.42, 0.75, MINT, 0, 0.98, 0.72));               // cab top
  const shield = B(1.0, 0.36, 0.05, GLASS, 0, 1.04, 1.12);         // windshield
  shield.rotation.x = -0.16;
  tilt.add(shield);
  tilt.add(B(0.04, 0.28, 0.5, GLASS, -0.56, 1.05, 0.72));          // side windows
  tilt.add(B(0.04, 0.28, 0.5, GLASS, 0.56, 1.05, 0.72));
  tilt.add(B(1.18, 0.08, 0.82, WHITE, 0, 1.4, 0.72));              // white roof
  tilt.add(B(1.1, 0.14, 0.04, WHITE, 0, 0.56, 1.29));              // grille
  tilt.add(B(1.5, 0.12, 0.12, WHITE, 0, 0.3, 1.4));                // front bumper
  tilt.add(B(1.5, 0.1, 0.08, WHITE, 0, 0.32, -1.66));              // rear bumper
  for (const s of [-1, 1]) {                                       // headlights
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), mat(GOLD, 0.5));
    hl.rotation.x = Math.PI / 2;
    hl.position.set(s * 0.4, 0.68, 1.29);
    tilt.add(hl);
    tilt.add(B(0.1, 0.06, 0.04, CORAL, s * 0.6, 0.58, -1.66));     // tail lights
  }
  tilt.add(B(0.4, 0.12, 0.03, WHITE, 0, 0.42, -1.67));             // license plate

  /* wheels (spin around x) */
  const wheels = [];
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.24, 12);
  hubGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.82, 0.9], [0.82, 0.9], [-0.82, -1.1], [0.82, -1.1]]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, mat(INK, 0.85));
    const hub = new THREE.Mesh(hubGeo, mat(WHITE, 0.7));
    w.add(tire, hub);
    w.position.set(x, 0.34, z);
    tilt.add(w);
    wheels.push(w);
  }

  /* soft blob shadow (stays on ground, never tilts) */
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 3.6),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.02, -0.2);
  group.add(blob);

  /* bed anchor for cargo */
  const bedGroup = new THREE.Group();
  bedGroup.position.set(0, 0.55, 0);
  tilt.add(bedGroup);

  const _v = new THREE.Vector3();
  return {
    group, tilt, wheels, bedGroup,
    bayLocal(i) { return _v.set(BAY_X[i % 2], 0, BAY_Z[(i / 2) | 0]).clone(); },
    clearBed() {
      while (bedGroup.children.length) bedGroup.remove(bedGroup.children[0]);
    },
  };
}
