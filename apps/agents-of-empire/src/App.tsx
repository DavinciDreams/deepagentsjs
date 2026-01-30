import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGame } from "./core/Game";
import { CameraController } from "./core/CameraController";
import { SelectionSystem } from "./core/SelectionSystem";
import { GroundPlane } from "./world/WorldManager";
import { type Structure } from "./store/gameStore";
import { useAgentPool } from "./entities/AgentPool";
import { AgentPool } from "./entities/GameAgent";
import { StructurePool } from "./entities/Structure";
import { ConnectionLegend } from "./entities/ConnectionLines";
import { HUD } from "./ui/HUD";
import { useGameStore } from "./store/gameStore";
import Landing from "./landing/Landing";
import { AgentBridgeProvider } from "./bridge/AgentBridge";

// ============================================================================
// Simple Grid Component (optimized for performance)
// ============================================================================

function SimpleGrid() {
  return (
    <gridHelper args={[20, 20, "#444444", "#222222"]} position={[10, 0, 10]} />
  );
}

// ============================================================================
// Game Initialization (runs outside Canvas)
// ============================================================================

interface GameInitializerProps {
  onReady: () => void;
}

function GameInitializer({ onReady }: GameInitializerProps) {
  useEffect(() => {
    const { initializeWorld, addStructure, addQuest, addQuestline } = useGameStore.getState();

    // Initialize terrain with smaller grid for performance
    initializeWorld(20, 20);

    // ============================================================================
    // Initialize Goal Structures - All 5 Types
    // ============================================================================

    // 1. BASE - Home base (fortified)
    addStructure({
      type: "base",
      position: [10, 0, 10],
      name: "Command Center",
      description: "Agent spawn point and base of operations",
    });

    // 2. CASTLE - Main goals (large, impressive)
    const knowledgeCastle = addStructure({
      type: "castle",
      position: [15, 0, 5],
      name: "Knowledge Castle",
      description: "The ultimate goal - complete all research here",
      goalId: "main-goal-knowledge",
    });

    // 3. TOWER - Sub-goals (tall, watchtower style)
    const scoutTower = addStructure({
      type: "tower",
      position: [5, 0, 5],
      name: "Scout Tower",
      description: "Sub-goal: Establish reconnaissance",
      goalId: "sub-goal-scouting",
    });

    const watchtower = addStructure({
      type: "tower",
      position: [15, 0, 15],
      name: "Watchtower",
      description: "Sub-goal: Defend the perimeter",
      goalId: "sub-goal-defense",
    });

    // 4. WORKSHOP - Tasks (building with work areas)
    const codeWorkshop = addStructure({
      type: "workshop",
      position: [5, 0, 15],
      name: "Code Workshop",
      description: "Task: Craft agent solutions",
    });

    const researchLab = addStructure({
      type: "workshop",
      position: [15, 0, 15],
      name: "Research Lab",
      description: "Task: Analyze data patterns",
    });

    // 5. CAMPFIRE - Gathering points (warm, inviting)
    addStructure({
      type: "campfire",
      position: [10, 0, 8],
      name: "Strategy Circle",
      description: "Gathering point for agent coordination",
    });

    addStructure({
      type: "campfire",
      position: [8, 0, 10],
      name: "Rest Camp",
      description: "Agent rest and recovery point",
    });

    // ============================================================================
    // Initialize Questline - "The Agent's Journey"
    // ============================================================================

    // Create quests for the questline
    const quest1 = addQuest({
      title: "Establish Reconnaissance",
      description: "Send agents to the Scout Tower to gather intel on the surrounding area.",
      status: "pending",
      targetStructureId: scoutTower.id,
      requiredAgents: 2,
      assignedAgentIds: [],
      rewards: ["+1 Agent Level", "Unlock: Workshop Access"],
    });

    const quest2 = addQuest({
      title: "Craft Agent Solutions",
      description: "Assign agents to the Code Workshop to develop new capabilities.",
      status: "pending",
      targetStructureId: codeWorkshop.id,
      requiredAgents: 3,
      assignedAgentIds: [],
      rewards: ["+2 Agent Levels", "Unlock: Research Lab"],
      prerequisiteQuestIds: [quest1.id],
    });

    const quest3 = addQuest({
      title: "Analyze Data Patterns",
      description: "Deploy agents to the Research Lab to uncover hidden patterns.",
      status: "pending",
      targetStructureId: researchLab.id,
      requiredAgents: 3,
      assignedAgentIds: [],
      rewards: ["+3 Agent Levels", "Unlock: Defense Protocols"],
      prerequisiteQuestIds: [quest2.id],
    });

    const quest4 = addQuest({
      title: "Defend the Perimeter",
      description: "Station agents at the Watchtower to protect against incoming threats.",
      status: "pending",
      targetStructureId: watchtower.id,
      requiredAgents: 4,
      assignedAgentIds: [],
      rewards: ["+4 Agent Levels", "Unlock: Castle Access"],
      prerequisiteQuestIds: [quest3.id],
    });

    const quest5 = addQuest({
      title: "Complete Research at Knowledge Castle",
      description: "The ultimate goal - lead your agents to complete all research at the Knowledge Castle.",
      status: "pending",
      targetStructureId: knowledgeCastle.id,
      requiredAgents: 5,
      assignedAgentIds: [],
      rewards: ["Victory!", "Empire Expanded"],
      prerequisiteQuestIds: [quest4.id],
    });

    // Create the questline
    addQuestline({
      name: "The Agent's Journey",
      description: "A comprehensive campaign to establish your agent empire and achieve ultimate knowledge.",
      status: "not_started",
      questIds: [quest1.id, quest2.id, quest3.id, quest4.id, quest5.id],
      currentQuestIndex: 0,
      requiredCompletedQuests: 5,
    });

    // Update quests with questline reference
    useGameStore.getState().updateQuest(quest1.id, { questlineId: "the-agents-journey", position: 0 });
    useGameStore.getState().updateQuest(quest2.id, { questlineId: "the-agents-journey", position: 1 });
    useGameStore.getState().updateQuest(quest3.id, { questlineId: "the-agents-journey", position: 2 });
    useGameStore.getState().updateQuest(quest4.id, { questlineId: "the-agents-journey", position: 3 });
    useGameStore.getState().updateQuest(quest5.id, { questlineId: "the-agents-journey", position: 4 });

    onReady();
  }, [onReady]);

  return null;
}

// ============================================================================
// Lighting Component
// ============================================================================

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[30, 50, 30]}
        intensity={0.8}
        castShadow={false} // Disable shadows for performance
      />
      <directionalLight position={[-20, 30, -20]} intensity={0.3} />
    </>
  );
}

// ============================================================================
// WebGL Context Loss Handler
// ============================================================================

function ContextLossHandler() {
  const gl = useThree((state) => state.gl);
  const [, forceUpdate] = useState(0);
  const contextLostRef = useRef(false);

  useEffect(() => {
    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      contextLostRef.current = true;
      // console.error("[WebGL] Context lost - attempting recovery...");

      // Force stop the render loop to prevent further crashes
      try {
        gl.setAnimationLoop(null);
      } catch (e) {
        console.warn("[WebGL] Could not stop animation loop:", e);
      }
    };

    const handleContextRestored = () => {
      console.log("[WebGL] Context restored - forcing re-render");
      contextLostRef.current = false;

      // Force re-render of all components
      forceUpdate((prev) => prev + 1);

      // Restart any necessary systems
      setTimeout(() => {
        console.log("[WebGL] Recovery complete");
      }, 100);
    };

    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", handleContextLoss);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [gl]);

  return null;
}

// ============================================================================
// Simple Agent Renderer - Minimal rendering to avoid WebGL context loss
// ============================================================================

interface SimpleAgentRendererProps {
  agents: Record<string, any>;
  selectedAgentIds: Set<string>;
  onAgentClick?: (agentId: string) => void;
}

function SimpleAgentRenderer({ agents, selectedAgentIds, onAgentClick }: SimpleAgentRendererProps) {
  return (
    <>
      {Object.values(agents).map((agent) => (
        <mesh
          key={agent.id}
          position={agent.position}
          onClick={() => onAgentClick?.(agent.id)}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial
            color={selectedAgentIds.has(agent.id) ? "#f4d03f" : "#3498db"}
          />
        </mesh>
      ))}
    </>
  );
}

// ============================================================================
// Test Agents Component - Simple agent spawning without Deep Agent integration
// ============================================================================

interface TestAgentsProps {
  count?: number;
}

function TestAgents({ count = 5 }: TestAgentsProps) {
  const hasInitialized = useRef(false);
  const spawnAgent = useGameStore((state) => state.spawnAgent);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[TestAgents] Spawning', count, 'test agents...');

    const defaultTools = [
      { id: "search", name: "Search", type: "search" as const, icon: "🔍", description: "Search web", rarity: "common" as const },
      { id: "read", name: "File Reader", type: "file_reader" as const, icon: "📜", description: "Read files", rarity: "common" as const },
      { id: "code", name: "Code Executor", type: "code_executor" as const, icon: "🔨", description: "Execute code", rarity: "common" as const },
    ];

    const agentNames = ["Sir Query", "Lady Parser", "Knight Coder", "Scribe Writer", "Wizard Debug"];

    // Spawn test agents in a circle around the center
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 3;
      const position: [number, number, number] = [
        10 + Math.cos(angle) * radius,
        0,
        10 + Math.sin(angle) * radius,
      ];

      const agent = spawnAgent(agentNames[i % agentNames.length], position);
      if (agent) {
        console.log('[TestAgents] Spawned agent:', agent.name, 'at', position, 'id:', agent.id);
        useGameStore.getState().updateAgent(agent.id, {
          inventory: [...defaultTools],
          equippedTool: defaultTools[Math.floor(Math.random() * defaultTools.length)],
        });
      }
    }

    console.log('[TestAgents] Total agents in store:', Object.keys(useGameStore.getState().agents).length);
  }, [count, spawnAgent]);

  return null;
}

// ============================================================================
// Game Loop Component (runs inside Canvas)
// ============================================================================

function GameLoop() {
  useGame(); // This must be inside Canvas
  return null;
}

// ============================================================================
// Game Scene Component (runs inside Canvas)
// ============================================================================

function GameScene() {
  const agents = useGameStore((state) => state.agents);
  const selectedAgentIds = useGameStore((state) => state.selectedAgentIds);

  useAgentPool();

  // Move agents to a target position in formation
  const moveAgentsToPosition = useCallback(
    (targetPosition: [number, number, number], agentIds: string[]) => {
      if (agentIds.length === 0) return;

      const targets: [number, number, number][] = [];
      const count = agentIds.length;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = Math.max(1, Math.sqrt(count) * 0.5);
        targets.push([
          targetPosition[0] + Math.cos(angle) * radius,
          targetPosition[1],
          targetPosition[2] + Math.sin(angle) * radius,
        ]);
      }

      let i = 0;
      for (const agentId of agentIds) {
        useGameStore.getState().updateAgent(agentId, {
          targetPosition: targets[i],
          state: "MOVING",
          currentTask: `Moving to ${targetPosition[0]}, ${targetPosition[2]}...`,
        });
        i++;
      }
    },
    []
  );

  // Handle ground click for movement
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

  // Handle structure click (select structure or show info)
  const handleStructureClick = useCallback(
    (_structureId: string, structure: Structure) => {
      console.log("Structure clicked:", structure.name);
      // Could show structure info panel here
    },
    []
  );

  // Handle structure right-click - assign selected agents to goal
  const handleStructureRightClick = useCallback(
    (_structureId: string, structure: Structure) => {
      const selectedAgents = Array.from(useGameStore.getState().selectedAgentIds);

      if (selectedAgents.length === 0) {
        console.log("No agents selected to assign to", structure.name);
        return;
      }

      console.log(`Assigning ${selectedAgents.length} agents to ${structure.name}`);

      // Move agents to the structure's position
      moveAgentsToPosition(structure.position, selectedAgents);

      // If the structure has a goalId, assign the quest to the agents
      if (structure.goalId) {
        useGameStore.getState().assignQuestToAgents(structure.goalId, selectedAgents);
        console.log(`Assigned quest ${structure.goalId} to ${selectedAgents.length} agents`);
      }

      // Update agent tasks to reflect assignment to this goal
      for (const agentId of selectedAgents) {
        useGameStore.getState().updateAgent(agentId, {
          currentTask: `Assigned to ${structure.name}`,
        });
      }
    },
    [moveAgentsToPosition]
  );

  // Handle structure hover
  const handleStructureHovered = useCallback(
    (_structureId: string | null) => {
      // Could show tooltip or status here
    },
    []
  );

  return (
    <>
      <Lighting />
      {/* Temporarily disable expensive components */}
      {/* <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} /> */}
      {/* <Environment preset="sunset" /> */}

      {/* <Terrain /> */}
      <SimpleGrid /> {/* Optimized grid replacement */}
      <GroundPlane />

      {/* Simple test agent spawner - creates agents without Deep Agent integration */}
      <TestAgents count={5} />
      {/* Simplified agent renderer to avoid WebGL context loss */}
      <SimpleAgentRenderer
        agents={agents}
        selectedAgentIds={selectedAgentIds}
        onAgentClick={(agentId) => console.log("Agent clicked:", agentId)}
      />
      {/* TEMPORARILY DISABLED: Agent rendering too complex, causing WebGL context loss */}
      {/* <AgentPool onAgentClick={(agentId) => console.log("Agent clicked:", agentId)} /> */}

      {/* <ConnectionLines enabled={true} maxConnections={100} /> */}

      {/* <DragonPool /> */}
      <StructurePool
        onStructureClick={handleStructureClick}
        onStructureRightClick={handleStructureRightClick}
      /> {/* Re-enabling structures to test */}

      <SelectionSystem
        onAgentsSelected={(ids) => console.log("Selected:", ids)}
        onGroundClicked={handleGroundClick}
        onStructureClicked={handleStructureClick}
        onStructureRightClicked={handleStructureRightClick}
        onStructureHovered={handleStructureHovered}
      />
    </>
  );
}

// ============================================================================
// Selection Box Overlay
// ============================================================================

function SelectionBoxOverlay() {
  const selectionBox = useGameStore((state) => state.selectionBox);

  if (!selectionBox || !selectionBox.active) return null;

  const x = Math.min(selectionBox.startX, selectionBox.endX);
  const y = Math.min(selectionBox.startY, selectionBox.endY);
  const width = Math.abs(selectionBox.endX - selectionBox.startX);
  const height = Math.abs(selectionBox.endY - selectionBox.startY);

  // Don't render if box is too small (less than 5 pixels)
  if (width < 5 && height < 5) return null;

  return (
    <div
      className="selection-box"
      style={{
        left: x,
        top: y,
        width,
        height,
        pointerEvents: "none",
      }}
    />
  );
}

// ============================================================================
// Loading Screen
// ============================================================================

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-empire-dark to-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-6 animate-bounce">⚔️</div>
        <h1 className="text-5xl font-bold text-empire-gold mb-4">Agents of Empire</h1>
        <p className="text-xl text-gray-400">Loading the battlefield...</p>
        <div className="mt-8 w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-empire-gold animate-pulse" style={{ width: "66%" }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // Show landing page initially
  if (showLanding) {
    return (
      <Landing
        onEnterGame={() => {
          setShowLanding(false);
        }}
      />
    );
  }

  return (
    <AgentBridgeProvider>
      <div className="w-screen h-screen overflow-hidden bg-gray-900">
        <Suspense fallback={<LoadingScreen />}>
          {/* Initialize game state before Canvas - only show when not ready */}
          {!isReady ? (
            <>
              <GameInitializer onReady={() => setIsReady(true)} />
              <LoadingScreen />
            </>
          ) : (
            <>
              <Canvas
                shadows={false} // Temporarily disable shadows for performance
                camera={{ position: [10, 30, 10], fov: 50 }} // Center camera on world
                gl={{
                  antialias: false, // Disable antialiasing to reduce GPU load
                  alpha: false,
                  powerPreference: "high-performance",
                  failIfMajorPerformanceCaveat: false,
                  preserveDrawingBuffer: false, // Disable to reduce memory
                  stencil: false,
                  depth: true,
                }}
                dpr={1} // Force DPR to 1 for best performance
                frameloop="always" // Need always for smooth camera movement
              >
                <GameScene />
                <CameraController />
                <GameLoop /> {/* Game loop runs inside Canvas */}
                <ContextLossHandler />
              </Canvas>

              <HUD />
              <SelectionBoxOverlay />
              <ConnectionLegend position="top-right" />
            </>
          )}
        </Suspense>
      </div>
    </AgentBridgeProvider>
  );
}

// ============================================================================
// Title Screen Component (for future use)
// ============================================================================

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-empire-dark to-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-9xl mb-6">⚔️</div>
        <h1 className="text-6xl font-bold text-empire-gold mb-4">Agents of Empire</h1>
        <p className="text-xl text-gray-400 mb-8">Command Your AI Army</p>

        <div className="space-y-4">
          <button
            onClick={onStart}
            className="px-8 py-4 bg-empire-gold text-gray-900 text-xl font-bold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            Start Campaign
          </button>
          <div className="text-gray-500">
            <p>Drag-select agents • Right-click to command • Battle the TypeScript Dragons</p>
          </div>
        </div>

        <div className="mt-12 text-gray-600 text-sm">
          <p>A 3D RTS interface for LangGraph Deep Agents</p>
        </div>
      </div>
    </div>
  );
}
