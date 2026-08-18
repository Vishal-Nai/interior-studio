import type { Project, Room, RoomType } from '../types';
import { uid } from '../utils/id';
import { autoFurnish, defaultOpenings, DEFAULT_TRIM, ROOM_FINISHES } from './presets';

interface SeedRoom {
  name: string;
  type: RoomType;
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * Sample 2BHK+ flat matching the reference floor plan (Flat 104):
 * three bedrooms, three toilets, drawing room, kitchen/dining, balcony,
 * store, wash area and vestibule. Positions/sizes in feet.
 */
const SEED_ROOMS: SeedRoom[] = [
  { name: 'Toilet 1', type: 'toilet', x: 2.5, z: 2.5, w: 6, d: 4 },
  { name: 'Toilet 2', type: 'toilet', x: 2.5, z: 7, w: 4, d: 6.1 },
  { name: 'Master Bed Room', type: 'bedroom', x: 9.5, z: 2.5, w: 10.6, d: 10.5 },
  { name: 'Bed Room 2', type: 'bedroom', x: 20.5, z: 2.5, w: 10, d: 10.5 },
  { name: 'Balcony', type: 'balcony', x: 31, z: 2.5, w: 11, d: 4 },
  { name: 'Drawing Room', type: 'living', x: 31, z: 7, w: 11, d: 16.5 },
  { name: 'Bed Room 3', type: 'bedroom', x: 3, z: 13.5, w: 13, d: 10.5 },
  { name: 'Kitchen / Dining', type: 'dining', x: 21.5, z: 13.5, w: 9, d: 14.5 },
  { name: 'Store', type: 'store', x: 17.5, z: 16, w: 3, d: 4.6 },
  { name: 'Toilet 3', type: 'toilet', x: 13, z: 17, w: 4, d: 6 },
  { name: 'Wash Area', type: 'wash', x: 13, z: 23.5, w: 7, d: 4.75 },
  { name: 'Vestibule', type: 'vestibule', x: 31, z: 24, w: 4, d: 4.9 },
];

export function createSampleProject(): Project {
  const rooms: Room[] = SEED_ROOMS.map((s) => {
    const finishes = ROOM_FINISHES[s.type];
    return {
      id: uid('r_'),
      name: s.name,
      type: s.type,
      x: s.x,
      z: s.z,
      width: s.w,
      depth: s.d,
      wallHeight: 9,
      wallColor: finishes.wallColor,
      trimColor: DEFAULT_TRIM,
      floorColor: finishes.floorColor,
      floorStyle: finishes.floorStyle,
      openings: defaultOpenings(s.type, s.w),
      items: autoFurnish(s.type, s.w, s.d),
      approved: false,
      notes: '',
    };
  });

  return {
    id: uid('p_'),
    name: 'Sample Flat 104 - 3BHK',
    client: 'Demo Customer',
    notes: 'Sample project generated from the reference floor plan.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    planImage: null,
    pixelsPerFoot: 20,
    rooms,
  };
}
