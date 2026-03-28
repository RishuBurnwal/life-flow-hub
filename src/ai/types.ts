export type AIRole = "user" | "assistant" | "system";

export interface AIMessage {
  role: AIRole;
  content: string;
  timestamp?: string;
  type?: string;
  skill_used?: string;
}
