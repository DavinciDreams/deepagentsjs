# DeepAgentsJS — Project Instructions

## Project Overview

This is a **pnpm monorepo** containing the **Deep Agents** TypeScript framework and its demo applications. Deep Agents is a library for building controllable AI agents using LangGraph and LangChain, inspired by Claude Code's architecture.

**Origin:** TypeScript port of [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) (Python).
**Fork:** `DavinciDreams/deepagentsjs` forked from `langchain-ai/deepagentsjs`.

## Repository Structure

```
deepagentsjs/
├── libs/
│   ├── deepagents/          # Core framework library (npm: deepagents@1.6.0)
│   └── cli/                 # CLI tool (npm: deepagents-cli@0.0.17)
├── apps/
│   └── agents-of-empire/    # 3D game demo (React + Three.js + Vite)
├── examples/                # Framework usage examples
├── pnpm-workspace.yaml      # Workspace: libs/*, apps/*, examples
├── package.json             # Root config (private: true)
└── STATE.md                 # Session state log (update after every session)
```

## Deep Agents Framework Architecture

### Core Concept

Deep Agents implements four patterns that make agents capable of complex, multi-step tasks:
1. **Planning Tool** — `write_todos` for task decomposition
2. **Sub-Agents** — `task` tool for context-isolated delegation
3. **File System** — `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep` for persistent memory
4. **Detailed Prompts** — System prompt engineering inspired by Claude Code

### Entry Point

```typescript
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  model: "claude-sonnet-4-20250514",    // or any LangChain model
  systemPrompt: "...",                   // Custom instructions
  tools: [...],                          // Additional tools
  middleware: [...],                      // Custom middleware
  subagents: [...],                      // Sub-agent definitions
  backend: (config) => new StateBackend(config),  // Storage backend
  interruptOn: { ... },                  // HITL tool configs
});
```

The returned `agent` is a standard LangGraph graph — supports streaming, human-in-the-loop, memory, and LangGraph Studio.

### Backend System (`libs/deepagents/src/backends/`)

Pluggable storage backends implementing `BackendProtocol`:

| Backend | Purpose | Persistence |
|---------|---------|-------------|
| `StateBackend` | LangGraph state (default) | Ephemeral (in-memory) |
| `StoreBackend` | LangGraph Store | Persistent via store |
| `FilesystemBackend` | Real disk I/O | Persistent on disk |
| `CompositeBackend` | Multiple backends | Depends on children |
| `BaseSandbox` | Shell command execution | Depends on impl |

Key interfaces:
- `FileInfo` — File listing data
- `FileData` — File content (content[], created_at, modified_at)
- `WriteResult/EditResult` — Operation results with state updates

### Middleware System (`libs/deepagents/src/middleware/`)

Composable middleware that extends LangChain's middleware:

| Middleware | What it does |
|-----------|-------------|
| `todoListMiddleware` | Planning/task decomposition via `write_todos` tool |
| `FilesystemMiddleware` | File tools (ls, read, write, edit, glob, grep, execute) |
| `SubAgentMiddleware` | `task` tool for spawning context-isolated subagents |
| `MemoryMiddleware` | Agent-specific persistent memory |
| `SkillsMiddleware` | Agent Skills spec (agentskills.io) — loads SKILL.md files |
| `SummarizationMiddleware` | Conversation summarization |

`createDeepAgent` automatically attaches todoList, filesystem, and subagent middleware.

### Skills Framework (`libs/deepagents/src/skills/`)

Follows the Agent Skills specification:
- Skills defined as SKILL.md files with YAML metadata
- Loadable from any backend (filesystem, state, remote)
- Progressive disclosure pattern with skill layering

### SubAgent Pattern

```typescript
interface SubAgent {
  name: string;              // How the main agent calls it
  description: string;       // Shown to main agent for selection
  systemPrompt: string;      // Subagent's own instructions
  tools?: StructuredTool[];  // Subagent-specific tools
  model?: string;            // Optional model override
  middleware?: AgentMiddleware[];
  interruptOn?: Record<string, boolean | InterruptOnConfig>;
}
```

## Agents of Empire (Demo App)

3D visualization of AI agents working on tasks. Technologies:
- **3D:** Three.js + @react-three/fiber + @react-three/drei
- **UI:** React 19, TailwindCSS, Framer Motion
- **State:** Zustand (UI), LangGraph (agents)
- **Build:** Vite + TypeScript
- **Deploy:** Vercel

Key subsystems:
- `bridge/AgentBridge.tsx` — Connects React UI to `createDeepAgent()`
- `core/Game.tsx` — Main game loop
- `core/SelectionSystem.tsx` — Multi-agent selection
- `entities/AgentPool.tsx` — Instanced rendering for 100+ agents
- `store/gameStore.ts` — Zustand state management

## Development Commands

```bash
pnpm install                          # Install all dependencies
pnpm build                            # Build libs only
pnpm test                             # Format check + lint + test libs
pnpm test:unit                        # Unit tests only
pnpm test:int                         # Integration tests only
pnpm --filter agents-of-empire dev    # Start game dev server
pnpm lint                             # ESLint on libs + examples
pnpm format                           # Prettier format
pnpm release                          # Build + changeset publish
```

## Key Patterns to Follow

### When editing framework code (`libs/deepagents/`):
- All exports go through `src/index.ts`
- Backends implement `BackendProtocol` interface
- Middleware follows LangChain's `AgentMiddleware` interface
- Tests use Vitest, co-located as `.test.ts` files
- Build with `tsdown`, dual ESM/CJS output

### When editing app code (`apps/agents-of-empire/`):
- Three.js components use `@react-three/fiber` declarative API
- Game state in Zustand store (`store/gameStore.ts`)
- Agent integration through `bridge/AgentBridge.tsx`
- UI components use TailwindCSS classes
- Vite handles bundling

### Type safety:
- TypeScript strict mode
- Zod schemas for tool parameters
- Proper interfaces for game entities and agent configs

## Submodule Migration Status

**Status:** PLANNED (not yet executed)

The plan is to extract `libs/deepagents` (and `libs/cli`) into a separate git repository and reference it as a git submodule. See `STATE.md` for the full migration plan with phases, risk assessment, and success criteria.

## Dependencies Summary

### Framework
- @langchain/anthropic, @langchain/core, @langchain/langgraph, langchain
- zod (v4), yaml, fast-glob, micromatch

### App
- React 19, Three.js 0.173, Vite 6
- @react-three/fiber, @react-three/drei, @react-three/postprocessing
- Framer Motion, TailwindCSS, Zustand, Immer

### Dev
- TypeScript 5.9, Vitest 4, ESLint 9, Prettier 3
- tsdown (bundler), tsx (runner), changesets (releases)
- pnpm@10.27.0 (package manager)