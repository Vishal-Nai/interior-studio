import { useState } from 'react';
import type { Project } from '../types';
import { useStore } from '../store/useStore';
import { PlanEditor } from './PlanEditor';
import { RoomEditor } from './RoomEditor';
import { OverviewScene } from './three/OverviewScene';
import { formatSize } from '../utils/units';
import { ROOM_TYPE_LABELS } from '../data/presets';

function OverviewTab({ project }: { project: Project }) {
  const overviewCut = useStore((s) => s.overviewCut);
  const overviewLabels = useStore((s) => s.overviewLabels);
  const setOverviewCut = useStore((s) => s.setOverviewCut);
  const setOverviewLabels = useStore((s) => s.setOverviewLabels);

  if (project.rooms.length === 0) {
    return (
      <div className="empty-state">
        <h3>No rooms yet</h3>
        <p>Trace rooms on the Floor Plan tab to see the full 3D apartment here.</p>
      </div>
    );
  }
  return (
    <div className="overview-tab">
      <div className="overview-toolbar">
        <label className="field inline">
          <span className="field-label">Wall cutaway height: {overviewCut} ft</span>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={overviewCut}
            onChange={(e) => setOverviewCut(parseFloat(e.target.value))}
          />
        </label>
        <label className="check-field">
          <input type="checkbox" checked={overviewLabels} onChange={(e) => setOverviewLabels(e.target.checked)} />
          <span>Room labels</span>
        </label>
      </div>
      <div className="canvas-wrap">
        <OverviewScene project={project} />
        <div className="canvas-hint">Drag to orbit &middot; Scroll to zoom &middot; Right-drag to pan</div>
      </div>
    </div>
  );
}

export function ProjectView({ project }: { project: Project }) {
  const route = useStore((s) => s.route);
  const navigate = useStore((s) => s.navigate);
  const [exporting, setExporting] = useState(false);

  if (route.view !== 'project') return null;
  const tab = route.tab;
  const activeRoom =
    tab === 'room' ? project.rooms.find((r) => r.id === route.roomId) ?? null : null;

  const approvedCount = project.rooms.filter((r) => r.approved).length;
  const allApproved = project.rooms.length > 0 && approvedCount === project.rooms.length;

  const handleExport = async () => {
    if (project.rooms.length === 0) {
      alert('Add at least one room before exporting.');
      return;
    }
    if (!allApproved) {
      const go = confirm(
        `${approvedCount}/${project.rooms.length} rooms are approved. Unapproved rooms will be marked DRAFT in the PDF. Export anyway?`,
      );
      if (!go) return;
    }
    setExporting(true);
    try {
      // Yield a frame so the button shows its busy state before heavy rendering.
      await new Promise((r) => setTimeout(r, 30));
      const { exportProjectPdf } = await import('../pdf/exportPdf');
      await exportProjectPdf(project);
    } catch (err) {
      console.error(err);
      alert('PDF export failed. See console for details.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="project-view">
      <header className="project-header">
        <button className="btn small" onClick={() => navigate({ view: 'dashboard' })}>
          &larr; Projects
        </button>
        <div className="project-title">
          <span className="project-name">{project.name}</span>
          {project.client && <span className="project-client">{project.client}</span>}
        </div>
        <div className="project-header-actions">
          <span className={`approval-chip ${allApproved ? 'done' : ''}`}>
            {approvedCount}/{project.rooms.length} approved
          </span>
          <button className="btn primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Generating PDF…' : 'Export PDF'}
          </button>
        </div>
      </header>

      <div className="project-body">
        <nav className="project-sidebar">
          <button
            className={`side-item ${tab === 'plan' ? 'active' : ''}`}
            onClick={() => navigate({ view: 'project', projectId: project.id, tab: 'plan' })}
          >
            <span className="side-icon">▦</span> Floor Plan
          </button>
          <button
            className={`side-item ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => navigate({ view: 'project', projectId: project.id, tab: 'overview' })}
          >
            <span className="side-icon">⌂</span> 3D Overview
          </button>

          <div className="side-heading">Rooms ({project.rooms.length})</div>
          <div className="side-rooms">
            {project.rooms.map((room) => (
              <button
                key={room.id}
                className={`side-room ${tab === 'room' && activeRoom?.id === room.id ? 'active' : ''}`}
                onClick={() =>
                  navigate({ view: 'project', projectId: project.id, tab: 'room', roomId: room.id })
                }
              >
                <span className={`room-dot ${room.approved ? 'approved' : ''}`} />
                <span className="side-room-text">
                  <span className="side-room-name">{room.name}</span>
                  <span className="side-room-meta">
                    {ROOM_TYPE_LABELS[room.type]} &middot; {formatSize(room.width, room.depth)}
                  </span>
                </span>
              </button>
            ))}
            {project.rooms.length === 0 && (
              <p className="side-empty">Trace rooms on the floor plan to get started.</p>
            )}
          </div>
        </nav>

        <main className="project-content">
          {tab === 'plan' && <PlanEditor project={project} />}
          {tab === 'overview' && <OverviewTab project={project} />}
          {tab === 'room' &&
            (activeRoom ? (
              <RoomEditor project={project} room={activeRoom} />
            ) : (
              <div className="empty-state">
                <h3>Room not found</h3>
              </div>
            ))}
        </main>
      </div>
    </div>
  );
}
