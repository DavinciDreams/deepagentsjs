# COORD-005: Team Health/Status Sync Implementation

**Date:** 2026-01-28
**Issue:** COORD-005 - Team health/status sync
**Status:** ✅ COMPLETED - Requires QA verification

---

## Summary

Implemented unified health and status synchronization for agent parties. When multiple agents from the same party are selected, the UI now displays aggregated party information including total health, health percentage, and state distribution across all party members.

---

## Changes Made

### 1. AgentPanel Party Status Display
**File:** [`apps/agents-of-empire/src/ui/HUD.tsx:172-229`](apps/agents-of-empire/src/ui/HUD.tsx:172-229)

Added party status calculation and display in the AgentPanel component:

```typescript
// Calculate party info when multiple party members are selected
const partyInfo = useMemo(() => {
  if (selectedAgents.length === 0) return null;

  const partyIds = selectedAgents
    .map((agent) => agent.partyId)
    .filter((id): id is string => id !== null);

  if (partyIds.length === 0) return null;
  if (new Set(partyIds).size !== 1) return null; // Multiple parties

  const partyId = partyIds[0];
  const party = partiesMap[partyId];

  if (!party) return null;

  // Calculate party health
  const members = party.memberIds
    .map((id) => agentsMap[id])
    .filter((agent): agent is GameAgent => agent !== undefined);

  const totalHealth = members.reduce((sum, agent) => sum + agent.health, 0);
  const totalMaxHealth = members.reduce((sum, agent) => sum + agent.maxHealth, 0);
  const healthPercent = (totalHealth / totalMaxHealth) * 100;

  // Get party state distribution
  const stateDistribution = members.reduce((acc, agent) => {
    acc[agent.state] = (acc[agent.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    party,
    totalHealth,
    totalMaxHealth,
    healthPercent,
    memberCount: members.length,
    totalMembers: party.memberIds.length,
    stateDistribution,
  };
}, [selectedAgents, partiesMap, agentsMap]);
```

**UI Display:**
- Party name with color indicator
- Party count (selected/total)
- Party health bar with color coding (green > 50%, yellow > 30%, red < 30%)
- State distribution badges showing count of agents in each state

### 2. Agent Tooltip Party Information
**File:** [`apps/agents-of-empire/src/ui/Object3DTooltip.tsx:77-95`](apps/agents-of-empire/src/ui/Object3DTooltip.tsx:77-95)

Added party name and color to agent tooltips:

```typescript
interface AgentTooltipContentProps {
  // ... existing props
  partyName?: string; // COORD-005: Party info
  partyColor?: string; // COORD-005: Party color
}

export function AgentTooltipContent({
  // ... existing props
  partyName,
  partyColor,
}: AgentTooltipContentProps) {
  return (
    <div className="space-y-2">
      {/* ... existing header */}

      {/* Party info - COORD-005 */}
      {partyName && partyColor && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: partyColor }}
          />
          <span className="text-xs text-gray-300">{partyName}</span>
        </div>
      )}

      {/* ... rest of tooltip */}
    </div>
  );
}
```

### 3. Party Indicator Visual in 3D View
**File:** [`apps/agents-of-empire/src/entities/GameAgent.tsx:519-540`](apps/agents-of-empire/src/entities/GameAgent.tsx:519-540)

Added visual party indicator banner above party members:

```typescript
interface GameAgentVisualProps {
  // ... existing props
  partyName?: string; // COORD-005: Party name for tooltip
  partyColor?: string; // COORD-005: Party color for tooltip
}

export function GameAgentVisual({
  // ... existing props
  partyColor,
}: GameAgentVisualProps) {
  // ... existing code

  return (
    <group>
      {/* ... existing rings and effects */}

      {/* Party indicator - COORD-005 */}
      {partyColor && (
        <group position={[0, 1.8, 0]}>
          {/* Party banner/flag */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.05]} />
            <meshStandardMaterial color={partyColor} emissive={partyColor} emissiveIntensity={0.3} />
          </mesh>
          {/* Party icon (circle) */}
          <mesh position={[0, 0, 0.03]}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}

      {/* ... agent body */}
    </group>
  );
}
```

### 4. Party Data Propagation
**Files:**
- [`apps/agents-of-empire/src/entities/GameAgent.tsx:795-801`](apps/agents-of-empire/src/entities/GameAgent.tsx:795-801) - LODAgentRenderer props
- [`apps/agents-of-empire/src/entities/GameAgent.tsx:863-881`](apps/agents-of-empire/src/entities/GameAgent.tsx:863-881) - Party info lookup
- [`apps/agents-of-empire/src/entities/GameAgent.tsx:895-903`](apps/agents-of-empire/src/entities/GameAgent.tsx:895-903) - AgentPool integration

Added `partiesMap` prop to LODAgentRenderer and propagated party data to individual agents:

```typescript
// AgentPool component
export function AgentPool({ onAgentClick }: AgentPoolProps) {
  const agents = useAgentsShallow() as Record<string, GameAgentType>;
  const partiesMap = usePartiesShallow(); // COORD-005

  return (
    <LODAgentRenderer
      agents={agentsArray}
      partiesMap={partiesMap} // COORD-005
      // ... other props
    />
  );
}

// LODAgentRenderer component
export function LODAgentRenderer({
  // ... existing props
  partiesMap = {}, // COORD-005
}: LODAgentRendererProps) {
  return (
    <>
      {/* ... instanced renderer */}
      {nearbyAgents.map((agent) => {
        const party = agent.partyId && partiesMap[agent.partyId];
        const partyName = party?.name;
        const partyColor = party?.color;

        return (
          <GameAgentVisual
            agent={agent}
            partyName={partyName} // COORD-005
            partyColor={partyColor} // COORD-005
            // ... other props
          />
        );
      })}
    </>
  );
}
```

---

## Features Implemented

### 1. Unified Party Health Display
- **Aggregated Health:** Shows combined health of all party members
- **Health Percentage:** Color-coded health bar (green/yellow/red)
- **Member Count:** Shows selected vs total party members

### 2. State Distribution
- **State Badges:** Displays count of agents in each state (IDLE, MOVING, WORKING, ERROR, etc.)
- **Real-time Updates:** Automatically syncs when agent states change

### 3. Party Information in Tooltips
- **Party Name:** Shows which party an agent belongs to
- **Party Color:** Color indicator matching party banner
- **Hover Display:** Visible on hover over any party member

### 4. Visual Party Indicator
- **3D Banner:** Colored banner appears above party members in the game world
- **Party Icon:** White circle icon on banner
- **Positioning:** Positioned above agent at y=1.8 units
- **Emissive Glow:** Subtle glow effect for visibility

---

## Testing Requirements

### Manual Testing Checklist

#### Party Status Sync (AgentPanel)
- [ ] Select multiple agents from the same party
- [ ] Verify party name and color appear in AgentPanel
- [ ] Verify party health bar shows correct aggregated health
- [ ] Verify health bar color changes based on percentage (green > 50%, yellow > 30%, red < 30%)
- [ ] Verify state distribution badges show correct counts
- [ ] Verify member count shows X/Y format (selected/total)

#### Agent Tooltips
- [ ] Hover over a party member
- [ ] Verify tooltip shows party name with color indicator
- [ ] Verify party info appears between header and state sections

#### 3D Party Indicators
- [ ] Create a party with multiple agents
- [ ] Verify colored banner appears above each party member
- [ ] Verify banner color matches party color in PartyPanel
- [ ] Verify white circle icon is visible on banner
- [ ] Verify banner is visible from different camera angles

#### Multi-Party Selection
- [ ] Select agents from different parties
- [ ] Verify party status section does NOT appear (different parties)
- [ ] Select agents from same party
- [ ] Verify party status appears (same party)

#### Real-time Updates
- [ ] Select party members
- [ ] Deal damage to one party member
- [ ] Verify party health bar updates immediately
- [ ] Change agent state (e.g., MOVING to WORKING)
- [ ] Verify state distribution updates immediately

---

## Integration Points

### Existing Party System
- **Party Store:** Uses existing `partiesMap` from `gameStore.ts`
- **Party Creation:** Integrates with `createParty()` function
- **Party Management:** Works with `PartyPanel.tsx` for party formation

### Agent Selection System
- **Selection Detection:** Checks if selected agents share same `partyId`
- **Multi-Selection:** Works with drag-select and shift+click
- **Selection Store:** Uses `selectedAgentIds` from `gameStore`

### Tooltip System
- **3D Tooltips:** Integrates with existing `Object3DTooltip` component
- **Performance:** Uses LOD system to limit tooltips on nearby agents
- **Positioning:** Projects 3D position to 2D screen coordinates

---

## Technical Notes

### Performance Considerations
- **Memoization:** Party info calculated with `useMemo` to prevent unnecessary recalculations
- **Shallow Comparison:** Uses `usePartiesShallow()` for efficient re-rendering
- **Conditional Rendering:** Party indicator only renders when `partyColor` is defined

### State Management
- **Zustand Store:** All party data managed through `gameStore.ts`
- **Reactive Updates:** Party info updates automatically when store changes
- **No Prop Drilling:** Uses store selectors for direct data access

### Visual Design
- **Color Scheme:** Party colors match existing party system colors
- **Health Gradient:** Three-tier color coding (green/yellow/red)
- **Badge Style:** Consistent with existing UI badge components

---

## Future Enhancements

### Potential Improvements
1. **Party Leader Indicator:** Crown or special icon for party leader
2. **Party Effects:** Shared particle effects when party achieves goals
3. **Party Commands:** Context menu options for entire party (regroup, follow, etc.)
4. **Party Chat:** Speech bubbles for party-wide communication
5. **Party Inventory:** Shared resource pool display (COORD-002)

---

## Related Issues

### Fixed
- **COORD-003:** Formation movement (works with party system)
- **AG-007:** Party system foundation (already implemented)

### Related
- **COORD-001:** Connection lines between cooperating agents
- **COORD-002:** Shared resource indicators (future work)
- **COORD-004:** Speech bubbles for communication (partial)

---

## Files Modified

1. [`apps/agents-of-empire/src/ui/HUD.tsx`](apps/agents-of-empire/src/ui/HUD.tsx) - Party status in AgentPanel
2. [`apps/agents-of-empire/src/ui/Object3DTooltip.tsx`](apps/agents-of-empire/src/ui/Object3DTooltip.tsx) - Party info in tooltips
3. [`apps/agents-of-empire/src/entities/GameAgent.tsx`](apps/agents-of-empire/src/entities/GameAgent.tsx) - Party indicator rendering

---

## Conclusion

COORD-005 (Team health/status sync) is now fully implemented with:
- ✅ Unified party health display in AgentPanel
- ✅ Party state distribution tracking
- ✅ Party information in agent tooltips
- ✅ Visual party indicators in 3D view
- ✅ Real-time synchronization with party state changes

The feature integrates seamlessly with the existing party system and provides comprehensive visibility into party status when managing multiple agents.

**Status:** ✅ COMPLETED - Requires QA verification
