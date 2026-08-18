import { useEffect, useState } from 'react';
import type { Project, Room } from '../types';
import { useStore } from '../store/useStore';
import { RoomScene, type ViewRequest } from './three/RoomScene';
import { CatalogPanel } from './CatalogPanel';
import { Inspector } from './Inspector';
import { formatSize } from '../utils/units';
import { ROOM_TYPE_LABELS } from '../data/presets';

export function RoomEditor({ project, room }: { project: Project; room: Room }) {
  const updateRoom = useStore((s) => s.updateRoom);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);
  const duplicateItem = useStore((s) => s.duplicateItem);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null);

  // Keyboard shortcuts: R rotate, Delete remove, Ctrl/Cmd+D duplicate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!selectedItemId) return;
      const item = room.items.find((it) => it.id === selectedItemId);
      if (!item) return;
      if (e.key === 'r' || e.key === 'R') {
        updateItem(project.id, room.id, item.id, { rotation: (item.rotation + 15) % 360 });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        removeItem(project.id, room.id, item.id);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateItem(project.id, room.id, item.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItemId, room, project.id, updateItem, removeItem, duplicateItem]);

  return (
    <div className="room-editor">
      <div className="editor-topbar">
        <div className="editor-room-info">
          <span className="editor-room-name">{room.name}</span>
          <span className="editor-room-meta">
            {ROOM_TYPE_LABELS[room.type]} &middot; {formatSize(room.width, room.depth)} &middot;{' '}
            {Math.round(room.width * room.depth)} sq.ft
          </span>
        </div>
        <div className="editor-actions">
          <button className="btn small" onClick={() => setViewRequest({ mode: 'corner', nonce: Date.now() })}>
            3/4 View
          </button>
          <button className="btn small" onClick={() => setViewRequest({ mode: 'top', nonce: Date.now() })}>
            Top View
          </button>
          <button
            className={`btn small ${room.approved ? 'approved' : 'approve'}`}
            onClick={() => updateRoom(project.id, room.id, { approved: !room.approved })}
          >
            {room.approved ? 'Approved ✓' : 'Mark Approved'}
          </button>
        </div>
      </div>
      <div className="editor-body">
        <CatalogPanel projectId={project.id} room={room} />
        <div className="canvas-wrap">
          <RoomScene room={room} projectId={project.id} viewRequest={viewRequest} />
          <div className="canvas-hint">Drag furniture to move &middot; R = rotate &middot; Del = remove &middot; Scroll = zoom</div>
        </div>
        <Inspector projectId={project.id} room={room} />
      </div>
    </div>
  );
}
