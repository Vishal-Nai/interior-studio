import * as THREE from 'three';
import type { FurnitureItem, Room, FloorStyle, Opening, WallSide } from '../types';
import { shade } from '../utils/color';

/**
 * Parametric furniture geometry. Every piece is composed from primitives and
 * scaled to the item's exact w/d/h so resizing always stays coherent.
 * The same builders power the live editor and the offscreen PDF renderer.
 */

const matCache = new Map<string, THREE.MeshStandardMaterial>();

function mat(color: string, roughness = 0.82, metalness = 0.04): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    matCache.set(key, m);
  }
  return m;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
const unitSphere = new THREE.SphereGeometry(0.5, 18, 14);

interface PartOpts {
  x?: number;
  y?: number;
  z?: number;
  ry?: number;
  rz?: number;
  rx?: number;
  roughness?: number;
  metalness?: number;
}

function box(g: THREE.Group, w: number, h: number, d: number, color: string, o: PartOpts = {}) {
  const m = new THREE.Mesh(unitBox, mat(color, o.roughness ?? 0.82, o.metalness ?? 0.04));
  m.scale.set(Math.max(w, 0.01), Math.max(h, 0.01), Math.max(d, 0.01));
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function cyl(g: THREE.Group, radius: number, h: number, color: string, o: PartOpts = {}) {
  const m = new THREE.Mesh(unitCyl, mat(color, o.roughness ?? 0.82, o.metalness ?? 0.04));
  m.scale.set(radius * 2, Math.max(h, 0.01), radius * 2);
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function sphere(g: THREE.Group, radius: number, color: string, o: PartOpts = {}) {
  const m = new THREE.Mesh(unitSphere, mat(color, o.roughness ?? 0.9, 0));
  m.scale.setScalar(radius * 2);
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  m.castShadow = true;
  g.add(m);
  return m;
}

interface BuildCtx {
  /** True when the item is raised off the floor (wall-mounted / hung). */
  elevated: boolean;
}

type Builder = (g: THREE.Group, w: number, d: number, h: number, c: string, a: string, ctx: BuildCtx) => void;

const builders: Record<string, Builder> = {
  sofa3: buildSofa,
  sofa2: buildSofa,
  armchair: buildSofa,

  diningChair(g, w, d, h, c, a) {
    const seatH = h * 0.48;
    const legR = Math.min(w, d) * 0.05;
    box(g, w * 0.9, 0.12, d * 0.85, c, { y: seatH });
    box(g, w * 0.9, h - seatH, 0.12, a, { y: seatH + (h - seatH) / 2, z: -d * 0.42 });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        cyl(g, legR, seatH, a, { x: sx * w * 0.38, y: seatH / 2, z: sz * d * 0.35 });
  },

  stool(g, w, d, h, c, a) {
    box(g, w, h * 0.4, d, c, { y: h * 0.8 });
    box(g, w * 0.9, h * 0.6, d * 0.9, a, { y: h * 0.3 });
  },

  coffeeTable(g, w, d, h, c, a) {
    box(g, w, 0.14, d, c, { y: h - 0.07, roughness: 0.5 });
    box(g, w * 0.86, 0.1, d * 0.82, a, { y: h * 0.42 });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(g, 0.14, h, 0.14, a, { x: sx * (w / 2 - 0.15), y: h / 2, z: sz * (d / 2 - 0.15) });
  },

  sideTable(g, w, d, h, c, a) {
    box(g, w, 0.12, d, c, { y: h - 0.06, roughness: 0.5 });
    cyl(g, Math.min(w, d) * 0.08, h, a, { y: h / 2 });
    cyl(g, Math.min(w, d) * 0.4, 0.08, a, { y: 0.04 });
  },

  diningTable(g, w, d, h, c, a) {
    box(g, w, 0.16, d, c, { y: h - 0.08, roughness: 0.45 });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(g, 0.18, h, 0.18, a, { x: sx * (w / 2 - 0.25), y: h / 2, z: sz * (d / 2 - 0.25) });
  },

  desk(g, w, d, h, c, a) {
    box(g, w, 0.14, d, c, { y: h - 0.07, roughness: 0.5 });
    box(g, 0.14, h, d * 0.9, a, { x: -w / 2 + 0.07, y: h / 2 });
    box(g, w * 0.32, h * 0.85, d * 0.9, a, { x: w / 2 - w * 0.16, y: h * 0.425 });
    box(g, w * 0.3, 0.06, d * 0.86, shade(a, 0.12), { x: w / 2 - w * 0.16, y: h * 0.55 });
  },

  bedDouble: buildBed,
  bedSingle: buildBed,

  wardrobe(g, w, d, h, c, a) {
    box(g, w, h, d, c, { y: h / 2 });
    const doors = Math.max(2, Math.round(w / 1.8));
    for (let i = 1; i < doors; i++)
      box(g, 0.04, h * 0.94, 0.06, a, { x: -w / 2 + (w / doors) * i, y: h / 2, z: d / 2 });
    for (let i = 0; i < doors; i++) {
      const cx = -w / 2 + (w / doors) * (i + 0.5);
      const off = (w / doors) * 0.3 * (i % 2 === 0 ? 1 : -1);
      box(g, 0.08, 0.8, 0.08, shade(a, -0.15), { x: cx + off, y: h * 0.52, z: d / 2 + 0.04 });
    }
    box(g, w, 0.15, d, a, { y: h - 0.075 });
  },

  dresser(g, w, d, h, c, a) {
    const baseH = h * 0.42;
    box(g, w, baseH, d, c, { y: baseH / 2 });
    box(g, w * 0.9, 0.05, 0.05, shade(c, -0.15), { y: baseH * 0.55, z: d / 2 });
    box(g, w * 0.6, h - baseH - 0.1, 0.08, a, { y: baseH + (h - baseH) / 2, z: -d * 0.2, roughness: 0.15, metalness: 0.35 });
    box(g, w * 0.66, h - baseH - 0.02, 0.05, shade(c, -0.2), { y: baseH + (h - baseH) / 2, z: -d * 0.2 - 0.07 });
  },

  bookshelf(g, w, d, h, c, a) {
    box(g, w, 0.1, d, c, { y: h - 0.05 });
    box(g, 0.1, h, d, c, { x: -w / 2 + 0.05, y: h / 2 });
    box(g, 0.1, h, d, c, { x: w / 2 - 0.05, y: h / 2 });
    box(g, w, 0.1, d, c, { y: 0.05 });
    box(g, w, h, 0.08, shade(c, -0.18), { y: h / 2, z: -d / 2 + 0.04 });
    const shelves = Math.max(2, Math.floor(h / 1.3));
    for (let i = 1; i <= shelves; i++) {
      const y = (h / (shelves + 1)) * i;
      box(g, w - 0.2, 0.07, d - 0.1, a, { y });
      // books
      const bookCount = Math.max(2, Math.floor(w / 0.5));
      for (let b = 0; b < bookCount; b++) {
        const bw = 0.14 + ((b * 37 + i * 13) % 10) * 0.012;
        const bh = 0.55 + ((b * 53 + i * 29) % 10) * 0.04;
        const hue = ((b * 71 + i * 41) % 360) / 360;
        const col = `#${new THREE.Color().setHSL(hue, 0.32, 0.42).getHexString()}`;
        box(g, bw, bh, d * 0.55, col, { x: -w / 2 + 0.3 + b * ((w - 0.6) / bookCount), y: y + bh / 2 + 0.04 });
      }
    }
  },

  tvUnit(g, w, d, h, c, a) {
    box(g, w, h * 0.85, d, c, { y: h * 0.575 });
    box(g, w * 0.96, 0.05, 0.04, a, { y: h * 0.55, z: d / 2 });
    for (const sx of [-1, 1]) box(g, 0.12, h * 0.15, 0.12, a, { x: sx * (w / 2 - 0.3), y: h * 0.075 });
    box(g, w, 0.08, d, shade(c, 0.08), { y: h - 0.04, roughness: 0.4 });
  },

  shoeRack(g, w, d, h, c, a) {
    box(g, w, h, d, c, { y: h / 2 });
    for (let i = 1; i < 3; i++) box(g, w * 0.94, 0.05, 0.04, a, { y: (h / 3) * i, z: d / 2 });
    box(g, w, 0.1, d + 0.1, shade(c, 0.1), { y: h - 0.05 });
  },

  shelvingUnit(g, w, d, h, c, a) {
    box(g, 0.1, h, d, c, { x: -w / 2 + 0.05, y: h / 2 });
    box(g, 0.1, h, d, c, { x: w / 2 - 0.05, y: h / 2 });
    const shelves = Math.max(3, Math.floor(h / 1.2));
    for (let i = 0; i <= shelves; i++) box(g, w, 0.08, d, a, { y: 0.05 + (h - 0.1) * (i / shelves) });
  },

  tv(g, w, d, h, c, a, ctx) {
    // Wall-mounted (elevated): the whole height is screen. On a stand: screen on a pole.
    const screenH = ctx.elevated ? h : h * 0.62;
    box(g, w, screenH, 0.1, c, { y: h - screenH / 2, roughness: 0.25, metalness: 0.4 });
    box(g, w * 0.94, screenH * 0.88, 0.06, '#101418', { y: h - screenH / 2, z: 0.06, roughness: 0.1, metalness: 0.55 });
    if (!ctx.elevated) {
      cyl(g, 0.06, h - screenH, a, { y: (h - screenH) / 2 });
      box(g, w * 0.4, 0.06, d, a, { y: 0.03 });
    }
  },

  pendantLight(g, w, d, h, c, a) {
    const shadeR = Math.min(w, d) * 0.45;
    cyl(g, 0.025, h * 0.55, '#3a3a3c', { y: h * 0.725, metalness: 0.6, roughness: 0.3 });
    const lampShade = cyl(g, shadeR, h * 0.4, c, { y: h * 0.25, roughness: 0.55 });
    lampShade.material = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15 });
    const bulb = sphere(g, shadeR * 0.4, a, { y: h * 0.12 });
    bulb.material = new THREE.MeshStandardMaterial({
      color: a,
      emissive: new THREE.Color('#ffe6b0'),
      emissiveIntensity: 1.4,
      roughness: 0.4,
    });
  },

  fridge(g, w, d, h, c, a) {
    box(g, w, h, d, c, { y: h / 2, roughness: 0.35, metalness: 0.5 });
    box(g, w, 0.04, 0.05, a, { y: h * 0.68, z: d / 2 });
    box(g, 0.1, h * 0.24, 0.1, a, { x: w / 2 - 0.22, y: h * 0.82, z: d / 2 + 0.05 });
    box(g, 0.1, h * 0.4, 0.1, a, { x: w / 2 - 0.22, y: h * 0.42, z: d / 2 + 0.05 });
  },

  washingMachine(g, w, d, h, c, a) {
    box(g, w, h, d, c, { y: h / 2, roughness: 0.35, metalness: 0.25 });
    cyl(g, Math.min(w, h) * 0.32, 0.08, a, { y: h * 0.45, z: d / 2, rx: Math.PI / 2, roughness: 0.15, metalness: 0.5 });
    cyl(g, Math.min(w, h) * 0.22, 0.1, '#2a3138', { y: h * 0.45, z: d / 2 + 0.02, rx: Math.PI / 2, roughness: 0.1, metalness: 0.6 });
    box(g, w * 0.9, h * 0.1, 0.05, shade(c, -0.15), { y: h * 0.9, z: d / 2 });
  },

  kitchenCounter: buildCounter,
  stove(g, w, d, h, c, a) {
    buildCounter(g, w, d, h, c, shade(c, -0.25));
    box(g, w * 0.8, 0.05, d * 0.7, a, { y: h + 0.03, roughness: 0.3, metalness: 0.3 });
    const half = Math.min(w, d) * 0.16;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        cyl(g, half * 0.45, 0.05, '#4a4a4c', { x: sx * w * 0.18, y: h + 0.08, z: sz * d * 0.15 });
  },

  kitchenSink(g, w, d, h, c, a) {
    buildCounter(g, w, d, h, c, shade(c, -0.25));
    box(g, w * 0.6, 0.06, d * 0.6, a, { y: h + 0.02, roughness: 0.2, metalness: 0.6 });
    box(g, w * 0.5, 0.08, d * 0.5, '#5f666b', { y: h + 0.03, roughness: 0.25, metalness: 0.55 });
    cyl(g, 0.05, 0.7, a, { x: 0, y: h + 0.35, z: -d * 0.24, metalness: 0.7, roughness: 0.2 });
    box(g, 0.4, 0.05, 0.1, a, { y: h + 0.7, z: -d * 0.18, metalness: 0.7, roughness: 0.2 });
  },

  wc(g, w, d, h, c, a) {
    box(g, w * 0.75, h * 0.42, d * 0.35, c, { y: h * 0.55, z: -d * 0.3, roughness: 0.3 });
    cyl(g, Math.min(w, d * 0.6) * 0.5, h * 0.28, c, { y: h * 0.22, z: d * 0.08, roughness: 0.3 });
    const seat = cyl(g, Math.min(w, d * 0.65) * 0.52, 0.1, a, { y: h * 0.38, z: d * 0.08, roughness: 0.3 });
    seat.scale.z *= 1.25;
    box(g, w * 0.4, 0.06, 0.15, shade(a, -0.1), { y: h * 0.72, z: -d * 0.3 + d * 0.18 });
  },

  washbasin(g, w, d, h, c, a) {
    cyl(g, Math.min(w, d) * 0.16, h * 0.75, a, { y: h * 0.375, roughness: 0.35 });
    const basin = cyl(g, Math.min(w, d) * 0.48, h * 0.18, c, { y: h * 0.84, roughness: 0.25 });
    basin.scale.x *= w / Math.min(w, d) / 1;
    cyl(g, 0.04, 0.5, '#b8bcc0', { z: -d * 0.28, y: h * 0.95, metalness: 0.7, roughness: 0.2 });
  },

  shower(g, w, d, h, c, a) {
    box(g, w, 0.12, d, c, { y: 0.06, roughness: 0.4 });
    box(g, w, 0.5, 0.06, a, { y: 0.25, z: -d / 2 + 0.03 });
    cyl(g, 0.05, h * 0.85, a, { x: -w / 2 + 0.2, y: h * 0.425, z: -d / 2 + 0.15, metalness: 0.6, roughness: 0.25 });
    cyl(g, 0.28, 0.05, a, { x: -w / 2 + 0.55, y: h * 0.85, z: -d / 2 + 0.35, metalness: 0.6, roughness: 0.25 });
    box(g, 0.05, h * 0.75, d, '#cfe3e8', { x: w / 2 - 0.03, y: h * 0.375, roughness: 0.05, metalness: 0.1 });
  },

  bathtub(g, w, d, h, c, a) {
    box(g, w, h, d, a, { y: h / 2, roughness: 0.3 });
    box(g, w - 0.35, h * 0.35, d - 0.35, shade(c, 0.05), { y: h - h * 0.17, roughness: 0.2 });
    cyl(g, 0.05, 0.6, '#b8bcc0', { x: -w / 2 + 0.3, y: h + 0.28, metalness: 0.7, roughness: 0.2 });
  },

  utilitySink(g, w, d, h, c, a) {
    box(g, w, h * 0.25, d, c, { y: h * 0.8, roughness: 0.3, metalness: 0.4 });
    box(g, w * 0.8, h * 0.18, d * 0.8, a, { y: h * 0.82, roughness: 0.3, metalness: 0.5 });
    for (const sx of [-1, 1]) cyl(g, 0.05, h * 0.7, a, { x: sx * (w / 2 - 0.15), y: h * 0.35, z: -d / 2 + 0.15 });
    cyl(g, 0.04, 0.5, '#b8bcc0', { y: h * 1.05, z: -d * 0.3, metalness: 0.7, roughness: 0.2 });
  },

  rug(g, w, d, h, c, a) {
    box(g, w, Math.max(h, 0.05), d, c, { y: Math.max(h, 0.05) / 2, roughness: 1 });
    box(g, w * 0.8, Math.max(h, 0.05) + 0.006, d * 0.75, a, { y: Math.max(h, 0.05) / 2, roughness: 1 });
  },

  plant(g, w, d, h, c, a) {
    const potH = h * 0.3;
    cyl(g, Math.min(w, d) * 0.32, potH, a, { y: potH / 2, roughness: 0.7 });
    cyl(g, 0.05, h * 0.35, '#5a4632', { y: potH + h * 0.16 });
    sphere(g, Math.min(w, d) * 0.5, c, { y: h * 0.68 });
    sphere(g, Math.min(w, d) * 0.34, shade(c, 0.08), { x: w * 0.16, y: h * 0.56, z: d * 0.1 });
    sphere(g, Math.min(w, d) * 0.3, shade(c, -0.06), { x: -w * 0.14, y: h * 0.82, z: -d * 0.08 });
  },

  floorLamp(g, w, d, h, c, a) {
    cyl(g, Math.min(w, d) * 0.35, 0.06, a, { y: 0.03 });
    cyl(g, 0.045, h * 0.75, a, { y: h * 0.4, metalness: 0.5, roughness: 0.3 });
    const shadeMesh = cyl(g, Math.min(w, d) * 0.5, h * 0.22, c, { y: h * 0.86, roughness: 0.6 });
    shadeMesh.material = new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.6,
      emissive: new THREE.Color(c),
      emissiveIntensity: 0.35,
    });
  },

  wallArt(g, w, d, h, c, a) {
    const dd = Math.max(d, 0.1);
    box(g, w, h, dd, c, { y: h / 2, roughness: 0.5 });
    box(g, w * 0.86, h * 0.84, dd + 0.02, a, { y: h / 2, roughness: 0.9 });
    box(g, w * 0.4, h * 0.35, dd + 0.04, shade(c, -0.2), { x: -w * 0.12, y: h * 0.55, roughness: 0.9 });
    cyl(g, w * 0.12, dd + 0.05, shade(a, -0.25), { x: w * 0.2, y: h * 0.4, rx: Math.PI / 2 });
  },

  curtainPanel(g, w, d, h, c, a) {
    const folds = Math.max(4, Math.round(w / 0.5));
    for (let i = 0; i < folds; i++) {
      const fx = -w / 2 + (w / folds) * (i + 0.5);
      const fd = d * (0.55 + 0.45 * Math.sin(i * 1.7));
      box(g, w / folds + 0.02, h * 0.97, Math.max(fd, 0.08), i % 2 ? c : a, { x: fx, y: h * 0.485, roughness: 0.95 });
    }
    cyl(g, 0.04, w + 0.3, '#8d7a5a', { y: h - 0.02, rz: Math.PI / 2, metalness: 0.6, roughness: 0.3 });
  },
};

function buildSofa(g: THREE.Group, w: number, d: number, h: number, c: string, a: string) {
  const legH = Math.min(0.35, h * 0.12);
  const body = new THREE.Group();
  body.position.y = legH;
  g.add(body);
  const bh = h - legH;

  const seatH = bh * 0.42;
  const armW = Math.min(0.55, w * 0.12);
  const backD = d * 0.25;
  // base
  box(body, w, seatH * 0.6, d, shade(c, -0.08), { y: seatH * 0.3 });
  // backrest
  box(body, w, bh - seatH * 0.3, backD, c, { y: (bh + seatH * 0.3) / 2 - seatH * 0.15, z: -d / 2 + backD / 2 });
  // arms
  for (const sx of [-1, 1])
    box(body, armW, bh * 0.72, d, c, { x: sx * (w / 2 - armW / 2), y: bh * 0.36 });
  // seat + back cushions
  const innerW = w - armW * 2;
  const seats = Math.max(1, Math.round(innerW / 2.2));
  const cw = innerW / seats - 0.06;
  for (let i = 0; i < seats; i++) {
    const cx = -innerW / 2 + (innerW / seats) * (i + 0.5);
    box(body, cw, seatH * 0.45, d - backD - 0.15, shade(c, 0.07), { x: cx, y: seatH * 0.6 + seatH * 0.22, z: backD / 2 + 0.02, roughness: 0.95 });
    box(body, cw, bh * 0.42, 0.45, shade(a, 0.05), { x: cx, y: seatH + bh * 0.24, z: -d / 2 + backD + 0.2, roughness: 0.95 });
  }
  // tapered wooden legs
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      cyl(g, 0.07, legH, '#5c452f', { x: sx * (w / 2 - 0.3), y: legH / 2, z: sz * (d / 2 - 0.25) });
}

function buildBed(g: THREE.Group, w: number, d: number, h: number, c: string, a: string) {
  const frameH = h * 0.35;
  const headH = h;
  // frame
  box(g, w, frameH, d, c, { y: frameH / 2 });
  // headboard at -z
  box(g, w, headH, 0.25, shade(c, -0.1), { y: headH / 2, z: -d / 2 + 0.125 });
  // mattress
  box(g, w * 0.94, h * 0.28, d * 0.9, shade(a, 0.05), { y: frameH + h * 0.14, z: 0.06, roughness: 0.95 });
  // duvet covering lower 60%
  box(g, w * 0.97, h * 0.14, d * 0.55, shade(c, 0.28), { y: frameH + h * 0.28, z: d * 0.19, roughness: 0.95 });
  // pillows
  const pillows = w > 4.5 ? 2 : 1;
  for (let i = 0; i < pillows; i++) {
    const px = pillows === 1 ? 0 : (i === 0 ? -1 : 1) * w * 0.22;
    box(g, w * 0.36, 0.22, 0.95, '#f4f1ea', { x: px, y: frameH + h * 0.32, z: -d / 2 + 0.85, ry: (i === 0 ? -1 : 1) * 0.06, roughness: 0.95 });
  }
}

function buildCounter(g: THREE.Group, w: number, d: number, h: number, c: string, a: string) {
  box(g, w, h - 0.15, d, c, { y: (h - 0.15) / 2 });
  box(g, w, 0.15, d + 0.08, a, { y: h - 0.075, roughness: 0.35 });
  const doors = Math.max(1, Math.round(w / 1.6));
  for (let i = 1; i < doors; i++) box(g, 0.03, (h - 0.3) * 0.9, 0.04, shade(c, -0.18), { x: -w / 2 + (w / doors) * i, y: (h - 0.15) / 2, z: d / 2 });
  for (let i = 0; i < doors; i++)
    box(g, 0.5, 0.05, 0.06, shade(c, -0.3), { x: -w / 2 + (w / doors) * (i + 0.5), y: h - 0.5, z: d / 2 + 0.03 });
}

/**
 * Build a furniture item as a THREE.Group. Origin: item base (floor level for
 * elevation 0), center of footprint. Callers apply position/rotation/elevation.
 */
export function buildFurniture(item: FurnitureItem): THREE.Group {
  const g = new THREE.Group();
  const builder = builders[item.catalogId];
  const ctx: BuildCtx = { elevated: (item.elevation ?? 0) > 0.5 };
  if (builder) {
    builder(g, item.w, item.d, item.h, item.color, item.accent, ctx);
  } else {
    box(g, item.w, item.h, item.d, item.color, { y: item.h / 2 });
  }
  return g;
}

// ---------------------------------------------------------------------------
// Room shell (floor + walls)
// ---------------------------------------------------------------------------

const floorTexCache = new Map<string, THREE.Texture>();

function makeFloorTexture(style: FloorStyle, color: string): THREE.Texture | null {
  if (style === 'plain') return null;
  const key = `${style}|${color}`;
  const cached = floorTexCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (style === 'wood') {
    const plankH = size / 8;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = shade(color, (i % 2 === 0 ? 1 : -1) * 0.025 + (i % 3) * 0.012);
      ctx.fillRect(0, i * plankH, size, plankH - 2);
      ctx.fillStyle = shade(color, -0.12);
      ctx.fillRect(0, i * plankH + plankH - 2, size, 2);
      const off = ((i * 97) % size);
      ctx.fillRect(off, i * plankH, 2, plankH);
    }
  } else if (style === 'tile') {
    const t = size / 4;
    ctx.strokeStyle = shade(color, -0.14);
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(size, i * t); ctx.stroke();
    }
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 4; y++) {
        ctx.fillStyle = shade(color, ((x * 31 + y * 17) % 5) * 0.008);
        ctx.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
      }
  } else if (style === 'marble') {
    ctx.strokeStyle = shade(color, -0.1);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      let x = (i * 53) % size;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < size) {
        x += Math.sin(y * 0.05 + i) * 9;
        y += 14;
        ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const t = size / 2;
    ctx.strokeStyle = shade(color, -0.18);
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(size, i * t); ctx.stroke();
    }
  } else if (style === 'concrete') {
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = shade(color, (Math.random() - 0.5) * 0.07);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  floorTexCache.set(key, tex);
  return tex;
}

export const WALL_THICKNESS = 0.35;

export interface RoomShellOptions {
  /** Override wall height (used for cutaway dollhouse views). */
  wallHeight?: number;
  /** Skip walls entirely. */
  noWalls?: boolean;
}

interface SolidSpan {
  start: number;
  end: number;
  y0: number;
  y1: number;
}

/**
 * Split a wall of the given length into solid spans around its openings.
 * Doors leave a lintel above; windows leave wall below the sill and above.
 */
function wallSpans(len: number, wallH: number, openings: Opening[]): SolidSpan[] {
  const spans: SolidSpan[] = [];
  const sorted = [...openings]
    .map((o) => {
      const half = Math.min(o.width, len - 0.6) / 2;
      const c = Math.min(Math.max(o.offset, half + 0.2), len - half - 0.2);
      return { ...o, start: c - half, end: c + half };
    })
    .sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const o of sorted) {
    if (o.start > cursor + 0.02) spans.push({ start: cursor, end: o.start, y0: 0, y1: wallH });
    if (o.kind === 'door') {
      if (o.height < wallH - 0.05) spans.push({ start: o.start, end: o.end, y0: o.height, y1: wallH });
    } else {
      const sill = Math.min(o.sill, wallH - 0.4);
      const top = Math.min(sill + o.height, wallH);
      if (sill > 0.05) spans.push({ start: o.start, end: o.end, y0: 0, y1: sill });
      if (top < wallH - 0.05) spans.push({ start: o.start, end: o.end, y0: top, y1: wallH });
    }
    cursor = Math.max(cursor, o.end);
  }
  if (cursor < len - 0.02) spans.push({ start: cursor, end: len, y0: 0, y1: wallH });
  return spans;
}

interface WallDef {
  side: WallSide;
  len: number;
  /** Convert a coordinate along the wall + across offset into room-local x/z. */
  place: (mesh: THREE.Object3D, along: number, y: number, across: number) => void;
  /** Box size for a segment of the wall. */
  size: (spanLen: number, h: number, thickness: number) => [number, number, number];
  outNormal: THREE.Vector3;
  /** Sign pointing into the room, along the wall's across-axis. */
  inward: number;
}

/**
 * Build a room shell centered at origin: floor slab plus 4 walls with door
 * and window openings, frames, glass, door leaves and baseboards.
 * Wall groups carry userData.outNormal so viewers can hide camera-facing walls.
 */
export function buildRoomShell(room: Room, opts: RoomShellOptions = {}): THREE.Group {
  const g = new THREE.Group();
  const { width: w, depth: d } = room;
  // Balconies get open parapet walls instead of full-height walls.
  const fullH = room.type === 'balcony' ? Math.min(3.2, room.wallHeight) : room.wallHeight;
  const wallH = Math.min(opts.wallHeight ?? fullH, fullH);
  const t = WALL_THICKNESS;
  const trim = room.trimColor;

  const floorTex = makeFloorTexture(room.floorStyle, room.floorColor);
  const floorMat = new THREE.MeshStandardMaterial({
    color: floorTex ? '#ffffff' : room.floorColor,
    roughness: room.floorStyle === 'marble' ? 0.35 : 0.75,
    metalness: 0.02,
  });
  if (floorTex) {
    const tex = floorTex.clone();
    tex.repeat.set(Math.max(1, w / 6), Math.max(1, d / 6));
    tex.needsUpdate = true;
    floorMat.map = tex;
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w + t * 2, 0.3, d + t * 2), floorMat);
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  floor.userData.isFloor = true;
  g.add(floor);

  if (opts.noWalls) return g;

  const wallMat = new THREE.MeshStandardMaterial({ color: room.wallColor, roughness: 0.92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#b7d4de',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.32,
  });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#8a6c4e', roughness: 0.65 });

  // N/S walls extend past the corners by the wall thickness so corners are closed.
  const defs: WallDef[] = [
    {
      side: 'N',
      len: w,
      outNormal: new THREE.Vector3(0, 0, -1),
      inward: 1,
      place: (m, along, y, across) => m.position.set(along - w / 2, y, -d / 2 - t / 2 + across),
      size: (s, h, th) => [s, h, th],
    },
    {
      side: 'S',
      len: w,
      outNormal: new THREE.Vector3(0, 0, 1),
      inward: -1,
      place: (m, along, y, across) => m.position.set(along - w / 2, y, d / 2 + t / 2 + across),
      size: (s, h, th) => [s, h, th],
    },
    {
      side: 'W',
      len: d,
      outNormal: new THREE.Vector3(-1, 0, 0),
      inward: 1,
      place: (m, along, y, across) => m.position.set(-w / 2 - t / 2 + across, y, along - d / 2),
      size: (s, h, th) => [th, h, s],
    },
    {
      side: 'E',
      len: d,
      outNormal: new THREE.Vector3(1, 0, 0),
      inward: -1,
      place: (m, along, y, across) => m.position.set(w / 2 + t / 2 + across, y, along - d / 2),
      size: (s, h, th) => [th, h, s],
    },
  ];

  for (const def of defs) {
    const wallGroup = new THREE.Group();
    wallGroup.userData.outNormal = def.outNormal;
    wallGroup.userData.isWall = true;

    const openings = room.openings.filter((o) => o.wall === def.side && o.width < def.len);
    const spans = wallSpans(def.len, wallH, openings);

    for (const span of spans) {
      const spanLen = span.end - span.start;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...def.size(spanLen, span.y1 - span.y0, t)), wallMat);
      def.place(mesh, (span.start + span.end) / 2, (span.y0 + span.y1) / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);

      // Baseboard on the interior face of floor-touching spans.
      if (span.y0 === 0 && span.y1 > 0.5) {
        const bb = new THREE.Mesh(new THREE.BoxGeometry(...def.size(spanLen, 0.35, 0.08)), trimMat);
        def.place(bb, (span.start + span.end) / 2, 0.175, def.inward * (t / 2 + 0.04));
        bb.receiveShadow = true;
        wallGroup.add(bb);
      }
    }

    // Corner extensions for N/S walls to close the wall ring.
    if (def.side === 'N' || def.side === 'S') {
      for (const along of [-t / 2, def.len + t / 2]) {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(t, wallH, t), wallMat);
        def.place(corner, along, wallH / 2, 0);
        corner.castShadow = true;
        corner.receiveShadow = true;
        wallGroup.add(corner);
      }
    }

    // Frames, glass and door leaves.
    for (const o of openings) {
      const half = Math.min(o.width, def.len - 0.6) / 2;
      const c = Math.min(Math.max(o.offset, half + 0.2), def.len - half - 0.2);
      const ow = half * 2;

      if (o.kind === 'door') {
        const doorH = Math.min(o.height, wallH - 0.02);
        if (doorH < 1) continue;
        // jambs
        for (const s of [-1, 1]) {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(...def.size(0.16, doorH, t + 0.12)), trimMat);
          def.place(jamb, c + s * (half - 0.08), doorH / 2, 0);
          jamb.castShadow = true;
          wallGroup.add(jamb);
        }
        // header
        if (o.height < wallH - 0.05) {
          const head = new THREE.Mesh(new THREE.BoxGeometry(...def.size(ow, 0.16, t + 0.12)), trimMat);
          def.place(head, c, doorH + 0.08, 0);
          wallGroup.add(head);
        }
        // door leaf, hinged ~28 degrees open into the room
        const leafW = ow - 0.32;
        const leafH = doorH - 0.12;
        const pivot = new THREE.Group();
        def.place(pivot, c - half + 0.16, 0, def.inward * (t / 2));
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.09), doorMat);
        leaf.position.set(leafW / 2, leafH / 2, 0);
        leaf.castShadow = true;
        const handle = new THREE.Mesh(unitSphere, mat('#c9b98a', 0.3, 0.7));
        handle.scale.setScalar(0.14);
        handle.position.set(leafW - 0.25, leafH * 0.48, 0.1);
        pivot.add(leaf, handle);
        // Orient the pivot along the wall, then swing the leaf into the room.
        const swing: Record<WallSide, [number, number]> = {
          N: [0, -0.5],
          S: [0, 0.5],
          W: [-Math.PI / 2, 0.5],
          E: [-Math.PI / 2, -0.5],
        };
        pivot.rotation.y = swing[def.side][0] + swing[def.side][1];
        wallGroup.add(pivot);
      } else {
        const sill = Math.min(o.sill, wallH - 0.4);
        const top = Math.min(sill + o.height, wallH);
        const wh = top - sill;
        if (wh < 0.3) continue;
        // frame: sill board, top board, side jambs
        const sillBoard = new THREE.Mesh(new THREE.BoxGeometry(...def.size(ow + 0.2, 0.12, t + 0.16)), trimMat);
        def.place(sillBoard, c, sill - 0.06, 0);
        wallGroup.add(sillBoard);
        if (top < wallH - 0.02) {
          const topBoard = new THREE.Mesh(new THREE.BoxGeometry(...def.size(ow, 0.12, t + 0.1)), trimMat);
          def.place(topBoard, c, top + 0.06, 0);
          wallGroup.add(topBoard);
        }
        for (const s of [-1, 1]) {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(...def.size(0.12, wh, t + 0.1)), trimMat);
          def.place(jamb, c + s * (half - 0.06), sill + wh / 2, 0);
          wallGroup.add(jamb);
        }
        // center mullion + glass
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(...def.size(0.07, wh, t * 0.4)), trimMat);
        def.place(mullion, c, sill + wh / 2, 0);
        wallGroup.add(mullion);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(...def.size(ow - 0.1, wh - 0.08, 0.05)), glassMat);
        def.place(glass, c, sill + wh / 2, 0);
        wallGroup.add(glass);
      }
    }

    g.add(wallGroup);
  }
  return g;
}

/** Dispose of geometries created for a shell group (materials are cached/shared for furniture). */
export function disposeGroup(g: THREE.Group) {
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry !== unitBox && obj.geometry !== unitCyl && obj.geometry !== unitSphere) {
        obj.geometry.dispose();
      }
    }
  });
}
