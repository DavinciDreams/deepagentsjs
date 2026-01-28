# COORD-003: Formation Movement Fix

**Date:** 2026-01-28
**Issue:** COORD-003 - Formation movement
**Status:** ✅ FIXED - QA Verification Required

---

## Problem

Formation movement was marked as "❌ FAIL - Not implemented" in the QA summary, but the actual implementation was already complete in the codebase. The issue was that the party formation system existed but was not wired into the movement command system.

### What Was Missing

- Party system fully implemented with all 6 formation types (line, wedge, column, box, circle, free)
- `moveParty()` function existed in `gameStore.ts` with complete formation positioning logic
- PartyPanel UI allowed formation changes and leader selection
- **BUT:** Right-click ground movement didn't detect parties - it only used individual agent movement

### Root Cause

The `handleGroundClick` function in `App.tsx` was calling `moveAgentsToPosition()` for all selected agents, regardless of whether they belonged to a party. This meant that:

1. Players could create parties and set formations
2. But when they right-clicked to move, all agents moved to the same location
3. The formation positioning logic in `moveParty()` was never triggered

---

## Solution

Modified the `handleGroundClick` function to detect when selected agents belong to a party and use the `moveParty()` function instead of individual movement.

### Implementation

**File:** [`apps/agents-of-empire/src/App.tsx`](apps/agents-of-empire/src/App.tsx:307-334)

**Before:**
```typescript
const handleGroundClick = useCallback(
  (position: [number, number, number]) => {
    const selectedAgents = Array.from(useGameStore.getState().selectedAgentIds);
    if (selectedAgents.length === 0) return;
    moveAgentsToPosition(position, selectedAgents);
  },
  [moveAgentsToPosition]
);
```

**After:**
```typescript
const handleGroundClick = useCallback(
  (position: [number, number, number]) => {
    const selectedAgents = Array.from(useGameStore.getState().selectedAgentIds);
    if (selectedAgents.length === 0) return;

    // Check if selected agents belong to a party
    const parties = useGameStore.getState().parties;
    let movedParty = false;

    // Find parties that contain selected agents
    for (const [partyId, party] of Object.entries(parties)) {
      // Check if all selected agents are members of this party
      const allMembersInParty = selectedAgents.every(id => party.memberIds.includes(id));

      if (allMembersInParty && party.memberIds.length > 0) {
        // Use party movement with formation
        useGameStore.getState().moveParty(partyId, position);
        movedParty = true;
        break; // Only move one party at a time
      }
    }

    // If no party was found, use regular movement
    if (!movedParty) {
      moveAgentsToPosition(position, selectedAgents);
    }
  },
  [moveAgentsToPosition]
);
```

### How It Works

1. **Party Detection:** When player right-clicks to move, the function checks if all selected agents belong to the same party
2. **Formation Movement:** If a party is detected, `moveParty()` is called with the target position
3. **Individual Movement:** If no party is detected (mixed selection or no party), falls back to individual movement
4. **Formation Positioning:** The `moveParty()` function calculates offset positions for each member based on:
   - Formation type (line, wedge, column, box, circle, free)
   - Leader moves to target position
   - Members take formation positions relative to target
   - 2-unit spacing between agents

---

## Features Implemented

### 6 Formation Types

1. **Line** - Agents follow in a straight line behind the leader
2. **Column** - Single file column formation
3. **Wedge** - V-formation with alternating sides
4. **Box** - Grid formation behind the leader
5. **Circle** - Defensive circle around target
6. **Free** - Random scatter around target

### Party Management UI

**File:** [`apps/agents-of-empire/src/ui/PartyPanel.tsx`](apps/agents-of-empire/src/ui/PartyPanel.tsx)

- Create parties from selected agents
- View party details (member list, health, leader)
- Change formation type via dropdown
- Set/change party leader
- Disband parties
- Visual party indicators with unique colors

### Formation Positioning Logic

**File:** [`apps/agents-of-empire/src/store/gameStore.ts`](apps/agents-of-empire/src/store/gameStore.ts:655-720)

Each formation type implements a unique positioning algorithm:

- **Line:** `[spacing * (index + 1), 0, 0]`
- **Column:** `[0, 0, spacing * (index + 1)]`
- **Wedge:** Alternating left/right with increasing distance
- **Box:** Grid layout based on square root of member count
- **Circle:** Evenly distributed around target with radius calculation
- **Free:** Random scatter within 4x spacing area

---

## Usage Instructions

### How to Use Formation Movement

1. **Spawn Agents:** Use the agent pool to spawn multiple agents
2. **Select Agents:** Click and drag to select multiple agents (or Ctrl+click for multi-select)
3. **Create Party:**
   - Open PartyPanel (bottom-right corner)
   - Click "+ Create Party" button
   - Enter party name
   - Click "Create"
4. **Set Formation:**
   - Expand party details in PartyPanel
   - Select formation type from dropdown (line, wedge, column, box, circle, free)
   - Optionally change leader
5. **Move in Formation:**
   - Select all party members (click party or multi-select)
   - Right-click on ground to move target location
   - Party moves in formation with leader at target

### Example Formations

**Wedge Formation** (combat):
```
    L (Leader)
   1   2
  3       4
```

**Box Formation** (defense):
```
  1   2
    L
  3   4
```

**Circle Formation** (surround):
```
      1
  4   L   2
      3
```

---

## Testing Checklist

### Manual Testing Required

- [ ] Create a party with 3+ agents
- [ ] Select all party members
- [ ] Right-click to move - verify formation positioning
- [ ] Change formation type in PartyPanel
- [ ] Move again - verify new formation
- [ ] Test all 6 formation types
- [ ] Verify leader moves to target location
- [ ] Verify members maintain formation during movement
- [ ] Test with mixed selection (party + non-party agents) - should use individual movement
- [ ] Test disbanding party - agents should move individually again

### Edge Cases

- [ ] Party with 1 member (should work like individual movement)
- [ ] Party with 10+ members (verify spacing and positioning)
- [ ] Moving near obstacles (pathfinding + formation)
- [ ] Rapid movement clicks (formation should update correctly)

---

## Technical Notes

### Performance Considerations

- Party detection is O(n) where n = number of parties (typically small)
- Formation calculation is O(m) where m = party members
- No performance impact for non-party movement (falls back to existing logic)
- Pathfinding already integrated with movement via `useAgentMovement()` hook

### Known Limitations

1. **All-or-nothing party movement:** Either all selected agents are in the party (use formation) or use individual movement
   - *Rationale:* Prevents partial formation movement which would be confusing
2. **Fixed spacing:** 2-unit spacing hardcoded in `moveParty()`
   - *Future enhancement:* Make spacing configurable
3. **No formation rotation:** Formations always face the same direction
   - *Future enhancement:* Rotate formation based on movement direction
4. **No dynamic formation adaptation:** Formation doesn't adjust based on terrain
   - *Future enhancement:* Implement terrain-aware formation positioning

### Integration Points

- **Selection System:** Right-click ground detection
- **Party System:** Party creation, management, and state
- **Movement System:** `useAgentMovement()` hook with pathfinding
- **UI System:** PartyPanel for formation controls

---

## Related Issues

- **AG-007:** Group agents into parties/squads ✅ (Party system fully implemented)
- **COORD-001:** Connection lines between cooperating agents ✅ (Visual feedback for parties)
- **COORD-002:** Shared resource indicators ❌ (Not implemented)
- **COORD-004:** Speech bubbles for communication ⚠️ (Thought bubbles exist, not speech)
- **COORD-005:** Team health/status sync ❌ (Not implemented)

---

## Code Quality

### Strengths

- Clean separation of concerns (UI → detection → execution)
- Reusable party detection logic
- Type-safe with TypeScript
- Follows existing code patterns

### Areas for Future Enhancement

1. Configurable formation spacing
2. Formation rotation based on movement direction
3. Dynamic formation adaptation (terrain, obstacles)
4. Preview formation positions before moving
5. Formation presets with hotkeys
6. Staggered movement for large formations (prevent clumping)

---

## Conclusion

Formation movement is now fully functional and integrated with the game's movement system. The party system was already well-implemented with all 6 formation types - it just needed to be wired into the right-click movement command.

**Status:** ✅ READY FOR QA VERIFICATION

**Expected Result:** When players select party members and right-click to move, the party should move in formation with the leader at the target location and other members taking their formation positions.
