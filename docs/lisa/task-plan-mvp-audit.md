# Task Plan: MVP Audit - Browser Testing & Bug Fixes

## Overview

Based on the investigation, we need to:
1. **Actually test features in browser** (not just read code)
2. **Fix critical bugs** (context menu, pathfinding)
3. **Document what works and what doesn't**

**Critical**: Following LISA Loop Golden Rule - "Never claim a feature works without testing it yourself."

---

## Subtasks

### Subtask 1: Browser Testing Setup
- **Agent**: general-purpose
- **Files**: `apps/agents-of-empire/`, local server
- **Description**: Start local development server and verify it runs
- **QA Criteria**:
  - [ ] Dev server starts without errors
  - [ ] Application loads in browser
  - [ ] No console errors on load
  - [ ] Terrain renders correctly
  - [ ] Agents appear on screen
- **Dependencies**: None

### Subtask 2: Test Phase 1 - Foundation Features
- **Agent**: Use Skill: `webapp-testing` with Playwright
- **Files**: `apps/agents-of-empire/src/core/CameraController.ts`, `src/core/SelectionSystem.ts`
- **Description**: Test camera controls, selection, agent movement
- **QA Criteria**:
  - [ ] Scroll wheel zooms in/out (0.2x to 5.0x)
  - [ ] Edge-scrolling pans camera
  - [ ] Middle-click drag pans camera
  - [ ] WASD/arrow keys pan camera
  - [ ] Q/E keys rotate camera
  - [ ] Click agent → agent highlights
  - [ ] Drag box → multiple agents highlight
  - [ ] Shift+click → toggle selection
  - [ ] Click ground → selected agents move
  - [ ] **Test if agents navigate around obstacles** (pathfinding)
- **Dependencies**: Subtask 1
- **Evidence Required**: Screenshots or video of each test

### Subtask 3: Test Phase 3 - Context Menu (CRITICAL BUG)
- **Agent**: Use Skill: `webapp-testing` with Playwright
- **Files**: `apps/agents-of-empire/src/core/SelectionSystem.tsx`, `src/ui/HUD.tsx`
- **Description**: Test right-click context menu functionality
- **QA Criteria**:
  - [ ] Right-click on agent → context menu appears
  - [ ] Context menu shows agent name, level, state
  - [ ] "Open Inventory" button works
  - [ ] "Hold Position" button works
  - [ ] "Return to Base" button works
  - [ ] Click outside menu → menu closes
  - [ ] Check console logs for debug output
- **Dependencies**: Subtask 1
- **Evidence Required**: Screenshots + console log output

**If this fails**, document the exact issue and create bug fix subtask.

### Subtask 4: Test Phase 3 - UI Panels
- **Agent**: Use Skill: `webapp-testing` with Playwright
- **Files**: `apps/agents-of-empire/src/ui/HUD.tsx`
- **Description**: Test all UI panels render and function
- **QA Criteria**:
  - [ ] Agent panel shows selected agent details
  - [ ] Inventory panel shows tools with rarity colors
  - [ ] Rarity filter tabs work (All/Common/Rare/Epic/Legendary)
  - [ ] Click tool in inventory → tool equips
  - [ ] Quest tracker displays (even if empty)
  - [ ] Minimap shows agents and structures
  - [ ] Top bar shows counts (units/objectives/threats)
- **Dependencies**: Subtask 1
- **Evidence Required**: Screenshots of each panel

### Subtask 5: Test Phase 4 - Goal Structures
- **Agent**: Use Skill: `webapp-testing` with Playwright
- **Files**: `apps/agents-of-empire/src/entities/Structure.tsx`
- **Description**: Test goal structure interaction
- **QA Criteria**:
  - [ ] All 5 structure types visible (Castle, Tower, Workshop, Campfire, Base)
  - [ ] Structures have unique colors/appearances
  - [ ] Hover structure → highlight ring appears
  - [ ] Select agents + right-click structure → agents move to structure
  - [ ] Structure shows "Right-click to assign" text when agents selected
  - [ ] Structures appear on minimap
- **Dependencies**: Subtask 1
- **Evidence Required**: Screenshots of each structure type

### Subtask 6: Test Phase 4 - Dragon Combat
- **Agent**: Use Skill: `webapp-testing` with Playwright
- **Files**: `apps/agents-of-empire/src/entities/Dragon.tsx`, `src/ui/HUD.tsx`
- **Description**: Test dragon spawning and combat
- **QA Criteria**:
  - [ ] Press Shift+D → dragon spawns
  - [ ] Dragon appears with unique appearance based on type
  - [ ] Dragon health bar shows
  - [ ] Right-click agent with dragon nearby → combat menu appears
  - [ ] Click "Attack" → damage dealt
  - [ ] Dragon defeated → dragon disappears, agent gains XP
  - [ ] Dragon count updates in top bar
- **Dependencies**: Subtask 1
- **Evidence Required**: Screenshots + console logs

### Subtask 7: Test Phase 2 - Agent States
- **Agent**: Use Skill: `webapp-testing` with Playwright
- **Files**: `apps/agents-of-empire/src/entities/GameAgent.tsx`
- **Description**: Verify all agent states display correctly
- **QA Criteria**:
  - [ ] Agents have different colors based on state
  - [ ] IDLE state → blue color
  - [ ] THINKING state → purple color, pulsing glow
  - [ ] MOVING state → green color
  - [ ] WORKING state → orange color
  - [ ] ERROR state → red color, shake animation
  - [ ] COMPLETING state → gold color, celebration effects
  - [ ] State icons appear above agents
- **Dependencies**: Subtask 1
- **Evidence Required**: Screenshots of each state

### Subtask 8: Fix Context Menu Bug (IF BROKEN)
- **Agent**: feature-dev:code-architect or general-purpose
- **Files**: `apps/agents-of-empire/src/core/SelectionSystem.tsx`
- **Description**: Debug and fix right-click context menu
- **Pattern**: Event handling, canvas event propagation
- **QA Criteria**:
  - [ ] Root cause identified
  - [ ] Fix implemented
  - [ ] Tested in browser - context menu appears
  - [ ] All menu buttons work
  - [ ] No console errors
- **Dependencies**: Subtask 3 (only if it fails)

### Subtask 9: Fix Pathfinding Integration (IF NEEDED)
- **Agent**: feature-dev:code-architect or general-purpose
- **Files**: `apps/agents-of-empire/src/entities/GameAgent.tsx`, `src/world/WorldManager.tsx`
- **Description**: Connect A* pathfinding to agent movement
- **Pattern**: Path integration, obstacle avoidance
- **QA Criteria**:
  - [ ] Agents use A* pathfinding for movement
  - [ ] Agents navigate around water/stone tiles
  - [ ] Path visualization (optional debug view)
  - [ ] Tested in browser - agents avoid obstacles
- **Dependencies**: Subtask 2 (only if agents don't navigate)

### Subtask 10: Create Final Audit Report
- **Agent**: general-purpose
- **Files**: `docs/lisa/mvp-audit-final-report.md`
- **Description**: Compile all test results into final report
- **Pattern**: Documentation, evidence compilation
- **QA Criteria**:
  - [ ] All test results documented
  - [ ] Screenshots/evidence linked
  - [ ] Working features listed
  - [ ] Broken features listed with bugs
  - [ ] Missing features listed
  - [ ] Recommendations for completion
- **Dependencies**: Subtasks 2-7

---

## Progress Tracking Template

After starting work, create `docs/lisa/progress-mvp-audit.md` with:

```markdown
# Progress: MVP Audit

### Subtask 1: Browser Testing Setup
- **Status**: ⬜ Pending / 🔄 In Progress / ✅ Complete / ❌ Failed
- **Agent**: [Agent ID]
- **Started**: [Timestamp]
- **Completed**: [Timestamp]
- **QA Results**: [What passed/failed]
- **Evidence**: [Screenshots/logs links]

### Subtask 2: Test Phase 1 - Foundation
- **Status**: ⬜ Pending
- **Dependencies**: Subtask 1

[... and so on ...]
```

---

## Tools & Skills Required

### Skills
- **webapp-testing**: Playwright browser automation for testing features
- **feature-dev:code-architect**: For designing bug fixes
- **general-purpose**: For running tests and compiling report

### Tools
- **Bash**: For starting dev server (`npm run dev`)
- **Read**: For reading code files
- **Write**: For creating report documents

---

## Execution Order

1. **Sequential**: Subtask 1 → Subtask 2 → Subtask 3 → Subtask 4 → Subtask 5 → Subtask 6 → Subtask 7
2. **Conditional**: Subtask 8 & 9 (only if bugs found)
3. **Final**: Subtask 10 (compile report)

---

## Expected Outcomes

After completing all subtasks, we will have:
- ✅ **Actual test evidence** of what works (not just code inspection)
- 📋 **Complete bug list** with specific issues
- 🔧 **Fixes implemented** for critical bugs (context menu, pathfinding)
- 📊 **Final audit report** showing MVP completion percentage
- 💡 **Recommendations** for completing missing features

This follows the LISA Loop principle: **"Never claim a feature works without testing it yourself."**
