import type { FurnitureItem, Room, RoomType } from '../types';
import { CATALOG_MAP } from './catalog';
import { uid } from '../utils/id';
import { clamp } from '../utils/units';

/** Visual defaults per room type: wall/floor finishes. */
export const ROOM_FINISHES: Record<RoomType, { wallColor: string; floorColor: string; floorStyle: Room['floorStyle'] }> = {
  living: { wallColor: '#e8e2d5', floorColor: '#b08a63', floorStyle: 'wood' },
  bedroom: { wallColor: '#e5ded2', floorColor: '#a87e5a', floorStyle: 'wood' },
  kitchen: { wallColor: '#ece7dc', floorColor: '#c9c2b4', floorStyle: 'tile' },
  dining: { wallColor: '#e8e2d5', floorColor: '#b08a63', floorStyle: 'wood' },
  toilet: { wallColor: '#dfe5e4', floorColor: '#c3cbc9', floorStyle: 'tile' },
  balcony: { wallColor: '#ded8c9', floorColor: '#b8a284', floorStyle: 'tile' },
  store: { wallColor: '#e3ddd0', floorColor: '#c9c2b4', floorStyle: 'tile' },
  wash: { wallColor: '#e0e6e5', floorColor: '#c3cbc9', floorStyle: 'tile' },
  vestibule: { wallColor: '#e8e2d5', floorColor: '#cfc6b5', floorStyle: 'marble' },
  study: { wallColor: '#e2ddd1', floorColor: '#a87e5a', floorStyle: 'wood' },
  other: { wallColor: '#e8e2d5', floorColor: '#cfc6b5', floorStyle: 'plain' },
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living: 'Living / Drawing Room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  dining: 'Kitchen / Dining',
  toilet: 'Toilet / Bath',
  balcony: 'Balcony',
  store: 'Store',
  wash: 'Wash Area',
  vestibule: 'Vestibule / Foyer',
  study: 'Study',
  other: 'Other',
};

interface Placement {
  catalogId: string;
  /** Fractional position of item center inside room (0..1 of width/depth). */
  fx: number;
  fz: number;
  rotation: number;
  /** Optional scale relative to catalog defaults. */
  scale?: number;
  /** Minimum room dimension (largest of w/d) required to include this item. */
  minRoom?: number;
}

const PRESETS: Record<RoomType, Placement[]> = {
  living: [
    { catalogId: 'sofa3', fx: 0.5, fz: 0.86, rotation: 180 },
    { catalogId: 'armchair', fx: 0.14, fz: 0.62, rotation: 90, minRoom: 11 },
    { catalogId: 'coffeeTable', fx: 0.5, fz: 0.58, rotation: 0 },
    { catalogId: 'rug', fx: 0.5, fz: 0.6, rotation: 0 },
    { catalogId: 'tvUnit', fx: 0.5, fz: 0.06, rotation: 0 },
    { catalogId: 'tv', fx: 0.5, fz: 0.08, rotation: 0 },
    { catalogId: 'plant', fx: 0.92, fz: 0.08, rotation: 0 },
    { catalogId: 'floorLamp', fx: 0.08, fz: 0.9, rotation: 0, minRoom: 10 },
    { catalogId: 'sideTable', fx: 0.88, fz: 0.88, rotation: 0, minRoom: 12 },
  ],
  bedroom: [
    { catalogId: 'bedDouble', fx: 0.42, fz: 0.55, rotation: 0 },
    { catalogId: 'sideTable', fx: 0.09, fz: 0.28, rotation: 0 },
    { catalogId: 'sideTable', fx: 0.75, fz: 0.28, rotation: 0 },
    { catalogId: 'wardrobe', fx: 0.72, fz: 0.91, rotation: 180, minRoom: 9 },
    { catalogId: 'dresser', fx: 0.92, fz: 0.35, rotation: 270, minRoom: 10.5 },
    { catalogId: 'rug', fx: 0.42, fz: 0.62, rotation: 0, scale: 0.85 },
    { catalogId: 'wallArt', fx: 0.15, fz: 0.03, rotation: 0 },
  ],
  kitchen: [
    { catalogId: 'kitchenCounter', fx: 0.3, fz: 0.93, rotation: 180 },
    { catalogId: 'stove', fx: 0.7, fz: 0.93, rotation: 180 },
    { catalogId: 'kitchenSink', fx: 0.9, fz: 0.6, rotation: 270 },
    { catalogId: 'fridge', fx: 0.09, fz: 0.72, rotation: 90 },
  ],
  dining: [
    { catalogId: 'kitchenCounter', fx: 0.32, fz: 0.94, rotation: 180 },
    { catalogId: 'stove', fx: 0.72, fz: 0.94, rotation: 180 },
    { catalogId: 'kitchenSink', fx: 0.9, fz: 0.68, rotation: 270 },
    { catalogId: 'fridge', fx: 0.09, fz: 0.78, rotation: 90 },
    { catalogId: 'diningTable', fx: 0.5, fz: 0.22, rotation: 0 },
    { catalogId: 'diningChair', fx: 0.32, fz: 0.12, rotation: 180 },
    { catalogId: 'diningChair', fx: 0.68, fz: 0.12, rotation: 180 },
    { catalogId: 'diningChair', fx: 0.32, fz: 0.34, rotation: 0 },
    { catalogId: 'diningChair', fx: 0.68, fz: 0.34, rotation: 0 },
  ],
  toilet: [
    { catalogId: 'wc', fx: 0.24, fz: 0.16, rotation: 0 },
    { catalogId: 'washbasin', fx: 0.75, fz: 0.14, rotation: 0 },
    { catalogId: 'shower', fx: 0.3, fz: 0.78, rotation: 180, scale: 0.8, minRoom: 5.5 },
  ],
  balcony: [
    { catalogId: 'armchair', fx: 0.2, fz: 0.5, rotation: 90, scale: 0.85 },
    { catalogId: 'sideTable', fx: 0.45, fz: 0.5, rotation: 0, scale: 0.85 },
    { catalogId: 'armchair', fx: 0.7, fz: 0.5, rotation: 270, scale: 0.85 },
    { catalogId: 'plant', fx: 0.93, fz: 0.5, rotation: 0 },
  ],
  store: [{ catalogId: 'shelvingUnit', fx: 0.5, fz: 0.85, rotation: 180, scale: 0.9 }],
  wash: [
    { catalogId: 'washingMachine', fx: 0.18, fz: 0.5, rotation: 90 },
    { catalogId: 'utilitySink', fx: 0.6, fz: 0.75, rotation: 180 },
  ],
  vestibule: [
    { catalogId: 'shoeRack', fx: 0.5, fz: 0.85, rotation: 180, scale: 0.9 },
    { catalogId: 'wallArt', fx: 0.2, fz: 0.05, rotation: 0, scale: 0.8 },
  ],
  study: [
    { catalogId: 'desk', fx: 0.5, fz: 0.1, rotation: 0 },
    { catalogId: 'diningChair', fx: 0.5, fz: 0.3, rotation: 0 },
    { catalogId: 'bookshelf', fx: 0.9, fz: 0.6, rotation: 270 },
    { catalogId: 'plant', fx: 0.08, fz: 0.08, rotation: 0 },
  ],
  other: [],
};

/** Create a furniture item from a catalog entry with default sizing. */
export function createItem(catalogId: string, x: number, z: number, scale = 1): FurnitureItem {
  const entry = CATALOG_MAP[catalogId];
  return {
    id: uid('f_'),
    catalogId,
    label: entry.label,
    x,
    z,
    rotation: 0,
    w: entry.w * scale,
    d: entry.d * scale,
    h: entry.h * scale,
    color: entry.color,
    accent: entry.accent,
  };
}

/**
 * Generate the initial furniture layout for a room based on its type and
 * size. Items that would not fit are skipped; positions are clamped so
 * everything stays within walls.
 */
export function autoFurnish(type: RoomType, width: number, depth: number): FurnitureItem[] {
  const placements = PRESETS[type] ?? [];
  const items: FurnitureItem[] = [];
  const maxDim = Math.max(width, depth);

  for (const p of placements) {
    if (p.minRoom && maxDim < p.minRoom) continue;
    const entry = CATALOG_MAP[p.catalogId];
    if (!entry) continue;

    let scale = p.scale ?? 1;
    // Shrink to fit small rooms (keep at least 55% of catalog size).
    const rotated = p.rotation % 180 !== 0;
    const footW = rotated ? entry.d : entry.w;
    const footD = rotated ? entry.w : entry.d;
    const fitScale = Math.min((width - 0.8) / footW, (depth - 0.8) / footD, 1);
    if (fitScale < 0.55) continue;
    scale = Math.min(scale, fitScale);

    const item = createItem(p.catalogId, 0, 0, scale);
    item.rotation = p.rotation;
    const halfW = (rotated ? item.d : item.w) / 2;
    const halfD = (rotated ? item.w : item.d) / 2;
    item.x = clamp(p.fx * width, halfW + 0.2, width - halfW - 0.2);
    item.z = clamp(p.fz * depth, halfD + 0.2, depth - halfD - 0.2);
    items.push(item);
  }
  return items;
}
