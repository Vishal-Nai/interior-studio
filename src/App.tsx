import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { useProject, useStore } from './store/useStore';

export default function App() {
  const route = useStore((s) => s.route);
  const hydrated = useStore((s) => s.hydrated);
  const project = useProject(route.view === 'project' ? route.projectId : null);

  if (!hydrated) {
    return (
      <div className="splash">
        <span className="brand-mark large">A</span>
        <div className="brand-name">ACME INTERIOR</div>
        <div className="brand-sub">Loading studio…</div>
      </div>
    );
  }

  if (route.view === 'project' && project) {
    return <ProjectView project={project} />;
  }
  return <Dashboard />;
}
