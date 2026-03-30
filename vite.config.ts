import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { promises as fs } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const localAgentPlugin = () => ({
  name: "local-agent-api",
  apply: "serve" as const,
  configureServer(server: any) {
    const workspaceRoot = path.resolve(__dirname);

    const sendJson = (res: any, statusCode: number, payload: Record<string, unknown>) => {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(payload));
    };

    const readBody = (req: any) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString("utf8");
        });
        req.on("end", () => {
          if (!body) {
            resolve({});
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
        req.on("error", reject);
      });

    const resolvePathInRoot = (inputPath: string) => {
      const normalized = inputPath?.trim() || ".";
      const target = path.resolve(workspaceRoot, normalized);
      const relative = path.relative(workspaceRoot, target);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("Path must stay inside project root.");
      }
      return target;
    };

    server.middlewares.use("/api/local-agent", async (req: any, res: any, next: any) => {
      if (req.method !== "POST") {
        next();
        return;
      }

      try {
        const body = await readBody(req);
        const route = (req.url || "").split("?")[0];

        if (route === "/run") {
          const command = String(body.command || "").trim();
          if (!command) {
            sendJson(res, 400, { ok: false, error: "Missing command" });
            return;
          }
          const { stdout, stderr } = await execAsync(command, {
            cwd: workspaceRoot,
            timeout: 30000,
            maxBuffer: 1024 * 1024 * 4,
            shell: true,
          });
          sendJson(res, 200, { ok: true, output: [stdout, stderr].filter(Boolean).join("\n") });
          return;
        }

        if (route === "/read") {
          const requested = String(body.path || "").trim();
          const filePath = resolvePathInRoot(requested);
          const content = await fs.readFile(filePath, "utf8");
          sendJson(res, 200, { ok: true, path: requested, output: content });
          return;
        }

        if (route === "/list") {
          const requested = String(body.path || ".").trim() || ".";
          const dirPath = resolvePathInRoot(requested);
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          sendJson(res, 200, {
            ok: true,
            path: requested,
            files: entries.map((entry) => ({
              name: entry.name,
              type: entry.isDirectory() ? "directory" : "file",
            })),
          });
          return;
        }

        if (route === "/write") {
          const requested = String(body.path || "").trim();
          const content = String(body.content || "");
          if (!requested) {
            sendJson(res, 400, { ok: false, error: "Missing path" });
            return;
          }
          const filePath = resolvePathInRoot(requested);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content, "utf8");
          sendJson(res, 200, { ok: true, path: requested, output: "File written" });
          return;
        }

        sendJson(res, 404, { ok: false, error: "Unknown local-agent route" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown local-agent error";
        sendJson(res, 500, { ok: false, error: message });
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    middlewareMode: false,
  },
  plugins: [
    {
      name: "wasm-mime-type",
      apply: "serve",
      configureServer(server: any) {
        return () => {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url?.endsWith(".wasm")) {
              res.setHeader("Content-Type", "application/wasm");
            }
            next();
          });
        };
      },
    },
    react(),
    localAgentPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          ai: ["@xenova/transformers"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
}));
