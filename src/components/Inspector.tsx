import { useStore } from '../store/useStore';
import type { FloorStyle, Opening, Room, WallSide } from '../types';
import { CATALOG_MAP } from '../data/catalog';
import { round1 } from '../utils/units';
import { uid } from '../utils/id';

function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
  unit = 'ft',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input-wrap">
        <input
          type="number"
          value={round1(value)}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="color-input-wrap">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="color-hex">{value.toUpperCase()}</span>
      </span>
    </label>
  );
}

const FLOOR_STYLES: FloorStyle[] = ['wood', 'tile', 'marble', 'concrete', 'plain'];

const WALL_LABELS: Record<WallSide, string> = {
  N: 'Back',
  S: 'Front',
  W: 'Left',
  E: 'Right',
};

function OpeningsEditor({ projectId, room }: { projectId: string; room: Room }) {
  const updateRoom = useStore((s) => s.updateRoom);
  const setOpenings = (openings: Opening[]) => updateRoom(projectId, room.id, { openings });

  const patchOpening = (id: string, patch: Partial<Opening>) =>
    setOpenings(room.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const add = (kind: Opening['kind']) =>
    setOpenings([
      ...room.openings,
      kind === 'door'
        ? { id: uid('o_'), kind, wall: 'S', offset: room.width / 2, width: 3, height: 7, sill: 0 }
        : { id: uid('o_'), kind, wall: 'N', offset: room.width / 2, width: 4, height: 4, sill: 2.8 },
    ]);

  return (
    <div className="inspector-section">
      <div className="section-heading">Doors &amp; Windows</div>
      {room.openings.length === 0 && <p className="hint">No openings. Solid walls all around.</p>}
      {room.openings.map((o) => {
        const wallLen = o.wall === 'N' || o.wall === 'S' ? room.width : room.depth;
        return (
          <div key={o.id} className="opening-card">
            <div className="opening-head">
              <span className="opening-kind">{o.kind === 'door' ? 'Door' : 'Window'}</span>
              <select
                className="select-input compact"
                value={o.wall}
                onChange={(e) => patchOpening(o.id, { wall: e.target.value as WallSide })}
              >
                {(Object.keys(WALL_LABELS) as WallSide[]).map((wSide) => (
                  <option key={wSide} value={wSide}>
                    {WALL_LABELS[wSide]} wall
                  </option>
                ))}
              </select>
              <button
                className="icon-btn"
                title="Remove"
                onClick={() => setOpenings(room.openings.filter((x) => x.id !== o.id))}
              >
                &times;
              </button>
            </div>
            <div className="opening-grid">
              <label className="mini-field">
                <span>Position</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={wallLen}
                  value={round1(o.offset)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) patchOpening(o.id, { offset: v });
                  }}
                />
              </label>
              <label className="mini-field">
                <span>Width</span>
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  value={round1(o.width)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) patchOpening(o.id, { width: Math.max(1, v) });
                  }}
                />
              </label>
              <label className="mini-field">
                <span>Height</span>
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  value={round1(o.height)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) patchOpening(o.id, { height: Math.max(1, v) });
                  }}
                />
              </label>
              {o.kind === 'window' && (
                <label className="mini-field">
                  <span>Sill</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    value={round1(o.sill)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) patchOpening(o.id, { sill: Math.max(0, v) });
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        );
      })}
      <div className="btn-row">
        <button className="btn small" onClick={() => add('door')}>
          + Door
        </button>
        <button className="btn small" onClick={() => add('window')}>
          + Window
        </button>
      </div>
    </div>
  );
}

export function Inspector({ projectId, room }: { projectId: string; room: Room }) {
  const selectedItemId = useStore((s) => s.selectedItemId);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);
  const duplicateItem = useStore((s) => s.duplicateItem);
  const updateRoom = useStore((s) => s.updateRoom);
  const refurnishRoom = useStore((s) => s.refurnishRoom);
  const selectItem = useStore((s) => s.selectItem);

  const item = room.items.find((it) => it.id === selectedItemId) ?? null;

  if (item) {
    const patch = (p: Partial<typeof item>) => updateItem(projectId, room.id, item.id, p);
    const entry = CATALOG_MAP[item.catalogId];
    return (
      <aside className="panel inspector-panel">
        <div className="panel-title">
          <span>{item.label}</span>
          <button className="link-btn" onClick={() => selectItem(null)}>
            Room settings
          </button>
        </div>
        <div className="panel-scroll">
          <div className="inspector-section">
            <div className="section-heading">Name</div>
            <input
              className="text-input"
              value={item.label}
              onChange={(e) => patch({ label: e.target.value })}
            />
          </div>

          <div className="inspector-section">
            <div className="section-heading">Position</div>
            <NumberField label="X (from left wall)" value={item.x} min={0} max={room.width} onChange={(v) => patch({ x: v })} />
            <NumberField label="Z (from back wall)" value={item.z} min={0} max={room.depth} onChange={(v) => patch({ z: v })} />
            <NumberField
              label="Elevation (off floor)"
              value={item.elevation}
              min={0}
              max={room.wallHeight}
              onChange={(v) => patch({ elevation: Math.max(0, v) })}
            />
            <div className="field">
              <span className="field-label">Rotation {Math.round(item.rotation)}&deg;</span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={item.rotation}
                onChange={(e) => patch({ rotation: parseFloat(e.target.value) })}
              />
            </div>
            <div className="btn-row">
              <button className="btn small" onClick={() => patch({ rotation: (item.rotation + 90) % 360 })}>
                Rotate 90&deg;
              </button>
            </div>
          </div>

          <div className="inspector-section">
            <div className="section-heading">Size</div>
            <NumberField label="Width" value={item.w} min={0.2} max={30} onChange={(v) => patch({ w: v })} />
            <NumberField label="Depth" value={item.d} min={0.1} max={30} onChange={(v) => patch({ d: v })} />
            <NumberField label="Height" value={item.h} min={0.05} max={12} onChange={(v) => patch({ h: v })} />
            {entry && (
              <button
                className="btn small"
                onClick={() => patch({ w: entry.w, d: entry.d, h: entry.h })}
              >
                Reset to default size
              </button>
            )}
          </div>

          <div className="inspector-section">
            <div className="section-heading">Colors</div>
            <ColorField label="Primary" value={item.color} onChange={(v) => patch({ color: v })} />
            <ColorField label="Accent" value={item.accent} onChange={(v) => patch({ accent: v })} />
            {entry && (
              <button className="btn small" onClick={() => patch({ color: entry.color, accent: entry.accent })}>
                Reset colors
              </button>
            )}
          </div>

          <div className="inspector-section">
            <div className="btn-row">
              <button className="btn small" onClick={() => duplicateItem(projectId, room.id, item.id)}>
                Duplicate
              </button>
              <button className="btn small danger" onClick={() => removeItem(projectId, room.id, item.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Room settings when no item selected
  const patchRoom = (p: Partial<Room>) => updateRoom(projectId, room.id, p);
  return (
    <aside className="panel inspector-panel">
      <div className="panel-title">Room Settings</div>
      <div className="panel-scroll">
        <div className="inspector-section">
          <div className="section-heading">Name</div>
          <input className="text-input" value={room.name} onChange={(e) => patchRoom({ name: e.target.value })} />
        </div>

        <div className="inspector-section">
          <div className="section-heading">Dimensions</div>
          <NumberField label="Width" value={room.width} min={2} max={60} onChange={(v) => patchRoom({ width: v })} />
          <NumberField label="Depth" value={room.depth} min={2} max={60} onChange={(v) => patchRoom({ depth: v })} />
          <NumberField label="Wall height" value={room.wallHeight} min={7} max={14} onChange={(v) => patchRoom({ wallHeight: v })} />
        </div>

        <div className="inspector-section">
          <div className="section-heading">Finishes</div>
          <ColorField label="Wall color" value={room.wallColor} onChange={(v) => patchRoom({ wallColor: v })} />
          <ColorField label="Trim / frames" value={room.trimColor} onChange={(v) => patchRoom({ trimColor: v })} />
          <ColorField label="Floor color" value={room.floorColor} onChange={(v) => patchRoom({ floorColor: v })} />
          <label className="field">
            <span className="field-label">Floor style</span>
            <select
              className="select-input"
              value={room.floorStyle}
              onChange={(e) => patchRoom({ floorStyle: e.target.value as FloorStyle })}
            >
              {FLOOR_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <OpeningsEditor projectId={projectId} room={room} />

        <div className="inspector-section">
          <div className="section-heading">Notes</div>
          <textarea
            className="text-input"
            rows={3}
            placeholder="Design notes for this room..."
            value={room.notes}
            onChange={(e) => patchRoom({ notes: e.target.value })}
          />
        </div>

        <div className="inspector-section">
          <button
            className="btn small"
            onClick={() => {
              if (room.items.length === 0 || confirm('Replace all furniture with an auto-generated layout?')) {
                refurnishRoom(projectId, room.id);
              }
            }}
          >
            Auto-furnish room
          </button>
          <p className="hint">Tip: click any furniture in the 3D view to select it, then drag to move. Press R to rotate, Delete to remove.</p>
        </div>
      </div>
    </aside>
  );
}
