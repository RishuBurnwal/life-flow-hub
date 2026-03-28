import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { PlusCircle, FolderOpen } from 'lucide-react';

export function WorkspaceSelector() {
  const { projects, addProject, setActiveProject } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#5B8A9A');

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name)), [projects]);

  const handleSelect = (id: string) => {
    setActiveProject(id);
    navigate(`/workspace/${id}`);
  };

  const handleCreate = () => {
    const workspaceName = name.trim() || `Workspace ${projects.length + 1}`;
    const id = addProject(workspaceName, '', color);
    setName('');
    handleSelect(id);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Pick a workspace to continue or spin up a new one.</p>
      </div>
      <div className="w-full max-w-xl space-y-3">
        {sortedProjects.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No workspaces yet. Create one to get started.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project.id)}
              className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="w-4 h-4 text-primary" />
                {project.name}
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
              )}
            </button>
          ))}
        </div>
        <div className="w-full rounded-xl border border-dashed border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-11 rounded-md border border-border bg-background"
              title="Workspace color"
            />
          </div>
          <button
            onClick={handleCreate}
            className="w-full rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors py-2.5 text-sm font-medium flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            New workspace
          </button>
        </div>
      </div>
    </div>
  );
}
