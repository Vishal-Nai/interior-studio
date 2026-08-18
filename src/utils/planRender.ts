import type { Project, RoomType } from '../types';
import { formatSize } from './units';

const TYPE_FILL: Record<RoomType, string> = {
  living: '#e9e4da',
  bedroom: '#e3ddd2',
  kitchen: '#efe9db',
  dining: '#efe9db',
  toilet: '#ddeaec',
  balcony: '#d8e4c8',
  store: '#e7e2d6',
  wash: '#ddeaec',
  vestibule: '#ece6d8',
  study: '#e3ddd2',
  other: '#e8e4dc',
};

/** Render a schematic 2D plan of the project's rooms to a data URL. */
export function renderPlanSchematic(project: Project, scalePx = 26): string | null {
  const rooms = project.rooms;
  if (rooms.length === 0) return null;

  const minX = Math.min(...rooms.map((r) => r.x));
  const minZ = Math.min(...rooms.map((r) => r.z));
  const maxX = Math.max(...rooms.map((r) => r.x + r.width));
  const maxZ = Math.max(...rooms.map((r) => r.z + r.depth));
  const pad = 1.5;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((maxX - minX + pad * 2) * scalePx);
  canvas.height = Math.ceil((maxZ - minZ + pad * 2) * scalePx);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f7f5f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tx = (v: number) => (v - minX + pad) * scalePx;
  const tz = (v: number) => (v - minZ + pad) * scalePx;

  for (const room of rooms) {
    const x = tx(room.x);
    const y = tz(room.z);
    const w = room.width * scalePx;
    const h = room.depth * scalePx;

    ctx.fillStyle = TYPE_FILL[room.type] ?? '#e8e4dc';
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = Math.max(3, scalePx * 0.16);
    ctx.strokeStyle = '#2b2b2b';
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#3a3a3a';
    const nameSize = Math.max(10, scalePx * 0.42);
    ctx.font = `600 ${nameSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillText(room.name.toUpperCase(), cx, cy - nameSize * 0.55, w - 8);
    ctx.font = `400 ${Math.max(9, scalePx * 0.34)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#6a6a6a';
    ctx.fillText(formatSize(room.width, room.depth), cx, cy + nameSize * 0.65, w - 8);
  }
  return canvas.toDataURL('image/png');
}
