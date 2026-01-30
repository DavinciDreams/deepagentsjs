# Future Improvements

**Date:** 2026-01-28  
**Source:** QA Verification of Issues Marked Ready for QA

This document tracks optional future improvements identified during QA verification. These are not blocking issues but represent opportunities for code quality and consistency improvements.

---

## Priority 1: Medium Impact

### COMB-007: Standardize Reinforcement Radius

**Issue:** Inconsistent reinforcement radius between manual and automatic calling mechanisms.

**Current Behavior:**
- Manual reinforcement: Default radius is **15 units** ([`Dragon.tsx:474`](apps/agents-of-empire/src/entities/Dragon.tsx:474))
- Auto reinforcement: Radius is **20 units** ([`GameHooks.ts:180`](apps/agents-of-empire/src/core/GameHooks.ts:180))

**Recommendation:** Standardize to **20 units** for consistency between manual and auto reinforcement.

**Impact:** Improves UX consistency and reduces confusion about reinforcement range.

**Files to Modify:**
- [`apps/agents-of-empire/src/entities/Dragon.tsx`](apps/agents-of-empire/src/entities/Dragon.tsx:474) - Change default radius from 15 to 20

---

### MAP-006: Refactor Duplicate Code in Path Following

**Issue:** Code duplication in path following logic creates maintenance burden.

**Location:** [`GameAgent.tsx`](apps/agents-of-empire/src/entities/GameAgent.tsx)

**Duplicate Code Sections:**
- Lines 996-1002 and 1019-1028 contain nearly identical movement logic

**Recommendation:** Extract common movement logic into a shared helper function.

**Impact:** Reduces code duplication, makes maintenance easier, and prevents bugs from divergent implementations.

**Example Refactoring:**
```typescript
// Extract this logic into a shared function
function moveToNextNode(agent: GameAgent, path: Vector3[], currentIndex: number) {
  if (currentIndex >= path.length) return { reached: true, newIndex: currentIndex };
  
  const targetPos = path[currentIndex];
  const distance = agent.position.distanceTo(targetPos);
  
  if (distance < 0.5) {
    return { reached: true, newIndex: currentIndex + 1 };
  }
  
  // Move towards target
  const direction = new Vector3()
    .subVectors(targetPos, agent.position)
    .normalize();
  agent.position.add(direction.multiplyScalar(agent.speed * 0.016));
  
  return { reached: false, newIndex: currentIndex };
}
```

---

## Priority 2: Low Impact

### MAP-006: Make Structure Collision Radius Configurable

**Issue:** Structure collision radius is hardcoded to **1 tile** for all structure types.

**Location:** [`WorldManager.tsx:245`](apps/agents-of-empire/src/world/WorldManager.tsx:245)

**Current Behavior:** All structures use the same 1-tile collision radius, regardless of actual size.

**Structure Sizes:**
- Castle: 4 units
- Tower: 3 units
- Workshop: 2.5 units
- Campfire: 1.5 units
- Base: 4 units

**Recommendation:** Make collision radius configurable based on structure type.

**Impact:** More accurate pathfinding around larger structures.

**Example Implementation:**
```typescript
const STRUCTURE_COLLISION_RADIUS: Record<string, number> = {
  castle: 2,
  tower: 1.5,
  workshop: 1.25,
  campfire: 0.75,
  base: 2,
};

const collisionRadius = STRUCTURE_COLLISION_RADIUS[structure.type] || 1;
```

---

### UI-002: Clear Anti-Spam Flag on Dragon Defeat

**Issue:** Anti-spam flag for reinforcement calls is not cleared when dragon is defeated.

**Location:** [`GameHooks.ts:156-163`](apps/agents-of-empire/src/core/GameHooks.ts:156-163)

**Current Behavior:** Flag is cleared only when agent is in ERROR or IDLE state.

**Recommendation:** Also clear flag when dragon is defeated to allow calling reinforcements in subsequent combat scenarios.

**Impact:** Ensures reinforcement system works correctly across multiple combat encounters.

---

## Code Quality Improvements

### Remove Unused Imports

**Files with Unused Imports:**
- [`Structure.tsx`](apps/agents-of-empire/src/entities/Structure.tsx:3) - `Color` from "three"
- [`Structure.tsx`](apps/agents-of-empire/src/entities/Structure.tsx:4) - `Text` from "@react-three/drei"
- [`Structure.tsx`](apps/agents-of-empire/src/entities/Structure.tsx:6) - `shallow` from "zustand/shallow"

**Impact:** Clean up code, reduce bundle size slightly.

---

### Fix TypeScript Type Error

**Issue:** Property 'currentQuest' does not exist on type 'GameAgent'.

**Location:** [`Structure.tsx:69`](apps/agents-of-empire/src/entities/Structure.tsx:69)

**Current Code:**
```typescript
const assignedAgentCount = useMemo(() => {
  return Object.values(agents).filter(agent => agent.currentQuest === structure.id).length;
}, [agents, structure.id]);
```

**Recommendation:** Verify if `currentQuest` property exists on GameAgent type or use a different property to track assigned agents.

**Impact:** Fixes TypeScript compilation error.

---

## Performance Monitoring

### Tooltip Performance Metrics

**Optimizations Implemented (2026-01-28):**
- Position update frequency reduced from 60fps to 30fps (50% reduction)
- LOD prevents rendering tooltips on distant objects (>60 units)
- React.memo prevents unnecessary re-renders
- Debounced hover detection (100ms) prevents flickering

**Future Monitoring:**
- Monitor tooltip render performance in production
- Consider dynamic LOD adjustment based on frame rate
- Implement tooltip pooling if performance issues arise

---

## Documentation Updates

### Add Performance Guidelines

**Recommendation:** Document performance best practices for 3D object tooltips.

**Topics to Cover:**
- LOD thresholds for different object types
- Throttling strategies for position updates
- Memoization patterns for React components
- Debouncing hover events

---

## Summary

| Priority | Issue | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Standardize reinforcement radius | Medium | Low |
| 1 | Refactor duplicate path following code | Medium | Medium |
| 2 | Configurable structure collision radius | Low | Low |
| 2 | Clear anti-spam flag on dragon defeat | Low | Low |
| - | Remove unused imports | Low | Very Low |
| - | Fix TypeScript type error | Low | Low |

**Total:** 6 improvements identified (2 medium priority, 4 low priority)

---

**Next Steps:**
1. Prioritize improvements based on team capacity
2. Create separate issues for each improvement
3. Assign to appropriate developers
4. Track progress in project management system
