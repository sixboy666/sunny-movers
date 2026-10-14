// items.js — moving-list catalog: pastel low-poly props, real geometry everywhere
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, rough = 0.92) {
  const k = color + '|' + rough;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
  return matCache.get(k);
}

function B(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function Cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function Cone(r, h, color, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function Sph(r, color, x = 0, y = 0, z = 0, w = 1, h = 1, d = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(color));
  m.position.set(x, y, z); m.scale.set(w, h, d);
  return m;
}

const PEACH = 0xe8a68c, CREAM = 0xf7f1e3, CARD = 0xd9b98f, TAPE = 0xf2e7d0,
      TERRA = 0xc97b5a, LEAF = 0x8fbf8f, LEAF2 = 0x7ba889, WOOD = 0xb08d6b,
      WOODD = 0x8a6a4f, MINT = 0x9fc8b8, SHADE = 0xf5ecd6, GOLD = 0xf2c14e,
      CORAL = 0xd96a5a;

const F = {
  sofa() {
    const g = new THREE.Group();
    g.add(B(0.95, 0.28, 0.52, PEACH, 0, 0, 0));            // base
    g.add(B(0.95, 0.4, 0.14, PEACH, 0, 0.2, -0.19));       // back
    g.add(B(0.13, 0.34, 0.52, PEACH, -0.41, 0.2, 0));      // arm L
    g.add(B(0.13, 0.34, 0.52, PEACH, 0.41, 0.2, 0));       // arm R
    g.add(B(0.34, 0.12, 0.4, CREAM, -0.19, 0.28, 0.02));   // cushion
    g.add(B(0.34, 0.12, 0.4, CREAM, 0.19, 0.28, 0.02));
    g.add(B(0.95, 0.05, 0.52, WOODD, 0, -0.02, 0));        // plinth
    return g;
  },
  box() {
    const g = new THREE.Group();
    g.add(B(0.55, 0.5, 0.55, CARD, 0, 0, 0));
    g.add(B(0.57, 0.03, 0.12, TAPE, 0, 0.5, 0));
    g.add(B(0.12, 0.03, 0.57, TAPE, 0, 0.5, 0));
    g.add(B(0.2, 0.14, 0.02, CREAM, 0, 0.16, 0.28));       // label
    return g;
  },
  plant() {
    const g = new THREE.Group();
    g.add(Cyl(0.17, 0.22, 0.3, TERRA));
    g.add(Cyl(0.16, 0.16, 0.03, 0x6b4a38, 0, 0.29, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const leaf = Cone(0.09, 0.5, i % 2 ? LEAF : LEAF2, Math.cos(a) * 0.09, 0.3, Math.sin(a) * 0.09);
      leaf.scale.z = 0.35;
      leaf.rotation.z = Math.cos(a) * 0.55;
      leaf.rotation.x = -Math.sin(a) * 0.55;
      g.add(leaf);
    }
    return g;
  },
  chair() {
    const g = new THREE.Group();
    g.add(B(0.42, 0.06, 0.42, WOOD, 0, 0.4, 0));
    g.add(B(0.42, 0.5, 0.06, WOOD, 0, 0.46, -0.18));
    for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]])
      g.add(Cyl(0.025, 0.025, 0.42, WOODD, x, 0, z));
    g.add(B(0.34, 0.05, 0.05, WOODD, 0, 0.2, -0.17));
    return g;
  },
  lamp() {
    const g = new THREE.Group();
    g.add(Cyl(0.16, 0.18, 0.04, WOODD));
    g.add(Cyl(0.025, 0.025, 0.85, WOODD, 0, 0.04, 0));
    g.add(Cone(0.22, 0.26, SHADE, 0, 0.86, 0));
    g.add(Sph(0.05, GOLD, 0, 0.88, 0));
    return g;
  },
  fridge() {
    const g = new THREE.Group();
    g.add(B(0.5, 0.85, 0.5, MINT, 0, 0.02, 0));
    g.add(B(0.52, 0.03, 0.52, CREAM, 0, 0.55, 0));         // door split
    g.add(B(0.05, 0.2, 0.05, CREAM, 0.18, 0.6, 0.26));     // handle
    g.add(B(0.5, 0.06, 0.5, WOODD, 0, 0, 0));
    return g;
  },
  table() {
    const g = new THREE.Group();
    g.add(Cyl(0.4, 0.4, 0.05, 0xcbaa80, 0, 0.42, 0, 18));
    g.add(Cyl(0.05, 0.07, 0.42, WOODD, 0, 0, 0));
    g.add(Cyl(0.22, 0.26, 0.04, WOODD, 0, 0, 0));
    g.add(Cyl(0.09, 0.11, 0.12, CREAM, 0.14, 0.47, 0.1));  // teacup
    return g;
  },
  carrier() {
    const g = new THREE.Group();
    g.add(B(0.55, 0.32, 0.4, PEACH, 0, 0, 0));
    const roof = Cyl(0.19, 0.19, 0.55, CORAL, 0, 0.3, 0, 12);
    roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.55); roof.position.y = 0.32;
    g.add(roof);
    g.add(B(0.2, 0.22, 0.02, CREAM, 0, 0.02, 0.2));        // door
    g.add(B(0.03, 0.22, 0.02, WOODD, -0.05, 0.02, 0.21));
    g.add(B(0.03, 0.22, 0.02, WOODD, 0.05, 0.02, 0.21));
    g.add(B(0.2, 0.03, 0.06, WOODD, 0, 0.46, 0));          // handle
    return g;
  },
  surf() {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.85, 4, 10), mat(GOLD));
    board.rotation.z = Math.PI / 2; board.scale.set(1, 1, 0.32); board.position.y = 0.06;
    g.add(board);
    g.add(B(1.0, 0.02, 0.06, CREAM, 0, 0.1, 0));           // stripe
    return g;
  },
  mattress() {
    const g = new THREE.Group();
    g.add(B(1.05, 0.2, 0.7, 0xf5efe0, 0, 0, 0));
    g.add(B(1.07, 0.05, 0.72, PEACH, 0, 0.08, 0));         // piping band
    g.add(B(1.05, 0.04, 0.7, CREAM, 0, 0.2, 0));
    return g;
  },
  music() {
    const g = new THREE.Group();
    g.add(B(0.34, 0.24, 0.26, TERRA, 0, 0, 0));
    g.add(B(0.36, 0.05, 0.28, GOLD, 0, 0.24, 0));
    g.add(Cyl(0.02, 0.02, 0.12, WOODD, 0.22, 0.08, 0));
    g.add(Sph(0.035, GOLD, 0.22, 0.2, 0));
    return g;
  },
  gnome() {
    const g = new THREE.Group();
    g.add(Cyl(0.11, 0.14, 0.2, CREAM));
    g.add(Cone(0.13, 0.26, CORAL, 0, 0.2, 0));
    g.add(Sph(0.035, 0xe8b98f, 0, 0.19, 0.11));
    return g;
  },
  keyboard() {
    const g = new THREE.Group();
    g.add(B(0.8, 0.1, 0.3, MINT, 0, 0.06, 0));
    g.add(B(0.72, 0.02, 0.12, CREAM, 0, 0.16, 0.07));
    for (let i = 0; i < 6; i++) g.add(B(0.045, 0.02, 0.08, 0x33403a, -0.3 + i * 0.12, 0.18, 0.05));
    g.add(Cyl(0.03, 0.03, 0.3, WOODD, -0.3, 0, 0));        // legs
    g.add(Cyl(0.03, 0.03, 0.3, WOODD, 0.3, 0, 0));
    return g;
  },
};

const ICON = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const ITEMS = {
  sofa:     { name: 'Peach sofa',  weight: '8 kg',    make: F.sofa,
    icon: ICON('<path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12.5A1.5 1.5 0 0 1 6 12v2h12v-2a1.5 1.5 0 0 1 3 .5V18H3z"/><path d="M7 18v1.5M17 18v1.5"/>') },
  box:      { name: 'Book box',    weight: '3.2 kg',  make: F.box,
    icon: ICON('<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>') },
  plant:    { name: 'House plant', weight: 'Fragile', make: F.plant,
    icon: ICON('<path d="M8.5 12h7l-1 8h-5z"/><path d="M12 12V7M12 9c0-3 1.8-4 4-4 0 3-1.8 4-4 4zM12 8c0-2.5-1.6-3.5-3.4-3.5C8.6 7 10 8 12 8z"/>') },
  chair:    { name: 'Wood chair',  weight: '2.4 kg',  make: F.chair,
    icon: ICON('<path d="M7 3v10h10V3"/><path d="M6 13h12v3.5H6z"/><path d="M7.5 16.5V21M16.5 16.5V21"/>') },
  lamp:     { name: 'Floor lamp',  weight: '1.8 kg',  make: F.lamp,
    icon: ICON('<path d="M9 3h6l2 6H7z"/><path d="M12 9v10"/><path d="M8 21h8"/>') },
  fridge:   { name: 'Tiny fridge', weight: '12 kg',   make: F.fridge,
    icon: ICON('<rect x="7" y="3" width="10" height="18" rx="1.5"/><path d="M7 9h10M14.5 5.5v2M14.5 11v3"/>') },
  table:    { name: 'Tea table',   weight: '4 kg',    make: F.table,
    icon: ICON('<ellipse cx="12" cy="7" rx="8" ry="2.5"/><path d="M6 9l-1.5 11M18 9l1.5 11M12 9.5V20"/>') },
  carrier:  { name: 'Cat carrier', weight: 'Fragile', make: F.carrier,
    icon: ICON('<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2M9 12v4M12 12v4M15 12v4"/>') },
  surf:     { name: 'Surf board',  weight: '1.5 kg',  make: F.surf,
    icon: ICON('<path d="M12 2c3 2 4.5 6 4.5 10s-1.5 8-4.5 10c-3-2-4.5-6-4.5-10S9 4 12 2z"/><path d="M12 2v20"/>') },
  mattress: { name: 'Mattress',    weight: '9 kg',    make: F.mattress,
    icon: ICON('<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M3 12h18"/><circle cx="8" cy="14" r=".4"/><circle cx="12" cy="14" r=".4"/><circle cx="16" cy="14" r=".4"/>') },
  music:    { name: 'Music box',   weight: '2.2 kg',  make: F.music,
    icon: ICON('<rect x="5" y="9" width="14" height="10" rx="1.5"/><path d="M5 12.5h14M14 9V5.5h4"/>') },
  gnome:    { name: 'Garden gnome',weight: '0.8 kg',  make: F.gnome,
    icon: ICON('<path d="M12 3l5 8H7z"/><path d="M8.5 12h7v7h-7z"/><circle cx="12" cy="15.5" r="1"/>') },
  keyboard: { name: 'Keyboard',    weight: '6 kg',    make: F.keyboard,
    icon: ICON('<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M6.5 8v4M10 8v4M13.5 8v4M17 8v4"/><path d="M3 12.5h18"/>') },
};

export function makeItem(id) {
  const g = ITEMS[id].make();
  g.userData.itemId = id;
  g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
  return g;
}
