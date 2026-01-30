/**
 * Quest Execution Server
 *
 * Simple HTTP server that executes quest tasks using DeepAgents with LocalShellSandbox.
 * Run with: npx tsx server/quest-server.ts
 */

import "dotenv/config";
import http from "node:http";
import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createDeepAgent } from "deepagents";
import { BaseSandbox, type SandboxBackendProtocol, type ExecuteResponse } from "deepagents/backends";
import { z } from "zod";

const PORT = 3002;

/**
 * LocalShellSandbox - A sandbox implementation that extends BaseSandbox
 * Provides command execution in a local shell environment
 */
class LocalShellSandbox extends BaseSandbox {
  readonly id: string;
  readonly workingDirectory: string;
  readonly timeout: number;

  constructor(options: { workingDirectory: string; timeout?: number }) {
    super();
    this.id = `local-sandbox-${Date.now()}`;
    this.workingDirectory = path.resolve(options.workingDirectory);
    this.timeout = options.timeout ?? 30000;

    if (!fs.existsSync(this.workingDirectory)) {
      fs.mkdirSync(this.workingDirectory, { recursive: true });
    }
  }

  async execute(command: string): Promise<ExecuteResponse> {
    return new Promise((resolve) => {
      const chunks: string[] = [];

      const child = cp.spawn(process.platform === "win32" ? "cmd.exe" : "/bin/bash", 
        process.platform === "win32" ? ["/c", command] : ["-c", command], {
        cwd: this.workingDirectory,
        env: { ...process.env, HOME: process.env.HOME },
        shell: true,
      });

      child.stdout.on("data", (data) => chunks.push(data.toString()));
      child.stderr.on("data", (data) => chunks.push(data.toString()));

      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        resolve({
          output: chunks.join("") + "\n[Command timed out]",
          exitCode: null,
          truncated: false,
        });
      }, this.timeout);

      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({
          output: chunks.join(""),
          exitCode,
          truncated: false,
        });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          output: `Error: ${err.message}`,
          exitCode: 1,
          truncated: false,
        });
      });
    });
  }

  async uploadFiles(files: Array<[string, Uint8Array]>) {
    return files.map(([filePath]) => ({
      path: filePath,
      error: "file_not_found" as const,
    }));
  }

  async downloadFiles(paths: string[]) {
    return paths.map((filePath) => ({
      path: filePath,
      content: null,
      error: "file_not_found" as const,
    }));
  }
}

// Create sandbox pointing to the app directory
const sandbox = new LocalShellSandbox({
  workingDirectory: path.join(process.cwd()),
  timeout: 10000
});

// Agent names for dungeon exploration
const agentNames = ["Sir Query", "Lady Parser", "Knight Coder", "Wizard Debug", "Scout Regex", "Baron Syntax", "Dame Algorithm"];

/**
 * Create LangChain tools for task handlers
 */
const createTaskTools = () => [
  {
    name: "list_directory",
    description: "List files in a directory",
    parameters: z.object({
      taskPath: z.string().describe("The directory path to list"),
    }),
    func: async ({ taskPath }: { taskPath: string }) => {
      const result = await sandbox.execute(`ls -la ${taskPath || "."}`);
      return result.output;
    },
  },
  {
    name: "read_file",
    description: "Read contents of a file",
    parameters: z.object({
      taskPath: z.string().describe("The file path to read"),
    }),
    func: async ({ taskPath }: { taskPath: string }) => {
      const result = await sandbox.execute(`cat "${taskPath}"`);
      return result.output;
    },
  },
  {
    name: "dungeon_explore",
    description: "Explore a dungeon and generate a creative story report",
    parameters: z.object({
      taskPath: z.string().describe("The dungeon directory path"),
      questTitle: z.string().optional().describe("Optional quest title"),
    }),
    func: async ({ taskPath, questTitle }: { taskPath: string; questTitle?: string }) => {
      // Pick a random agent name
      const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];

      let output = `=== DUNGEON EXPLORATION IN PROGRESS ===\n\n`;
      output += `Agent ${agentName} is venturing into the dungeon...\n`;
      output += `Generating story with DeepAgent...\n\n`;

      try {
        // Create a DeepAgent for dungeon exploration
        const agent = createDeepAgent({
          model: "gpt-4o-mini",
          tools: [],
          systemPrompt: `You are a creative fantasy writer for a game called "Agents of Empire" - an RTS game where AI agents explore dungeons.

Write a short, engaging dungeon exploration report from the perspective of an agent named "${agentName}" who just explored a dark, mysterious dungeon.

The report should include:
- A dramatic opening about entering the dungeon
- 2-3 unique encounters (monsters, treasures, mysterious objects, traps, magical phenomena)
- Vivid sensory details (sounds, smells, sights)
- A discovery or treasure found
- Recommendations for future explorers

Format it as a markdown document with headers. Be creative and make each story unique and entertaining! Keep it under 400 words.

Current date/time: ${new Date().toLocaleString()}`,
        });

        // Generate creative story using the agent
        const result = await agent.invoke({
          messages: [
            { role: "user", content: "Write a dungeon exploration report." },
          ],
        });

        const story = result.messages[result.messages.length - 1]?.content as string || 
          "The agent returned but was too shaken to write a report...";

        // Create a unique filename with timestamp
        const timestamp = Date.now();
        const filename = `exploration_${timestamp}.md`;
        const filePath = path.join(taskPath, filename);

        // Write the story to the dungeon folder
        const writeResult = await sandbox.execute(`cat > "${filePath}" << 'DUNGEON_EOF'
${story}
DUNGEON_EOF`);

        output += `=== DUNGEON EXPLORATION COMPLETE ===\n\n`;
        output += `Agent ${agentName} has returned from the dungeon!\n`;
        output += `Report written to: ${filePath}\n\n`;
        output += `--- AI-Generated Report Contents ---\n\n`;
        output += story;

        if (writeResult.exitCode !== 0) {
          output += `\n\n[Warning: Failed to save report to file]`;
        }
      } catch (error) {
        output += `\n[Error generating story: ${error}]\n`;
        output += `Make sure OPENAI_API_KEY is set in your .env file`;
      }

      return output;
    },
  },
  {
    name: "custom_command",
    description: "Execute a custom shell command",
    parameters: z.object({
      taskPath: z.string().describe("The command to execute"),
    }),
    func: async ({ taskPath }: { taskPath: string }) => {
      const result = await sandbox.execute(taskPath);
      return result.output;
    },
  },
];

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Only handle POST /execute
  if (req.method === "POST" && req.url === "/execute") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { taskType, taskPath, questId, questTitle } = JSON.parse(body);

        console.log(`[Quest Server] Executing quest: ${questTitle} (${questId})`);
        console.log(`[Quest Server] Task type: ${taskType}, Path: ${taskPath}`);

        const tools = createTaskTools();
        const tool = tools.find((t) => t.name === taskType) || tools[3]; // Default to custom_command

        const timestamp = new Date().toISOString();

        let logs = `[${timestamp}] Quest Server - Executing task\n`;
        logs += `[${timestamp}] Task type: ${taskType}\n`;
        logs += `[${timestamp}] Working directory: ${sandbox.workingDirectory}\n\n`;

        const output = await tool.func({ taskPath, questTitle });
        logs += output;
        logs += `\n\n[${new Date().toISOString()}] Task completed`;

        console.log(`[Quest Server] Task completed for quest: ${questId}`);

        res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          logs,
          questId
        }));
      } catch (error) {
        console.error("[Quest Server] Error:", error);
        res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: false,
          error: String(error)
        }));
      }
    });
  } else {
    res.writeHead(404, corsHeaders);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`
========================================
  Quest Execution Server
========================================

  Server running at http://localhost:${PORT}
  Working directory: ${sandbox.workingDirectory}

  Endpoints:
    POST /execute - Execute a quest task
      Body: { taskType, taskPath, questId, questTitle }

  Available task types:
    - list_directory: List files in a directory
    - read_file: Read contents of a file
    - dungeon_explore: Explore a dungeon and generate a story
    - custom_command: Execute a custom shell command

========================================
`);
});
