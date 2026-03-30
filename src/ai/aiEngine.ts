import type { AIContext, AIMessage } from "./types.ts";
import { aiMemoryService } from "@/db/aiMemoryService";
import { taskService } from "@/db/taskService";
import type { Task } from "@/types";
import { localAgentApi } from "./localAgentApi";

const BROWSER_MODEL = "Xenova/distilgpt2";
const HF_DEFAULT_MODEL = "Xenova/distilgpt2";
const COMPAT_FALLBACK_MODEL = "Xenova/distilgpt2";
const GLOBAL_SETTINGS_KEY = "lifeos_global";

export type AIRuntimeMode = "idle" | "loading" | "local-model" | "remote-fallback" | "lightweight-fallback" | "error";

export type AIProvider = "browser" | "huggingface" | "anthropic" | "openai";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  hfModelId?: string;
  apiKey?: string;
  preferApi?: boolean;
}

export interface BuildRequestParams {
  userMessage: string;
  projectId: string;
  skillName: string;
}

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
- Avoid canned or scripted template replies; respond naturally and specifically to the user message.
`;

export interface AIRequestPayload {
  system: string;
  messages: AIMessage[];
  context: AIContext;
}

export const buildAIRequest = async ({ userMessage, projectId, skillName }: BuildRequestParams): Promise<AIRequestPayload> => {
  const context = await aiMemoryService.getContext(projectId);
  const memory = await aiMemoryService.getRecentMemory(projectId, 20);

  const systemPrompt = buildSystemPrompt(context, skillName);

  return {
    system: systemPrompt,
    messages: [...memory, { role: "user", content: userMessage }],
    context,
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
    return COMPAT_FALLBACK_MODEL;
  }

  if (lower === "xenova/phi-2") {
    return HF_DEFAULT_MODEL;
  }

  if (lower === "xenova/distilgpt2") {
    return "Xenova/distilgpt2";
  }

  if (lower === "xenova/phi-3-mini-4k-instruct") {
    return COMPAT_FALLBACK_MODEL;
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

const browserPhiChat = async (requestPayload: AIRequestPayload, modelId: string) => {
  const pipe = await getLocalHfPipeline(modelId || BROWSER_MODEL);
  const latestUserMessage = requestPayload.messages[requestPayload.messages.length - 1]?.content || "";
  
  // Phi models need instruction-following format
  const prompt = `${requestPayload.system}\n\nUser: ${latestUserMessage}\nAssistant:`;
  
  try {
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
  } catch (error) {
    console.error("Chat error:", error);
    throw new Error(`Chat failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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
let aiRuntimeMode: AIRuntimeMode = "idle";
const aiRuntimeModeListeners = new Set<(mode: AIRuntimeMode) => void>();

const notifyHfStatus = (status: HfModelStatus) => {
  hfModelStatus = status;
  hfListeners.forEach((listener) => listener(status));
};

const notifyAiRuntimeMode = (mode: AIRuntimeMode) => {
  aiRuntimeMode = mode;
  aiRuntimeModeListeners.forEach((listener) => listener(mode));
};

export const getHfModelStatus = () => hfModelStatus;

export const getAiRuntimeMode = () => aiRuntimeMode;

export const subscribeAiRuntimeMode = (listener: (mode: AIRuntimeMode) => void) => {
  aiRuntimeModeListeners.add(listener);
  listener(aiRuntimeMode);
  return () => {
    aiRuntimeModeListeners.delete(listener);
  };
};

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

const fallbackLocalAssistant = async (prompt: string) => {
  const userMarker = "User:";
  const idx = prompt.lastIndexOf(userMarker);
  const userText = idx >= 0 ? prompt.slice(idx + userMarker.length).replace(/Assistant:\s*$/i, "").trim() : prompt.trim();

  const lower = userText.toLowerCase();
  if (!userText) {
    return "I am ready. Tell me what you want to plan or execute.";
  }

  if (["hi", "hello", "hey", "hii", "yo"].includes(lower)) {
    return "Hi! Local lightweight assistant mode is active. I can help with planning, task breakdown, and next-step execution.";
  }

  if (lower.includes("plan") || lower.includes("schedule")) {
    return `Quick plan for: ${userText}\n1. Define the exact outcome in one line.\n2. Break it into 3 actionable tasks.\n3. Do a focused 25-minute sprint on task 1 now.`;
  }

  if (lower.includes("task") || lower.includes("todo")) {
    return `Actionable breakdown:\n1. Capture all pending tasks.\n2. Mark top 3 by impact and deadline.\n3. Start with the highest-impact task for 30 minutes.`;
  }

  return `Lightweight local assistant mode is active.\nYour message: ${userText}`;
};

const getLocalHfPipeline = async (modelId: string) => {
  if (hfPipelinePromise && hfLoadedModelId === modelId) {
    notifyHfStatus({ state: "ready", modelId, message: "Model cached and ready." });
    return hfPipelinePromise;
  }

  hfLoadedModelId = modelId;
  notifyAiRuntimeMode("loading");
  notifyHfStatus({ state: "loading", modelId, message: "Loading local offline model..." });
  hfPipelinePromise = (async () => {
    try {
      const transformers = await import("@xenova/transformers");
      if (transformers.env) {
        transformers.env.allowLocalModels = true;
        (transformers.env as any).allowRemoteModels = false;
        (transformers.env as any).localModelPath = '/ai/models';
        transformers.env.useBrowserCache = true;
        const wasmBackend = (transformers.env as any)?.backends?.onnx?.wasm;
        if (wasmBackend) {
          wasmBackend.wasmPaths = {
            'ort-wasm-simd-threaded.wasm': '/ort/ort-wasm-simd-threaded.wasm',
            'ort-wasm-simd-threaded.jsep.wasm': '/ort/ort-wasm-simd-threaded.jsep.wasm',
            'ort-wasm-simd.wasm': '/ort/ort-wasm-simd.wasm',
            'ort-wasm-simd.jsep.wasm': '/ort/ort-wasm-simd.jsep.wasm',
            'ort-wasm-threaded.wasm': '/ort/ort-wasm-threaded.wasm',
            'ort-wasm.wasm': '/ort/ort-wasm.wasm',
            'ort-wasm.jsep.wasm': '/ort/ort-wasm.jsep.wasm',
            'ort-wasm-threaded.js': '/ort/ort-wasm-threaded.js',
            'ort-wasm-threaded.worker.js': '/ort/ort-wasm-threaded.worker.js',
          };
          wasmBackend.proxy = false;
          wasmBackend.numThreads = 1;
          wasmBackend.jsep = false;
          wasmBackend.simd = true;
        }
      }

      // Try text-generation pipeline from local model files first.
      let pipe;
      let usingLightweightFallback = false;
      try {
        await ensureLocalModelFiles(modelId);
        pipe = await transformers.pipeline("text-generation", modelId, {
          dtype: "q4",
        });
      } catch (pipeError) {
        const message = (pipeError instanceof Error ? pipeError.message : "pipeline load failed").toLowerCase();
        const shouldUseLightweightFallback =
          message.includes("unsupported model type") ||
          message.includes("offline model files not found") ||
          message.includes("invalid local model response");

        if (shouldUseLightweightFallback) {
          console.warn("Local model unavailable/unsupported, using lightweight local fallback.", pipeError);
          pipe = async (prompt: string) => fallbackLocalAssistant(prompt);
          usingLightweightFallback = true;
        } else {
          throw pipeError;
        }
      }

      notifyAiRuntimeMode(usingLightweightFallback ? "lightweight-fallback" : "local-model");
      
      notifyHfStatus({
        state: "ready",
        modelId,
        message: usingLightweightFallback
          ? "Local model unavailable; using lightweight local fallback."
          : "Offline model ready.",
      });
      return pipe as unknown as HfPipeline;
    } catch (error) {
      // Final guard: never hard-fail chat runtime, keep assistant usable.
      console.warn("Model load failed, forcing lightweight local assistant fallback.", error);
      const fallbackPipe: HfPipeline = async (input: string) => fallbackLocalAssistant(input);
      notifyAiRuntimeMode("lightweight-fallback");
      notifyHfStatus({
        state: "ready",
        modelId,
        message: "Model load failed; using lightweight local fallback.",
      });
      return fallbackPipe;
    }
  })();

  return hfPipelinePromise;
};

export const prepareHuggingFaceModel = async (modelId: string) => {
  const resolvedModel = normalizePhiModelId(modelId);
  await getLocalHfPipeline(resolvedModel);
  return getHfModelStatus();
};

export const activatePhiOnStartup = async () => {
  const config = getStoredConfig();
  const modelId = normalizePhiModelId(config.model || config.hfModelId || BROWSER_MODEL);
  try {
    return await prepareHuggingFaceModel(modelId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model load failed";
    if (message.toLowerCase().includes("unsupported model type")) {
      notifyAiRuntimeMode("error");
      notifyHfStatus({
        state: "error",
        modelId,
        message: "Offline Phi model format is unsupported by this browser runtime.",
      });
      return getHfModelStatus();
    }
    throw error;
  }
};

export interface ChatParams {
  projectId: string;
  message: string;
  skillName: string;
}

type ChatResponse = {
  message: {
    role: "assistant";
    content: string;
  };
};

const LOCAL_OPERATION_SKILLS = new Set([
  "workspace_reader",
  "command_executor",
  "file_editor",
  "task_controller",
]);

const usageForSkill = (skillName: string) => {
  if (skillName === "workspace_reader") {
    return "workspace_reader usage:\n/list [path]\n/read <file_path>";
  }
  if (skillName === "command_executor") {
    return "command_executor usage:\n/run <command>";
  }
  if (skillName === "file_editor") {
    return "file_editor usage:\n/write <file_path>\\n<content>";
  }
  if (skillName === "task_controller") {
    return "task_controller usage:\n/tasks list\n/tasks add <title>\n/tasks done <task_id>\n/tasks delete <task_id>";
  }
  return "Use chat skill for normal AI conversation.";
};

const buildTask = (projectId: string, title: string): Task => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    projectId,
    title,
    description: "",
    status: "todo",
    priority: "none",
    tags: [],
    parentId: null,
    goalId: null,
    kanbanColumn: "todo",
    startDate: null,
    deadline: null,
    estimateMins: null,
    actualMins: null,
    pomodoroCount: 0,
    createdAt: now,
    updatedAt: now,
  };
};

const handleLocalSkill = async (projectId: string, message: string, skillName: string): Promise<ChatResponse | null> => {
  if (!LOCAL_OPERATION_SKILLS.has(skillName)) {
    return null;
  }

  const trimmed = message.trim();

  if (skillName === "command_executor") {
    const command = trimmed.startsWith("/run ") ? trimmed.slice(5).trim() : trimmed;
    if (!command) {
      return { message: { role: "assistant", content: usageForSkill(skillName) } };
    }
    const result = await localAgentApi.runCommand(command);
    const output = (result.output || "").trim() || "Command executed with no output.";
    return { message: { role: "assistant", content: output } };
  }

  if (skillName === "workspace_reader") {
    if (trimmed.startsWith("/read ")) {
      const filePath = trimmed.slice(6).trim();
      if (!filePath) {
        return { message: { role: "assistant", content: usageForSkill(skillName) } };
      }
      const result = await localAgentApi.readFile(filePath);
      return { message: { role: "assistant", content: result.output || "Empty file" } };
    }

    const listPath = trimmed.startsWith("/list") ? (trimmed.slice(5).trim() || ".") : ".";
    const result = await localAgentApi.listDirectory(listPath);
    const rows = (result.files || []).map((entry) => `${entry.type === "directory" ? "[DIR]" : "[FILE]"} ${entry.name}`);
    return {
      message: {
        role: "assistant",
        content: rows.length ? rows.join("\n") : "No entries found.",
      },
    };
  }

  if (skillName === "file_editor") {
    if (!trimmed.startsWith("/write ")) {
      return { message: { role: "assistant", content: usageForSkill(skillName) } };
    }
    const payload = trimmed.slice(7);
    const splitAt = payload.indexOf("\n");
    if (splitAt < 0) {
      return { message: { role: "assistant", content: usageForSkill(skillName) } };
    }
    const filePath = payload.slice(0, splitAt).trim();
    const content = payload.slice(splitAt + 1);
    if (!filePath) {
      return { message: { role: "assistant", content: usageForSkill(skillName) } };
    }
    await localAgentApi.writeFile(filePath, content);
    return { message: { role: "assistant", content: `Updated ${filePath}` } };
  }

  if (skillName === "task_controller") {
    if (/^\/tasks\s+list$/i.test(trimmed)) {
      const tasks = await taskService.getAll(projectId);
      const output = tasks
        .slice(-20)
        .map((task) => `${task.id} | ${task.status} | ${task.title}`)
        .join("\n");
      return {
        message: {
          role: "assistant",
          content: output || "No tasks found.",
        },
      };
    }

    const addMatch = trimmed.match(/^\/tasks\s+add\s+(.+)$/i);
    if (addMatch) {
      const title = addMatch[1].trim();
      if (!title) {
        return { message: { role: "assistant", content: usageForSkill(skillName) } };
      }
      const task = buildTask(projectId, title);
      await taskService.upsert(projectId, task);
      return { message: { role: "assistant", content: `Task added: ${task.id}` } };
    }

    const doneMatch = trimmed.match(/^\/tasks\s+done\s+(\S+)$/i);
    if (doneMatch) {
      const taskId = doneMatch[1];
      const tasks = await taskService.getAll(projectId);
      const task = tasks.find((item) => item.id === taskId);
      if (!task) {
        return { message: { role: "assistant", content: `Task not found: ${taskId}` } };
      }
      await taskService.upsert(projectId, {
        ...task,
        status: "done",
        kanbanColumn: "done",
        updatedAt: new Date().toISOString(),
      });
      return { message: { role: "assistant", content: `Task completed: ${taskId}` } };
    }

    const deleteMatch = trimmed.match(/^\/tasks\s+delete\s+(\S+)$/i);
    if (deleteMatch) {
      const taskId = deleteMatch[1];
      await taskService.delete(projectId, taskId);
      return { message: { role: "assistant", content: `Task deleted: ${taskId}` } };
    }

    return { message: { role: "assistant", content: usageForSkill(skillName) } };
  }

  return null;
};

const sanitizeSkillName = (skillName: string, context: AIContext) => {
  const trimmed = skillName.trim();
  if (trimmed && context.active_skills.includes(trimmed)) {
    return trimmed;
  }
  return "chat";
};

export const chat = async ({ projectId, message, skillName }: ChatParams) => {
  const config = getStoredConfig();
  const requestPayload = await buildAIRequest({ userMessage: message, projectId, skillName });
  const resolvedSkill = sanitizeSkillName(skillName, requestPayload.context);

  await aiMemoryService.addMemory(
    projectId,
    {
      role: "user",
      content: message,
    },
    "chat",
    resolvedSkill
  );

  const localResponse = await handleLocalSkill(projectId, message, resolvedSkill);
  if (localResponse) {
    await aiMemoryService.addMemory(
      projectId,
      {
        role: "assistant",
        content: localResponse.message.content,
      },
      "chat",
      resolvedSkill
    );
    return localResponse;
  }

  const response = await browserPhiChat(
    requestPayload,
    normalizePhiModelId(config.model || config.hfModelId || BROWSER_MODEL)
  );

  await aiMemoryService.addMemory(
    projectId,
    {
      role: "assistant",
      content: response.message.content,
    },
    "chat",
    resolvedSkill
  );

  return response;
};

export const updateAISoul = async (projectId: string, soulPrompt: string) =>
  aiMemoryService.saveContext(projectId, { soul_prompt: soulPrompt });

export const updateAIBrain = async (
  projectId: string,
  updates: Partial<Pick<AIContext, "habitual_context" | "behavior">>
) => aiMemoryService.saveContext(projectId, updates);

export const updateAISkills = async (projectId: string, activeSkills: string[]) =>
  aiMemoryService.saveContext(projectId, { active_skills: activeSkills });
