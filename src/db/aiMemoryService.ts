import { v4 as uuid } from "uuid";
import { openProjectDatabase } from "./projectDb";
import type { AIContext, AIMessage, AIRole } from "@/ai/types";

const DEFAULT_CONTEXT: AIContext = {
  soul_prompt: "You are a focused, intelligent productivity assistant with local workspace operation skills.",
  habitual_context: {
    work_style: "deep focus blocks preferred",
    domain: "",
    preferred_stack: "",
    energy_peak: "morning",
    recurring_blockers: [],
    communication_style: "concise",
  },
  behavior: {
    greeting_on_open: true,
    proactive_suggestions: true,
    sdlc_aware: true,
    daily_brief_on_start: true,
    risk_alert_sensitivity: "medium",
    tone: "concise",
    auto_suggest_tasks: true,
  },
  active_skills: [
    "chat",
    "task_breakdown",
    "sdlc_planner",
    "time_estimator",
    "daily_brief",
    "risk_detector",
    "habit_coach",
    "journal_analyser",
    "brain_dump_parser",
    "dependency_mapper",
    "okr_coach",
    "workspace_reader",
    "command_executor",
    "file_editor",
    "task_controller",
  ],
  version: 1,
  last_updated: "",
};

const toRow = (columns: string[], values: any[]) => {
  const row: Record<string, any> = {};
  columns.forEach((col, idx) => {
    row[col] = values[idx];
  });
  return row;
};

const safeParse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const parseContextRow = (row: Record<string, any>): AIContext => ({
  soul_prompt: row.soul_prompt || DEFAULT_CONTEXT.soul_prompt,
  habitual_context: safeParse(row.habitual_context || "{}", DEFAULT_CONTEXT.habitual_context),
  behavior: safeParse(row.behavior || "{}", DEFAULT_CONTEXT.behavior),
  active_skills: safeParse(row.active_skills || "[]", DEFAULT_CONTEXT.active_skills),
  version: Number(row.version) || 1,
  last_updated: row.last_updated || "",
});

const ensureContext = async (projectId: string) => {
  const { db, persist } = await openProjectDatabase(projectId);
  const res = db.exec(
    "SELECT * FROM ai_brain_profile WHERE project_id = $projectId LIMIT 1",
    { $projectId: projectId }
  );

  if (res[0]?.values?.[0]) {
    return {
      context: parseContextRow(toRow(res[0].columns, res[0].values[0])),
      db,
      persist,
    };
  }

  const now = new Date().toISOString();
  db.run(
    `INSERT INTO ai_brain_profile (
      project_id, soul_prompt, habitual_context, behavior, active_skills, version, last_updated
    ) VALUES (
      $project_id, $soul_prompt, $habitual_context, $behavior, $active_skills, $version, $last_updated
    )`,
    {
      $project_id: projectId,
      $soul_prompt: DEFAULT_CONTEXT.soul_prompt,
      $habitual_context: JSON.stringify(DEFAULT_CONTEXT.habitual_context),
      $behavior: JSON.stringify(DEFAULT_CONTEXT.behavior),
      $active_skills: JSON.stringify(DEFAULT_CONTEXT.active_skills),
      $version: DEFAULT_CONTEXT.version,
      $last_updated: now,
    }
  );
  await persist();

  return {
    context: { ...DEFAULT_CONTEXT, last_updated: now },
    db,
    persist,
  };
};

const normalizeRole = (role: AIRole): AIRole => {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return "assistant";
};

export const aiMemoryService = {
  defaults: DEFAULT_CONTEXT,

  async getContext(projectId: string): Promise<AIContext> {
    const { context } = await ensureContext(projectId);
    return context;
  },

  async saveContext(projectId: string, updates: Partial<AIContext>): Promise<AIContext> {
    const { context, db, persist } = await ensureContext(projectId);
    const merged: AIContext = {
      ...context,
      ...updates,
      habitual_context: {
        ...context.habitual_context,
        ...(updates.habitual_context || {}),
      },
      behavior: {
        ...context.behavior,
        ...(updates.behavior || {}),
      },
      active_skills: updates.active_skills || context.active_skills,
      last_updated: new Date().toISOString(),
    };

    db.run(
      `UPDATE ai_brain_profile
       SET soul_prompt = $soul_prompt,
           habitual_context = $habitual_context,
           behavior = $behavior,
           active_skills = $active_skills,
           version = $version,
           last_updated = $last_updated
       WHERE project_id = $project_id`,
      {
        $project_id: projectId,
        $soul_prompt: merged.soul_prompt,
        $habitual_context: JSON.stringify(merged.habitual_context),
        $behavior: JSON.stringify(merged.behavior),
        $active_skills: JSON.stringify(merged.active_skills),
        $version: merged.version,
        $last_updated: merged.last_updated,
      }
    );

    await persist();
    return merged;
  },

  async getRecentMemory(projectId: string, limit = 20): Promise<AIMessage[]> {
    const { db } = await openProjectDatabase(projectId);
    const cappedLimit = Math.max(1, Math.min(limit, 100));
    const res = db.exec(
      `SELECT role, content, timestamp, type, skill_used
       FROM ai_memory
       WHERE project_id = $projectId
       ORDER BY timestamp DESC
       LIMIT $limit`,
      {
        $projectId: projectId,
        $limit: cappedLimit,
      }
    );

    if (!res[0]) return [];

    const rows = res[0].values
      .map((vals) => toRow(res[0].columns, vals))
      .map((row) => ({
        role: normalizeRole(row.role as AIRole),
        content: String(row.content ?? ""),
        timestamp: row.timestamp || undefined,
        type: row.type || undefined,
        skill_used: row.skill_used || undefined,
      }))
      .reverse();

    return rows;
  },

  async addMemory(projectId: string, message: AIMessage, type = "chat", skillUsed?: string) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run(
      `INSERT INTO ai_memory (id, project_id, role, content, timestamp, type, skill_used)
       VALUES ($id, $project_id, $role, $content, $timestamp, $type, $skill_used)`,
      {
        $id: uuid(),
        $project_id: projectId,
        $role: normalizeRole(message.role),
        $content: message.content,
        $timestamp: message.timestamp || new Date().toISOString(),
        $type: type || message.type || "chat",
        $skill_used: skillUsed || message.skill_used || null,
      }
    );
    await persist();
  },
};
