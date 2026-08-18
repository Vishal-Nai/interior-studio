import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Project, Room, RoomType } from '../types';
import { useStore } from '../store/useStore';
import { Modal } from './Modal';
import { ROOM_TYPE_LABELS } from '../data/presets';
import { formatSize, round1, clamp } from '../utils/units';

type Mode = 'select' | 'draw' | 'calibrate';

interface DraftRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const TYPE_OPTIONS = Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][];

const TYPE_COLORS: Record<string, string> = {
  living: '#c9a06a',
  bedroom: '#8fa876',
  kitchen: '#d0885f',
  dining: '#d0885f',
  toilet: '#6fa3b0',
  balcony: '#7fb069',
  store: '#a08f77',
  wash: '#6fa3b0',
  vestibule: '#b08fb0',
  study: '#8fa876',
  other: '#999999',
};

export function PlanEditor({ project }: { project: Project }) {
  const updateProject = useStore((s) => s.updateProject);
  const addRoom = useStore((s) => s.addRoom);
  const updateRoom = useStore((s) => s.updateRoom);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const refurnishRoom = useStore((s) => s.refurnishRoom);
  const navigate = useStore((s) => s.navigate);

  const [mode, setMode] = useState<Mode>(project.rooms.length === 0 ? 'draw' : 'select');
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [calibPts, setCalibPts] = useState<{ x: number; y: number }[]>([]);
  const [calibDist, setCalibDist] = useState('10');
  const [pendingRect, setPendingRect] = useState<{ x: number; z: number; w: number; d: number } | null>(null);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'bedroom' as RoomType, furnish: true });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const moving = useRef<{ roomId: string; startX: number; startY: number; origX: number; origZ: number; resize: boolean; origW: number; origD: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ppf = project.pixelsPerFoot;

  useEffect(() => {
    if (!project.planImage) {
      setImgSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = project.planImage;
  }, [project.planImage]);

  // View size: image dimensions, or a synthetic grid sized to fit rooms.
  const bounds = project.rooms.reduce(
    (acc, r) => ({
      maxX: Math.max(acc.maxX, r.x + r.width),
      maxZ: Math.max(acc.maxZ, r.z + r.depth),
    }),
    { maxX: 40, maxZ: 30 },
  );
  const viewW = project.planImage && imgSize ? imgSize.w : (bounds.maxX + 6) * ppf;
  const viewH = project.planImage && imgSize ? imgSize.h : (bounds.maxZ + 6) * ppf;

  const toView = (e: ReactPointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * viewW,
      y: ((e.clientY - rect.top) / rect.height) * viewH,
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = toView(e);
    if (mode === 'draw') {
      drawing.current = true;
      setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      (e.target as Element).setPointerCapture(e.pointerId);
    } else if (mode === 'calibrate') {
      const pts = [...calibPts, p];
      setCalibPts(pts);
    } else {
      setSelectedRoomId(null);
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (drawing.current && draft) {
      const p = toView(e);
      setDraft({ ...draft, x1: p.x, y1: p.y });
    } else if (moving.current) {
      const p = toView(e);
      const m = moving.current;
      const dxFt = (p.x - m.startX) / ppf;
      const dzFt = (p.y - m.startY) / ppf;
      if (m.resize) {
        updateRoom(project.id, m.roomId, {
          width: round1(Math.max(2, m.origW + dxFt)),
          depth: round1(Math.max(2, m.origD + dzFt)),
        });
      } else {
        updateRoom(project.id, m.roomId, {
          x: round1(m.origX + dxFt),
          z: round1(m.origZ + dzFt),
        });
      }
    }
  };

  const onPointerUp = () => {
    if (drawing.current && draft) {
      drawing.current = false;
      const wPx = Math.abs(draft.x1 - draft.x0);
      const hPx = Math.abs(draft.y1 - draft.y0);
      if (wPx > 12 && hPx > 12) {
        setPendingRect({
          x: round1(Math.min(draft.x0, draft.x1) / ppf),
          z: round1(Math.min(draft.y0, draft.y1) / ppf),
          w: round1(wPx / ppf),
          d: round1(hPx / ppf),
        });
        setNewRoom({ name: `Room ${project.rooms.length + 1}`, type: 'bedroom', furnish: true });
      }
      setDraft(null);
    }
    moving.current = null;
  };

  const startMoveRoom = (e: ReactPointerEvent, room: Room, resize: boolean) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    setSelectedRoomId(room.id);
    const p = toView(e);
    moving.current = {
      roomId: room.id,
      startX: p.x,
      startY: p.y,
      origX: room.x,
      origZ: room.z,
      origW: room.width,
      origD: room.depth,
      resize,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateProject(project.id, { planImage: reader.result as string });
    reader.readAsDataURL(file);
  };

  const confirmCalibration = () => {
    const feet = parseFloat(calibDist);
    if (calibPts.length === 2 && feet > 0) {
      const dx = calibPts[1].x - calibPts[0].x;
      const dy = calibPts[1].y - calibPts[0].y;
      const px = Math.hypot(dx, dy);
      updateProject(project.id, { pixelsPerFoot: px / feet });
    }
    setCalibPts([]);
    setMode('select');
  };

  const confirmNewRoom = () => {
    if (!pendingRect) return;
    const roomId = addRoom(project.id, {
      name: newRoom.name || 'Room',
      type: newRoom.type,
      x: pendingRect.x,
      z: pendingRect.z,
      width: Math.max(2, pendingRect.w),
      depth: Math.max(2, pendingRect.d),
      furnish: newRoom.furnish,
    });
    setPendingRect(null);
    setSelectedRoomId(roomId);
    setMode('select');
  };

  const selectedRoom = project.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const gridLines = [];
  if (!project.planImage) {
    for (let x = 0; x <= viewW; x += ppf * 5) gridLines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={viewH} className="grid-line" />);
    for (let y = 0; y <= viewH; y += ppf * 5) gridLines.push(<line key={`h${y}`} x1={0} y1={y} x2={viewW} y2={y} className="grid-line" />);
  }

  return (
    <div className="plan-editor">
      <div className="plan-toolbar">
        <div className="tool-group">
          <button className={`btn small ${mode === 'select' ? 'active' : ''}`} onClick={() => setMode('select')}>
            Select / Move
          </button>
          <button className={`btn small ${mode === 'draw' ? 'active' : ''}`} onClick={() => setMode('draw')}>
            + Draw Room
          </button>
          <button
            className={`btn small ${mode === 'calibrate' ? 'active' : ''}`}
            onClick={() => {
              setMode('calibrate');
              setCalibPts([]);
            }}
          >
            Calibrate Scale
          </button>
        </div>
        <div className="tool-group">
          <button className="btn small" onClick={() => fileRef.current?.click()}>
            {project.planImage ? 'Replace Plan Image' : 'Upload Plan Image'}
          </button>
          {project.planImage && (
            <button className="btn small" onClick={() => updateProject(project.id, { planImage: null })}>
              Remove Image
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="tool-group">
          <button className="btn small" onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}>-</button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="btn small" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>+</button>
          <span className="scale-label">Scale: {ppf.toFixed(1)} px/ft</span>
        </div>
      </div>

      <div className="plan-hint">
        {mode === 'draw' && 'Drag a rectangle over a room on the plan to create it.'}
        {mode === 'calibrate' && `Click two points with a known distance (e.g. ends of a wall with a marked dimension). ${calibPts.length}/2 points selected.`}
        {mode === 'select' && 'Click a room to select it. Drag to move, drag the corner handle to resize. Double-click to open the 3D editor.'}
      </div>

      <div className="plan-body">
        <div className="plan-canvas">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewW} ${viewH}`}
            style={{ width: viewW * zoom * (project.planImage ? 0.7 : 1), cursor: mode === 'draw' ? 'crosshair' : mode === 'calibrate' ? 'crosshair' : 'default' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {project.planImage && imgSize ? (
              <image href={project.planImage} width={viewW} height={viewH} />
            ) : (
              <>
                <rect width={viewW} height={viewH} fill="#22252b" />
                {gridLines}
              </>
            )}

            {project.rooms.map((room) => {
              const sel = room.id === selectedRoomId;
              const color = TYPE_COLORS[room.type] ?? '#999';
              return (
                <g key={room.id}>
                  <rect
                    x={room.x * ppf}
                    y={room.z * ppf}
                    width={room.width * ppf}
                    height={room.depth * ppf}
                    fill={color}
                    fillOpacity={sel ? 0.42 : 0.22}
                    stroke={color}
                    strokeWidth={sel ? 3 : 1.6}
                    style={{ cursor: mode === 'select' ? 'move' : undefined }}
                    onPointerDown={(e) => startMoveRoom(e, room, false)}
                    onDoubleClick={() =>
                      navigate({ view: 'project', projectId: project.id, tab: 'room', roomId: room.id })
                    }
                  />
                  <text
                    x={(room.x + room.width / 2) * ppf}
                    y={(room.z + room.depth / 2) * ppf}
                    className="room-label"
                    style={{ fontSize: Math.max(10, ppf * 0.5) }}
                  >
                    {room.name}
                  </text>
                  <text
                    x={(room.x + room.width / 2) * ppf}
                    y={(room.z + room.depth / 2) * ppf + Math.max(10, ppf * 0.55)}
                    className="room-label dim"
                    style={{ fontSize: Math.max(8, ppf * 0.38) }}
                  >
                    {formatSize(room.width, room.depth)}
                  </text>
                  {sel && mode === 'select' && (
                    <rect
                      x={(room.x + room.width) * ppf - 6}
                      y={(room.z + room.depth) * ppf - 6}
                      width={12}
                      height={12}
                      fill="#d9a95c"
                      style={{ cursor: 'nwse-resize' }}
                      onPointerDown={(e) => startMoveRoom(e, room, true)}
                    />
                  )}
                </g>
              );
            })}

            {draft && (
              <rect
                x={Math.min(draft.x0, draft.x1)}
                y={Math.min(draft.y0, draft.y1)}
                width={Math.abs(draft.x1 - draft.x0)}
                height={Math.abs(draft.y1 - draft.y0)}
                fill="#d9a95c"
                fillOpacity={0.25}
                stroke="#d9a95c"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}

            {calibPts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={6} fill="#e35d5d" />
            ))}
            {calibPts.length === 2 && (
              <line x1={calibPts[0].x} y1={calibPts[0].y} x2={calibPts[1].x} y2={calibPts[1].y} stroke="#e35d5d" strokeWidth={2.5} />
            )}
          </svg>
        </div>

        {selectedRoom && (
          <div className="panel plan-side">
            <div className="panel-title">{selectedRoom.name}</div>
            <div className="panel-scroll">
              <div className="inspector-section">
                <label className="field">
                  <span className="field-label">Name</span>
                  <input
                    className="text-input"
                    value={selectedRoom.name}
                    onChange={(e) => updateRoom(project.id, selectedRoom.id, { name: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Type</span>
                  <select
                    className="select-input"
                    value={selectedRoom.type}
                    onChange={(e) => updateRoom(project.id, selectedRoom.id, { type: e.target.value as RoomType })}
                  >
                    {TYPE_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
                <div className="field-grid">
                  {(['x', 'z', 'width', 'depth'] as const).map((k) => (
                    <label className="field" key={k}>
                      <span className="field-label">{{ x: 'X', z: 'Z', width: 'W', depth: 'D' }[k]} (ft)</span>
                      <input
                        type="number"
                        step={0.1}
                        value={round1(selectedRoom[k])}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v))
                            updateRoom(project.id, selectedRoom.id, {
                              [k]: k === 'width' || k === 'depth' ? clamp(v, 2, 80) : v,
                            });
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="inspector-section">
                <button
                  className="btn primary full"
                  onClick={() =>
                    navigate({ view: 'project', projectId: project.id, tab: 'room', roomId: selectedRoom.id })
                  }
                >
                  Open 3D Editor
                </button>
                <button className="btn small full" onClick={() => refurnishRoom(project.id, selectedRoom.id)}>
                  Auto-furnish
                </button>
                <button
                  className="btn small danger full"
                  onClick={() => {
                    if (confirm(`Delete "${selectedRoom.name}"?`)) {
                      deleteRoom(project.id, selectedRoom.id);
                      setSelectedRoomId(null);
                    }
                  }}
                >
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingRect && (
        <Modal title="New Room" onClose={() => setPendingRect(null)}>
          <label className="field">
            <span className="field-label">Room name</span>
            <input
              className="text-input"
              autoFocus
              value={newRoom.name}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Room type (determines auto-furniture)</span>
            <select
              className="select-input"
              value={newRoom.type}
              onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as RoomType })}
            >
              {TYPE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Width (ft)</span>
              <input
                type="number"
                step={0.1}
                value={pendingRect.w}
                onChange={(e) => setPendingRect({ ...pendingRect, w: parseFloat(e.target.value) || pendingRect.w })}
              />
            </label>
            <label className="field">
              <span className="field-label">Depth (ft)</span>
              <input
                type="number"
                step={0.1}
                value={pendingRect.d}
                onChange={(e) => setPendingRect({ ...pendingRect, d: parseFloat(e.target.value) || pendingRect.d })}
              />
            </label>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={newRoom.furnish}
              onChange={(e) => setNewRoom({ ...newRoom, furnish: e.target.checked })}
            />
            <span>Auto-generate 3D furniture layout</span>
          </label>
          <div className="btn-row end">
            <button className="btn small" onClick={() => setPendingRect(null)}>Cancel</button>
            <button className="btn primary" onClick={confirmNewRoom}>Create Room</button>
          </div>
        </Modal>
      )}

      {calibPts.length === 2 && (
        <Modal title="Calibrate Scale" onClose={() => setCalibPts([])}>
          <p className="hint">Enter the real-world distance between the two points you clicked.</p>
          <label className="field">
            <span className="field-label">Distance (feet)</span>
            <input
              type="number"
              className="text-input"
              autoFocus
              step={0.1}
              min={0.5}
              value={calibDist}
              onChange={(e) => setCalibDist(e.target.value)}
            />
          </label>
          <div className="btn-row end">
            <button className="btn small" onClick={() => setCalibPts([])}>Cancel</button>
            <button className="btn primary" onClick={confirmCalibration}>Set Scale</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
