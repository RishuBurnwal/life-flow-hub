import { motion } from 'framer-motion';
import type { ViewName } from '@/types';
import { GitBranch, Brain } from 'lucide-react';

const PLACEHOLDER_DATA: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  mindmap: { icon: GitBranch, title: 'Mind Map', description: 'Visualize task relationships with D3' },
  sdlc: { icon: Brain, title: 'SDLC Planner', description: 'AI-generated project phases and milestones' },
};

export function PlaceholderView({ view }: { view: ViewName }) {
  const data = PLACEHOLDER_DATA[view];
  if (!data) return null;
  const Icon = data.icon;

  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Icon className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-1">{data.title}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">{data.description}</p>
        <span className="inline-block mt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Coming Soon
        </span>
      </motion.div>
    </div>
  );
}
