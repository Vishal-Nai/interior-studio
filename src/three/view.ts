import type { Room } from '../types';

export interface CameraCorner {
  sx: 1 | -1;
  sz: 1 | -1;
}

/**
 * Pick the room corner to view from: the one with the least tall furniture
 * nearby, so wardrobes/fridges don't block the camera.
 */
export function pickCameraCorner(room: Room): CameraCorner {
  const corners: CameraCorner[] = [
    { sx: 1, sz: 1 },
    { sx: -1, sz: 1 },
    { sx: 1, sz: -1 },
    { sx: -1, sz: -1 },
  ];
  const maxDist = Math.hypot(room.width, room.depth);
  let best = corners[0];
  let bestScore = Infinity;

  for (const c of corners) {
    const cornerX = ((c.sx + 1) / 2) * room.width;
    const cornerZ = ((c.sz + 1) / 2) * room.depth;
    let score = 0;
    for (const item of room.items) {
      if (item.h < 3) continue;
      const dist = Math.hypot(item.x - cornerX, item.z - cornerZ);
      score += item.h * Math.max(item.w, item.d) * Math.max(0, 1 - dist / (maxDist * 0.65));
    }
    if (score < bestScore - 1e-6) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
