# Issue QA Plan

## Commits to Issues Mapping

### Completed Implementations

| Commit | Issues Addressed | Description |
|--------|------------------|-------------|
| 6275dff | AG-001 | Instanced agent rendering for 100+ agents |
| d776aa5 | AG-002 | Drag-select multiple agents |
| 332feb1 | MAP-001 | Isometric 3D camera view |
| 46cde88 | MAP-002, GOAL-002, DA-003 | Zoom scroll wheel, agent goal assignment, agent state visualization |
| 17aaf17 | UI-001 | RTS-style HUD layout |
| c9d1b33, e9681c8 | UI-003, INV-001, GOAL-001, COMB-001 | Panel animations, tool inventory, goal structures, dragons spawn on errors |
| 66ec477 | COORD-001 | Connection lines between cooperating agents |

### Issues to QA

#### AG-001: Instanced agent rendering for 100+ agents
- **Commit**: 6275dff
- **Acceptance Criteria**:
  - 100+ agents visible simultaneously
  - Target 60 FPS with instanced rendering
  - Each agent rendered as distinct 3D character
  - Agents properly positioned on terrain (grid pattern)

#### AG-002: Drag-select multiple agents
- **Commit**: d776aa5
- **Acceptance Criteria**:
  - Selection box appears when dragging on empty space
  - Units within box are selected on mouse release
  - Supports selecting 50+ agents at once
  - Visual feedback for selected agents (gold selection rings)

#### MAP-001: Isometric 3D camera view
- **Commit**: 332feb1
- **Acceptance Criteria**:
  - Default angle 45 degrees
  - Fully rotational camera with Q/E keys and right-click drag
  - Smooth camera transitions with damping interpolation
  - Professional RTS feel with complete control scheme

#### MAP-002: Zoom scroll wheel
- **Commit**: 46cde88
- **Acceptance Criteria**:
  - Scroll wheel zoom in/out functionality

#### UI-001: RTS-style HUD layout
- **Commit**: 17aaf17
- **Acceptance Criteria**:
  - Minimap in top-right corner (220x220px)
  - Agent panel in bottom-left corner
  - Goals/Objectives panel in top-left corner
  - Top center resource display bar
  - Terrain pattern on minimap
  - Structure size differentiation on minimap
  - Compass indicator ("N")
  - Classic RTS "MINIMAP" label
  - Enhanced health bar with 3-stage color coding
  - "Units Selected" terminology
  - "Objectives" terminology for quests
  - "Deselect" button
  - Smooth Framer Motion animations

#### UI-003: Smooth panel animations
- **Commits**: c9d1b33, e9681c8
- **Acceptance Criteria**:
  - Smooth panel animations with Framer Motion

#### INV-001: Tool inventory with RPG-style icons and rarity
- **Commits**: c9d1b33, e9681c8
- **Acceptance Criteria**:
  - Represent tools as equipment items with icons and rarity

#### GOAL-001: Goal structures appear as physical 3D buildings
- **Commits**: c9d1b33, e9681c8
- **Acceptance Criteria**:
  - Goals appear as physical 3D buildings

#### GOAL-002: Agent-to-goal assignment via right-click
- **Commit**: 46cde88
- **Acceptance Criteria**:
  - Implement agent-to-goal assignment via right-click

#### COORD-001: Connection lines between cooperating agents
- **Commit**: 66ec477
- **Acceptance Criteria**:
  - Glowing lines show active collaboration
  - Lines follow agents as they move
  - Color-coded by relationship (Parent-Child in cyan, Collaboration in green, Moving-together in yellow)
  - Fade when collaboration ends
  - Connection legend UI component showing all connection types

#### COMB-001: Dragons spawn on errors
- **Commits**: c9d1b33, e9681c8
- **Acceptance Criteria**:
  - Dragons spawn on errors

#### DA-003: Enhanced agent state visualization
- **Commit**: 46cde88
- **Acceptance Criteria**:
  - Enhanced agent state visualization

## Next Steps

1. QA each implementation against its acceptance criteria
2. Update issue status based on QA results:
   - Close issues that pass QA
   - Add comments for issues that need fixes
   - Reopen issues that have regressions
