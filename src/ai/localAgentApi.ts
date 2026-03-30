interface LocalAgentResult {
  ok: boolean;
  output?: string;
  error?: string;
  files?: Array<{ name: string; type: "file" | "directory" }>;
  path?: string;
}

const post = async <T>(endpoint: string, payload: Record<string, unknown>): Promise<T> => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error((data as any)?.error || "Local agent request failed");
  }
  return data;
};

export const localAgentApi = {
  async runCommand(command: string) {
    return post<LocalAgentResult>("/api/local-agent/run", { command });
  },

  async readFile(filePath: string) {
    return post<LocalAgentResult>("/api/local-agent/read", { path: filePath });
  },

  async listDirectory(dirPath: string) {
    return post<LocalAgentResult>("/api/local-agent/list", { path: dirPath });
  },

  async writeFile(filePath: string, content: string) {
    return post<LocalAgentResult>("/api/local-agent/write", { path: filePath, content });
  },
};
