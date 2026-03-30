import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { FolderOpen, PlusCircle, Loader2 } from 'lucide-react';

export default function Welcome() {
  const { projects, addProject, setActiveProject, refreshProjects } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        console.log('[Welcome] Initial project count:', projects.length);
        console.log('[Welcome] Calling refreshProjects to load from SQLite');
        await refreshProjects();
        console.log('[Welcome] Projects refreshed from SQLite');
      } catch (error) {
        console.error('[Welcome] Failed to refresh projects on mount', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const sortedProjects = useMemo(() => {
    const list = [...projects].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [projects]);

  const openWorkspace = (id: string) => {
    setActiveProject(id);
    navigate(`/workspace/${id}`);
  };

  const createWorkspace = async () => {
    const workspaceName = name.trim() || `Workspace ${projects.length + 1}`;
    console.log('[createWorkspace] Creating new workspace:', workspaceName);
    const id = addProject(workspaceName);
    console.log('[createWorkspace] Workspace created with ID:', id);
    setName('');
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('[createWorkspace] Opening workspace');
    openWorkspace(id);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card/95 backdrop-blur px-6 py-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Hello Sir, how would you like to start your day</h1>
        <p className="text-sm text-muted-foreground mt-2">Pick a workspace below or create a new one.</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => openWorkspace(project.id)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="w-4 h-4 text-primary" />
                {project.name}
              </div>
              {project.description ? <div className="text-xs text-muted-foreground mt-1">{project.description}</div> : null}
            </button>
          ))}
          {sortedProjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              No workspace found. Create one to begin.
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={createWorkspace}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              {loading ? 'Loading...' : 'Create Workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
