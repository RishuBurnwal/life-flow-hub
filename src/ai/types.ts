export type AIRole = "user" | "assistant" | "system";

export interface AIMessage {
  role: AIRole;
  content: string;
  timestamp?: string;
  type?: string;
  skill_used?: string;
}

export interface AIBehavior {
  greeting_on_open: boolean;
  proactive_suggestions: boolean;
  sdlc_aware: boolean;
  daily_brief_on_start: boolean;
  risk_alert_sensitivity: "low" | "medium" | "high";
  tone: string;
  auto_suggest_tasks: boolean;
}

export interface AIHabitualContext {
  work_style: string;
  domain: string;
  preferred_stack: string;
  energy_peak: string;
  recurring_blockers: string[];
  communication_style: string;
}

export interface AIContext {
  soul_prompt: string;
  habitual_context: AIHabitualContext;
  behavior: AIBehavior;
  active_skills: string[];
  version: number;
  last_updated: string;
}
