import type { AIMessage } from "./types.ts";

const BROWSER_MODEL = "Xenova/phi-2";
const HF_DEFAULT_MODEL = "Xenova/phi-2";
const GLOBAL_SETTINGS_KEY = "lifeos_global";

export type AIProvider = "browser" | "huggingface" | "anthropic" | "openai";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  hfModelId?: string;
  apiKey?: string;
  preferApi?: boolean;
}

export interface AIContext {
  soul_prompt: string;
  habitual_context: Record<string, unknown>;
  behavior: Record<string, unknown>;
  active_skills: string[];
  version: number;
  last_updated: string;
}

export interface BuildRequestParams {
  userMessage: string;
  projectId: string;
  skillName: string;
}

const defaultContext: AIContext = {
  soul_prompt: "You are a focused, intelligent productivity assistant.",
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
  ],
  version: 1,
  last_updated: "",
};

const loadContext = (projectId: string): AIContext => {
  const raw = localStorage.getItem(`context_${projectId}`);
  if (!raw) return defaultContext;
  try {
    return { ...defaultContext, ...JSON.parse(raw) } as AIContext;
  } catch (e) {
    console.error("Failed to parse AI context", e);
    return defaultContext;
  }
};

const loadMemory = (projectId: string, limit: number): AIMessage[] => {
  const raw = localStorage.getItem(`memory_${projectId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AIMessage[];
    return parsed.slice(-limit);
  } catch (e) {
    console.error("Failed to parse AI memory", e);
    return [];
  }
};

const buildSystemPrompt = (context: AIContext, skillName: string) => `
${context.soul_prompt}

HABITUAL CONTEXT:
Work style: ${context.habitual_context.work_style}
Domain: ${context.habitual_context.domain}
Preferred stack: ${context.habitual_context.preferred_stack}
Energy peak: ${context.habitual_context.energy_peak}
Communication style: ${context.habitual_context.communication_style}

BEHAVIOR:
Tone: ${context.behavior.tone}
SDLC aware: ${context.behavior.sdlc_aware}
Proactive suggestions: ${context.behavior.proactive_suggestions}

ACTIVE SKILL: ${skillName}

IMPORTANT:
- Be ${context.behavior.tone} in responses.
- If creating tasks, return structured JSON.
- Always check context before answering.
- Remember what was discussed in the conversation history below.
`;

export const buildAIRequest = ({ userMessage, projectId, skillName }: BuildRequestParams) => {
  const context = loadContext(projectId);
  const memory = loadMemory(projectId, 20);

  const systemPrompt = buildSystemPrompt(context, skillName);

  return {
    system: systemPrompt,
    messages: [...memory, { role: "user", content: userMessage }],
  };
};

const getStoredConfig = (): AIConfig => {
  try {
    const raw = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (!raw) return { provider: "browser", model: BROWSER_MODEL };
    const parsed = JSON.parse(raw);
    const config = parsed.aiConfig || { provider: "browser", model: BROWSER_MODEL };
    return {
      ...config,
      provider: "browser",
      model: normalizePhiModelId(config.model || config.hfModelId || BROWSER_MODEL),
      hfModelId: normalizePhiModelId(config.hfModelId || config.model || BROWSER_MODEL),
      preferApi: false,
      apiKey: undefined,
    };
  } catch (e) {
    console.error("Failed to read AI config", e);
    return { provider: "browser", model: BROWSER_MODEL };
  }
};

const normalizePhiModelId = (modelId: string | undefined) => {
  const raw = (modelId || "").trim();
  if (!raw) {
    return HF_DEFAULT_MODEL;
  }

  const lower = raw.toLowerCase();
  if (
    lower === "phi3:mini" ||
    lower === "phi-3-mini" ||
    lower === "phi3-mini" ||
    lower === "phi-3" ||
    lower === "phi3"
  ) {
    return "Xenova/phi-2";
  }

  if (lower === "xenova/phi-2") {
    return "Xenova/phi-2";
  }

  if (!raw.includes("/")) {
    return HF_DEFAULT_MODEL;
  }

  return raw;
};

const ensureLocalModelFiles = async (modelId: string) => {
  const probePath = `/ai/models/${modelId}/tokenizer.json`;
  const res = await fetch(probePath, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Offline model files not found at ${probePath}. Place model files in public/ai/models/${modelId}/`);
  }
  const text = await res.text();
  if (!text || text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
    throw new Error(`Invalid local model response at ${probePath}. Ensure JSON files exist under public/ai/models/${modelId}/`);
  }
};

const browserPhiChat = async (requestPayload: ReturnType<typeof buildAIRequest>, modelId: string) => {
  const pipe = await getLocalHfPipeline(modelId || BROWSER_MODEL);
  const latestUserMessage = requestPayload.messages[requestPayload.messages.length - 1]?.content || "";
  const prompt = `${requestPayload.system}\n\nUser: ${latestUserMessage}\nAssistant:`;
  const output = await pipe(prompt, {
    max_new_tokens: 180,
    temperature: 0.35,
  });
  const content = extractHfText(output).trim() || "I could not generate a response yet.";

  return {
    message: {
      role: "assistant",
      content,
    },
  } as const;
};

type HfPipeline = (input: string, options?: Record<string, unknown>) => Promise<unknown>;

export type HfLoadState = "idle" | "loading" | "ready" | "error";

export interface HfModelStatus {
  state: HfLoadState;
  modelId: string;
  message?: string;
}

let hfLoadedModelId: string | null = null;
let hfPipelinePromise: Promise<HfPipeline> | null = null;
let hfModelStatus: HfModelStatus = { state: "idle", modelId: HF_DEFAULT_MODEL };
const hfListeners = new Set<(status: HfModelStatus) => void>();

const notifyHfStatus = (status: HfModelStatus) => {
  hfModelStatus = status;
  hfListeners.forEach((listener) => listener(status));
};

export const getHfModelStatus = () => hfModelStatus;

export const subscribeHfModelStatus = (listener: (status: HfModelStatus) => void) => {
  hfListeners.add(listener);
  listener(hfModelStatus);
  return () => {
    hfListeners.delete(listener);
  };
};

const extractHfText = (raw: unknown) => {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    if (first?.generated_text && typeof first.generated_text === "string") return first.generated_text;
    if (first?.summary_text && typeof first.summary_text === "string") return first.summary_text;
    if (first?.answer && typeof first.answer === "string") return first.answer;
  }
  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    if (typeof data.generated_text === "string") return data.generated_text;
    if (typeof data.summary_text === "string") return data.summary_text;
    if (typeof data.answer === "string") return data.answer;
  }
  return "";
};

const getLocalHfPipeline = async (modelId: string) => {
  if (hfPipelinePromise && hfLoadedModelId === modelId) {
    notifyHfStatus({ state: "ready", modelId, message: "Model cached and ready." });
    return hfPipelinePromise;
  }

  hfLoadedModelId = modelId;
  notifyHfStatus({ state: "loading", modelId, message: "Loading local offline model..." });
  hfPipelinePromise = (async () => {
    try {
      await ensureLocalModelFiles(modelId);
      const transformers = await import("@xenova/transformers");
      if (transformers.env) {
        transformers.env.allowLocalModels = true;
        (transformers.env as any).allowRemoteModels = false;
        (transformers.env as any).localModelPath = '/ai/models';
        transformers.env.useBrowserCache = true;
        const wasmBackend = (transformers.env as any)?.backends?.onnx?.wasm;
        if (wasmBackend) {
          wasmBackend.wasmPaths = '/ort/';
          wasmBackend.proxy = false;
          wasmBackend.numThreads = 1;
        }
      }
      const pipe = await transformers.pipeline("text-generation", modelId);
      notifyHfStatus({ state: "ready", modelId, message: "Offline model ready." });
      return pipe as unknown as HfPipeline;
    } catch (error) {
      hfPipelinePromise = null;
      const rawMessage = error instanceof Error ? error.message : "Model load failed";
      notifyHfStatus({
        state: "error",
        modelId,
        message: rawMessage,
      });
      throw error;
    }
  })();

  return hfPipelinePromise;
};

export const prepareHuggingFaceModel = async (modelId: string) => {
  const resolvedModel = normalizePhiModelId(modelId);
  await getLocalHfPipeline(resolvedModel);
  return getHfModelStatus();
};

export interface ChatParams {
  projectId: string;
  message: string;
  skillName: string;
}

export const chat = async ({ projectId, message, skillName }: ChatParams) => {
  const config = getStoredConfig();
  const requestPayload = buildAIRequest({ userMessage: message, projectId, skillName });

  return browserPhiChat(requestPayload, normalizePhiModelId(config.model || config.hfModelId || BROWSER_MODEL));
};
