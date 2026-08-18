import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Modal } from './Modal';

export function Dashboard() {
  const projects = useStore((s) => s.projects);
  const createProject = useStore((s) => s.createProject);
  const createSample = useStore((s) => s.createSample);
  const deleteProject = useStore((s) => s.deleteProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const navigate = useStore((s) => s.navigate);

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', client: '', notes: '' });

  const openProject = (projectId: string) =>
    navigate({ view: 'project', projectId, tab: 'plan' });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const id = createProject(form.name.trim(), form.client.trim(), form.notes.trim());
    setShowNew(false);
    setForm({ name: '', client: '', notes: '' });
    openProject(id);
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <div className="brand-name">ACME INTERIOR</div>
            <div className="brand-sub">Design Studio</div>
          </div>
        </div>
        <div className="dash-actions">
          <button className="btn" onClick={() => openProject(createSample())}>
            Load Sample Flat 104
          </button>
          <button className="btn primary" onClick={() => setShowNew(true)}>
            + New Project
          </button>
        </div>
      </header>

      <main className="dash-main">
        <h2 className="dash-title">Projects</h2>
        {projects.length === 0 ? (
          <div className="empty-state large">
            <h3>No projects yet</h3>
            <p>
              Create a project per customer, upload their 2D floor plan, trace the rooms, and the
              studio generates an editable 3D design for every room. When the client approves,
              export a branded PDF presentation.
            </p>
            <div className="btn-row center">
              <button className="btn primary" onClick={() => setShowNew(true)}>
                Create your first project
              </button>
              <button className="btn" onClick={() => openProject(createSample())}>
                Or explore the sample flat
              </button>
            </div>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => {
              const approved = p.rooms.filter((r) => r.approved).length;
              return (
                <div key={p.id} className="project-card" onClick={() => openProject(p.id)}>
                  <div className="card-top">
                    <span className="card-name">{p.name}</span>
                    {p.client && <span className="card-client">{p.client}</span>}
                  </div>
                  <div className="card-stats">
                    <span>{p.rooms.length} rooms</span>
                    <span>
                      {approved}/{p.rooms.length || 0} approved
                    </span>
                  </div>
                  <div className="card-progress">
                    <div
                      className="card-progress-fill"
                      style={{ width: p.rooms.length ? `${(approved / p.rooms.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="card-bottom">
                    <span className="card-date">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="link-btn" onClick={() => duplicateProject(p.id)}>
                        Duplicate
                      </button>
                      <button
                        className="link-btn danger"
                        onClick={() => {
                          if (confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                            deleteProject(p.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showNew && (
        <Modal title="New Project" onClose={() => setShowNew(false)}>
          <label className="field">
            <span className="field-label">Project name *</span>
            <input
              className="text-input"
              autoFocus
              placeholder="e.g. Flat 104 - Green Residency"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </label>
          <label className="field">
            <span className="field-label">Client name</span>
            <input
              className="text-input"
              placeholder="e.g. Mr. & Mrs. Sharma"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea
              className="text-input"
              rows={3}
              placeholder="Requirements, preferences, budget..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <div className="btn-row end">
            <button className="btn small" onClick={() => setShowNew(false)}>
              Cancel
            </button>
            <button className="btn primary" disabled={!form.name.trim()} onClick={handleCreate}>
              Create Project
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
