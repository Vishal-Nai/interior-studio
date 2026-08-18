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
  color: string;
  accent: string;
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
  floorColor: string;
  floorStyle: FloorStyle;
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
