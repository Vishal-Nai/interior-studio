export type RoomType =
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'dining'
  | 'toilet'
  | 'balcony'
  | 'store'
  | 'wash'
  | 'vestibule'
  | 'study'
  | 'other';

export type FloorStyle = 'wood' | 'tile' | 'marble' | 'concrete' | 'plain';

/** A single placeable object inside a room. All dimensions in feet. */
export interface FurnitureItem {
  id: string;
  catalogId: string;
  label: string;
  /** Center position in room-local coordinates (feet from room's top-left corner). */
  x: number;
  z: number;
  /** Rotation around Y axis in degrees. */
  rotation: number;
  w: number;
  d: number;
  h: number;
  /** Height of the item's base above the floor (wall-mounted TVs, art, pendants). */
  elevation: number;
  color: string;
  accent: string;
}

/** Wall identifier in room-local plan orientation. */
export type WallSide = 'N' | 'S' | 'E' | 'W'; // N = back (-z), S = front (+z), W = left (-x), E = right (+x)

/** A door or window opening cut into a room wall. */
export interface Opening {
  id: string;
  kind: 'door' | 'window';
  wall: WallSide;
  /** Distance (feet) from the wall's start corner to the opening center. */
  offset: number;
  width: number;
  height: number;
  /** Window sill height from the floor (ignored for doors). */
  sill: number;
}

/** A rectangular room traced on the floor plan. All units in feet. */
export interface Room {
  id: string;
  name: string;
  type: RoomType;
  /** Top-left corner in plan coordinates (feet). */
  x: number;
  z: number;
  width: number;
  depth: number;
  wallHeight: number;
  wallColor: string;
  /** Baseboards, door/window frames. */
  trimColor: string;
  floorColor: string;
  floorStyle: FloorStyle;
  openings: Opening[];
  items: FurnitureItem[];
  approved: boolean;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  /** Uploaded 2D floor plan image (data URL). */
  planImage: string | null;
  /** Calibration: floor-plan image pixels per foot. */
  pixelsPerFoot: number;
  rooms: Room[];
}

export type Route =
  | { view: 'dashboard' }
  | { view: 'project'; projectId: string; tab: 'plan' | 'overview' }
  | { view: 'project'; projectId: string; tab: 'room'; roomId: string };
