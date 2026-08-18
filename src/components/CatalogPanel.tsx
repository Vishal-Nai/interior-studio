import { CATALOG, CATEGORIES } from '../data/catalog';
import { createItem } from '../data/presets';
import { useStore } from '../store/useStore';
import type { Room } from '../types';
import { formatSize } from '../utils/units';

export function CatalogPanel({ projectId, room }: { projectId: string; room: Room }) {
  const addItem = useStore((s) => s.addItem);

  const handleAdd = (catalogId: string) => {
    const item = createItem(catalogId, room.width / 2, room.depth / 2);
    // Nudge so consecutive adds don't stack exactly.
    item.x += (Math.random() - 0.5) * 1.5;
    item.z += (Math.random() - 0.5) * 1.5;
    addItem(projectId, room.id, item);
  };

  return (
    <aside className="panel catalog-panel">
      <div className="panel-title">Add Furniture</div>
      <div className="panel-scroll">
        {CATEGORIES.map((cat) => {
          const entries = CATALOG.filter((c) => c.category === cat);
          if (entries.length === 0) return null;
          return (
            <div key={cat} className="catalog-group">
              <div className="catalog-cat">{cat}</div>
              {entries.map((entry) => (
                <button key={entry.id} className="catalog-item" onClick={() => handleAdd(entry.id)}>
                  <span className="swatch" style={{ background: entry.color }} />
                  <span className="catalog-item-label">{entry.label}</span>
                  <span className="catalog-item-size">{formatSize(entry.w, entry.d)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
