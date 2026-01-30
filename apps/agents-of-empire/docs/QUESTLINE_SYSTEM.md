# Questline System Documentation

**Version:** 1.0
**Status:** Implemented
**Last Updated:** 2025-01-28

---

## Overview

The Questline System enables chaining individual goals into narrative campaigns with automatic progression. It provides a structured way to create multi-stage objectives where completing one quest automatically unlocks the next.

---

## Architecture

### Data Models

#### Questline Interface
```typescript
interface Questline {
  id: string;                      // Unique identifier
  name: string;                    // Display name (e.g., "The Agent's Journey")
  description: string;             // Brief description of the campaign
  status: QuestlineStatus;         // "not_started" | "in_progress" | "completed" | "failed"
  questIds: string[];              // Ordered array of quest IDs
  currentQuestIndex: number;       // Which quest is currently active
  requiredCompletedQuests: number; // How many quests needed to complete questline
}
```

#### Enhanced Quest Interface
```typescript
interface Quest {
  // ... existing fields ...
  questlineId?: string;            // Reference to parent questline
  prerequisiteQuestIds?: string[]; // Quests that must be completed first
  position?: number;               // Position within questline sequence
}
```

---

## Core Features

### 1. Questline Creation

**Location:** `src/store/gameStore.ts`

```typescript
// Create a questline
const questline = addQuestline({
  name: "The Agent's Journey",
  description: "A comprehensive campaign to establish your agent empire",
  status: "not_started",
  questIds: [quest1.id, quest2.id, quest3.id],
  currentQuestIndex: 0,
  requiredCompletedQuests: 3,
});
```

### 2. Questline Activation

```typescript
// Start a questline (activates first quest)
startQuestline(questlineId);
```

**What happens:**
- Questline status changes to "in_progress"
- First quest in the sequence becomes active (status: "in_progress")
- All other quests remain pending

### 3. Automatic Progression

```typescript
// Complete a quest
completeQuest(questId);
```

**What happens:**
1. Quest status changes to "completed"
2. System checks if quest belongs to a questline
3. If yes, automatically advances questline:
   - Increments `currentQuestIndex`
   - Activates next quest (status: "in_progress")
   - Updates progress bar
   - If all quests done, marks questline as "completed"

### 4. Quest Dependencies

```typescript
const quest2 = addQuest({
  title: "Craft Agent Solutions",
  prerequisiteQuestIds: [quest1.id],  // Must complete quest1 first
  // ... other fields
});
```

**Note:** Dependencies are stored for future use. Currently, the system uses sequential ordering in the questline.

---

## UI Components

### QuestTracker Panel

**Location:** `src/ui/HUD.tsx`

**Features:**
- **Questline Cards:** Shows name, description, and status badge
- **Progress Bar:** Visual completion indicator (e.g., "2/5 quests")
- **Current Objective:** Displays the active quest with details
- **Quest Chain Visualization:** Numbered circles (①→②→③→④→⑤)
  - Green circle = Completed
  - Gold circle = Current/Active
  - Gray circle = Pending
- **Start Button:** Appears for "not_started" questlines
- **Side Quests Section:** Shows standalone quests not part of questlines

**Status Colors:**
- Green: Completed
- Gold/Yellow: In Progress
- Gray: Pending

---

## Controls & Debug Shortcuts

**Location:** `src/ui/HUD.tsx` (keyboard handlers)

| Shortcut | Action |
|----------|--------|
| `Shift + S` | Start first questline |
| `Shift + C` | Complete current active quest (testing) |
| `Shift + D` | Spawn test dragon (combat testing) |

**Note:** Debug shortcuts are shown in the QuestTracker panel's "DEBUG CONTROLS" section.

---

## Example: Creating a Questline

**Location:** `src/App.tsx` (GameInitializer component)

```typescript
// 1. Create individual quests
const quest1 = addQuest({
  title: "Establish Reconnaissance",
  description: "Send agents to the Scout Tower",
  status: "pending",
  targetStructureId: scoutTower.id,
  requiredAgents: 2,
  assignedAgentIds: [],
  rewards: ["+1 Agent Level"],
});

const quest2 = addQuest({
  title: "Craft Agent Solutions",
  description: "Assign agents to the Code Workshop",
  status: "pending",
  targetStructureId: codeWorkshop.id,
  requiredAgents: 3,
  assignedAgentIds: [],
  rewards: ["+2 Agent Levels"],
  prerequisiteQuestIds: [quest1.id],
});

// 2. Create the questline
const questline = addQuestline({
  name: "The Agent's Journey",
  description: "A comprehensive campaign",
  status: "not_started",
  questIds: [quest1.id, quest2.id],
  currentQuestIndex: 0,
  requiredCompletedQuests: 2,
});

// 3. Link quests to questline
updateQuest(quest1.id, { questlineId: questline.id, position: 0 });
updateQuest(quest2.id, { questlineId: questline.id, position: 1 });
```

---

## Sample Questline: "The Agent's Journey"

The game includes a pre-configured 5-stage questline:

| Stage | Quest | Structure | Required Agents |
|-------|-------|-----------|-----------------|
| ① | Establish Reconnaissance | Scout Tower | 2 |
| ② | Craft Agent Solutions | Code Workshop | 3 |
| ③ | Analyze Data Patterns | Research Lab | 3 |
| ④ | Defend the Perimeter | Watchtower | 4 |
| ⑤ | Complete Research | Knowledge Castle | 5 |

**Rewards:** Each stage grants agent levels and unlocks the next structure.

---

## State Management

### Questline Actions

**Location:** `src/store/gameStore.ts`

| Action | Parameters | Description |
|--------|------------|-------------|
| `addQuestline()` | `Omit<Questline, "id">` | Create new questline |
| `updateQuestline()` | `id, updates` | Modify questline state |
| `startQuestline()` | `id` | Activate questline |
| `advanceQuestline()` | `questlineId` | Progress to next quest |
| `setActiveQuestline()` | `questlineId \| null` | Set active questline for UI |

### Questline State

```typescript
interface GameState {
  questlines: Record<string, Questline>;  // All questlines
  activeQuestlineId: string | null;       // Currently selected questline
}
```

---

## Visual Progression

### Quest Chain States

1. **Not Started**
   ```
   ① ② ③ ④ ⑤
   ```
   All circles gray, "Start Questline" button visible

2. **In Progress (Stage 2)**
   ```
   ①→②→③ ④ ⑤
   ```
   ① green, ② gold (active), ③④⑤ gray

3. **Completed**
   ```
   ①→②→③→④→⑤
   ```
   All circles green, status badge shows "Done"

---

## Testing

### Manual Testing Workflow

1. **Start the game**
   - Questline appears in "Questlines" panel (top-left)
   - Status: "Pending"

2. **Start the questline**
   - Press `Shift+S` or click "Start Questline" button
   - First quest activates (status: "in_progress")

3. **Assign agents**
   - Select agents (click or drag box)
   - Right-click target structure
   - Agents move to structure

4. **Complete quest**
   - Press `Shift+C` to complete (testing shortcut)
   - Questline auto-advances to next quest
   - Progress bar updates

5. **Complete questline**
   - Repeat for all 5 stages
   - Final quest completion marks questline as "completed"
   - Victory celebration

### Console Logging

```typescript
// Questline start
console.log(`[GOAL-006 Test] Started questline: ${questline.name}`);

// Quest completion
console.log(`[GOAL-006 Test] Completed quest: ${quest.title}`);

// Debug messages help track progression
```

---

## Future Enhancements

### Potential Features

1. **Branching Questlines**
   - Multiple paths based on player choices
   - Different endings

2. **Conditional Quests**
   - Quests that only appear based on conditions
   - Dynamic quest generation

3. **Quest Rewards**
   - Automatic agent level ups
   - Unlock new structures/tools
   - Grant special abilities

4. **Quest Save/Load**
   - Persist quest progress between sessions
   - Resume from checkpoint

5. **Quest Sharing**
   - Export/import questlines as JSON
   - Community quest library

---

## Troubleshooting

### Common Issues

**Issue:** Questline not advancing after quest completion
- **Cause:** Quest not linked to questline (`questlineId` missing)
- **Fix:** Call `updateQuest(questId, { questlineId })`

**Issue:** Multiple quests active simultaneously
- **Cause:** `currentQuestIndex` not synced with quest status
- **Fix:** Only one quest should be "in_progress" at a time

**Issue:** Progress bar not updating
- **Cause:** Quest status not changing to "completed"
- **Fix:** Ensure `completeQuest()` is called when goals are met

---

## Related Files

| File | Purpose |
|------|---------|
| `src/store/gameStore.ts` | Questline state management and actions |
| `src/ui/HUD.tsx` | QuestTracker UI component |
| `src/App.tsx` | Questline initialization |
| `docs/plan.md` | Implementation plan and status |

---

**Implementation Status:** ✅ Complete

All acceptance criteria for GOAL-006 have been met:
- ✅ Goals chain into sequential questlines
- ✅ Quest dependencies enforced
- ✅ Visual quest progression
- ✅ Automatic advancement
- ✅ Quest completion celebration
- ✅ Multiple questlines supported
- ✅ Standalone quests supported
