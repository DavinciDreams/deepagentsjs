# Project State Log

## Architecture Overview

**DeepAgentsJS** is a TypeScript port of the Python Deep Agents library — a framework for building controllable AI agents using LangGraph and LangChain. It is organized as a **pnpm monorepo**.

### Monorepo Structure
```
deepagentsjs/
├── libs/
│   ├── deepagents/       # Core framework (npm: deepagents@1.6.0)
│   └── cli/              # CLI tool (npm: deepagents-cli@0.0.17)
├── apps/
│   └── agents-of-empire/ # 3D game demo (React + Three.js + Vite)
├── examples/             # Framework usage examples
├── pnpm-workspace.yaml   # Workspace definition
├── package.json          # Monorepo root (private: true)
└── tsconfig.json         # Shared TypeScript config
```

### Remote
- **origin:** `https://github.com/DavinciDreams/deepagentsjs.git`
- **upstream (LangChain):** `https://github.com/langchain-ai/deepagentsjs.git` (referenced in package.json but not configured as remote)

---

## Submodule Migration Plan

### Problem Statement

Currently the entire project (framework + apps + examples) lives in a single Git repository. The goal is to extract the **Deep Agents framework** (`libs/deepagents` and `libs/cli`) into a **git submodule** so that:

1. The framework can be developed independently and versioned separately
2. Applications (like `agents-of-empire`) can pin to a specific framework version
3. Multiple projects can consume the framework via submodule reference
4. Upstream changes from `langchain-ai/deepagentsjs` can be tracked cleanly

### Current Dependency Chain

```
apps/agents-of-empire   → depends on deepagents@^1.6.0 (npm)
examples/*              → depends on deepagents (workspace:*)
libs/cli                → depends on deepagents (workspace:*)
libs/deepagents         → standalone, no internal deps
```

Key observation: `agents-of-empire` already uses `"deepagents": "^1.6.0"` (npm version), NOT a workspace reference. The examples and CLI use workspace references.

### Strategy Options

#### Option A: Framework as Submodule (Recommended)

Extract `libs/deepagents` (and optionally `libs/cli`) into their own repository, then reference it as a git submodule in the monorepo.

**New repo structure:**
```
deepagentsjs/                     # This repo (app/consumer repo)
├── libs/
│   ├── deepagents/              # ← git submodule pointing to framework repo
│   └── cli/                     # Stays here OR moves with framework
├── apps/
│   └── agents-of-empire/
├── examples/
└── pnpm-workspace.yaml          # Still references libs/*
```

**Framework repo (new, separate):**
```
deepagents-framework/             # New standalone repo
├── src/
│   ├── agent.ts
│   ├── types.ts
│   ├── config.ts
│   ├── index.ts
│   ├── backends/
│   ├── middleware/
│   ├── skills/
│   └── testing/
├── package.json                  # name: deepagents
├── tsconfig.json
├── tsdown.config.ts
└── vitest.config.ts
```

#### Option B: Fork Tracking via Submodule

Keep the upstream `langchain-ai/deepagentsjs` as a submodule and build apps on top. This is simpler but less clean since the upstream repo contains the full monorepo structure.

### Recommended Plan: Option A

#### Phase 1: Prepare the Framework Repository

1. **Create new GitHub repo** `DavinciDreams/deepagents-framework` (or similar name)
2. **Extract framework code** using `git subtree split`:
   ```bash
   # From deepagentsjs root
   git subtree split --prefix=libs/deepagents -b framework-extract
   ```
3. **Push extracted history** to the new repo:
   ```bash
   cd /path/to/new/deepagents-framework
   git init
   git pull ../deepagentsjs framework-extract
   git remote add origin https://github.com/DavinciDreams/deepagents-framework.git
   git push -u origin main
   ```
4. **Verify** the new repo builds and tests pass independently:
   ```bash
   pnpm install
   pnpm build
   pnpm test
   ```

#### Phase 2: Decide on CLI Placement

**Decision needed:** Should `libs/cli` move with the framework or stay in the app repo?

- **Move with framework:** CLI is tightly coupled to framework internals. Makes sense if it's published alongside `deepagents`.
- **Keep in app repo:** CLI is more of a consumer tool. Simpler submodule boundary.

**Recommendation:** Move CLI with the framework since it depends on `deepagents` directly and is published to npm alongside it.

If CLI moves too, the `git subtree split` should cover both:
```bash
# Alternative: extract both libs as a subtree
# This is harder with subtree since they're siblings, not nested.
# Better approach: manually create the new repo with both packages.
```

#### Phase 3: Convert to Submodule in App Repo

1. **Remove framework files** from the app repo:
   ```bash
   git rm -r libs/deepagents
   # And optionally:
   git rm -r libs/cli
   git commit -m "Remove framework code (moving to submodule)"
   ```

2. **Add framework as submodule:**
   ```bash
   git submodule add https://github.com/DavinciDreams/deepagents-framework.git libs/deepagents
   git commit -m "Add deepagents framework as git submodule"
   ```

3. **Update pnpm-workspace.yaml** — it should still work since `libs/*` glob will pick up the submodule directory.

4. **Update root package.json scripts** — no changes needed if `libs/*` filter still resolves correctly.

5. **Verify workspace resolution:**
   ```bash
   pnpm install
   pnpm build
   pnpm test
   ```

#### Phase 4: Configure Submodule Workflow

1. **Pin submodule to a specific commit/tag:**
   ```bash
   cd libs/deepagents
   git checkout v1.6.0  # or specific commit
   cd ../..
   git add libs/deepagents
   git commit -m "Pin deepagents submodule to v1.6.0"
   ```

2. **Add `.gitmodules` config:**
   ```ini
   [submodule "libs/deepagents"]
       path = libs/deepagents
       url = https://github.com/DavinciDreams/deepagents-framework.git
       branch = main
   ```

3. **Document submodule workflow** in README:
   - `git clone --recurse-submodules` for fresh clones
   - `git submodule update --init --recursive` after pulling
   - `git submodule update --remote` to pull latest framework changes

#### Phase 5: Update CI/CD & Dependencies

1. **Update any CI workflows** to checkout with `--recurse-submodules`
2. **Update Vercel deployment** for agents-of-empire (may need submodule support enabled)
3. **Update changeset configuration** — framework versioning now happens in its own repo
4. **Ensure `deepagents` npm publish** happens from the framework repo, not the app repo

#### Phase 6: Upstream Tracking (Optional)

If you want to track changes from `langchain-ai/deepagentsjs`:

```bash
# In the framework repo
git remote add upstream https://github.com/langchain-ai/deepagentsjs.git
git fetch upstream
# Cherry-pick or merge relevant changes from upstream's libs/deepagents
```

### Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| pnpm workspace breaks with submodule | Build fails | Test workspace resolution before committing |
| Git history lost for framework files | Annoying but not critical | Use `git subtree split` to preserve history |
| CI/CD doesn't handle submodules | Deploys break | Add `--recurse-submodules` to all checkout steps |
| Vercel doesn't support submodules | agents-of-empire deploy breaks | Vercel does support submodules — verify in settings |
| Changeset publishing breaks | npm releases fail | Move changeset config to framework repo |
| Contributors forget `--recurse-submodules` | Missing framework code | Document in README + add git hooks |

### Success Criteria

- [ ] Framework repo builds and tests independently
- [ ] App repo clones with `--recurse-submodules` and builds correctly
- [ ] `pnpm install && pnpm build && pnpm test` passes in app repo
- [ ] `agents-of-empire` dev server starts correctly
- [ ] npm publish still works for `deepagents` package
- [ ] Submodule can be updated to pull new framework changes

---

## Current Status

### Working Features
- Framework: deepagents@1.6.0 published to npm
- CLI: deepagents-cli@0.0.17 published to npm
- App: agents-of-empire with 3D visualization, selection system, agent bridge

### In Progress
- Submodule migration planning (this document)

### Known Issues
- No `.gitmodules` exists yet (no submodules configured)
- Root `package.json` has `"deepagents": "^1.6.0"` in dependencies (likely unneeded at root level)

## File Inventory

### Core Framework (libs/deepagents/src/)
- `agent.ts` — Core `createDeepAgent()` function
- `types.ts` — Type definitions & inference helpers
- `config.ts` — Configuration & project root detection
- `index.ts` — Public API exports
- `backends/` — Pluggable storage backends (state, store, filesystem, sandbox, composite)
- `middleware/` — Agent middleware (memory, fs, skills, subagents, summarization)
- `skills/` — Skill management (YAML loading, metadata parsing)
- `testing/` — Test utilities

### CLI (libs/cli/src/)
- `cli.ts` — CLI entry point
- `index.ts` — Exported API

### App (apps/agents-of-empire/src/)
- `App.tsx` — Main app component
- `bridge/AgentBridge.tsx` — Deep Agents integration
- `core/` — Game engine (Game, CameraController, SelectionSystem)
- `entities/` — 3D objects (GameAgent, Dragon, Structure, AgentPool)
- `world/` — Environment (WorldManager, Terrain)
- `ui/` — UI components (HUD, PartyPanel, ToolCard, etc.)
- `store/gameStore.ts` — Zustand state management

## Dependencies

### Framework
- @langchain/anthropic ^1.3.11
- @langchain/core ^1.1.16
- @langchain/langgraph ^1.1.1
- langchain ^1.2.12
- zod ^4.3.5

### App
- React 19, Three.js 0.173, Vite 6
- @react-three/fiber, @react-three/drei, @react-three/postprocessing
- Framer Motion, TailwindCSS, Zustand

## Development Notes

- Build: `pnpm build` (libs only)
- Test: `pnpm test` (format check + lint + libs tests)
- Dev server: `cd apps/agents-of-empire && pnpm dev`
- Package manager: pnpm@10.27.0
- TypeScript target: ES2021