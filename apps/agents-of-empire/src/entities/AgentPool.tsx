import { useState, useCallback, useEffect, useRef } from "react";
import { useGameStore, type GameAgent } from "../store/gameStore";
import { useAgentBridgeContext } from "../bridge/AgentBridge";

// ============================================================================
// Agent Pool Manager
// ============================================================================

interface AgentPoolOptions {
  maxAgents?: number;
  spawnRadius?: number;
  spawnPattern?: "random" | "grid" | "circle";
}

const MAX_AGENTS = 500; // Must match gameStore constant

const DEFAULT_AGENTS = [
  { name: "Sir Query", role: "Researcher", color: "#3498db" },
  { name: "Lady Parser", role: "Analyst", color: "#9b59b6" },
  { name: "Knight Coder", role: "Developer", color: "#2ecc71" },
  { name: "Scribe Writer", role: "Writer", color: "#f39c12" },
  { name: "Wizard Debug", role: "Debugger", color: "#e74c3c" },
];

export function useAgentPool(options: AgentPoolOptions = {}) {
  const { spawnRadius = 20 } = options;

  const spawnAgent = useCallback(
    (name?: string, position?: [number, number, number], agentRef?: any, parentId?: string) => {
      const agentName = name || DEFAULT_AGENTS[Math.floor(Math.random() * DEFAULT_AGENTS.length)].name;
      let spawnPos: [number, number, number];

      if (position) {
        spawnPos = position;
      } else {
        spawnPos = [
          25 + (Math.random() - 0.5) * spawnRadius * 2,
          0,
          25 + (Math.random() - 0.5) * spawnRadius * 2,
        ];
      }

      return useGameStore.getState().spawnAgent(agentName, spawnPos, agentRef, parentId);
    },
    [spawnRadius]
  );

  const spawnAgentBatch = useCallback(
    (count: number, basePosition?: [number, number, number], pattern?: "random" | "grid" | "circle") => {
      const agents: GameAgent[] = [];
      const base = basePosition || [25, 0, 25];
      const spawnPattern = pattern || "random";

      if (spawnPattern === "grid") {
        // Grid pattern for organized deployment
        const gridSize = Math.ceil(Math.sqrt(count));
        const spacing = 2;
        const offset = (gridSize * spacing) / 2;

        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          const pos: [number, number, number] = [
            base[0] + col * spacing - offset,
            base[1],
            base[2] + row * spacing - offset,
          ];
          agents.push(spawnAgent(undefined, pos));
        }
      } else if (spawnPattern === "circle") {
        // Circle pattern for defensive formation
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const radius = spawnRadius;
          const pos: [number, number, number] = [
            base[0] + Math.cos(angle) * radius,
            base[1],
            base[2] + Math.sin(angle) * radius,
          ];
          agents.push(spawnAgent(undefined, pos));
        }
      } else {
        // Random pattern (default)
        for (let i = 0; i < count; i++) {
          const pos: [number, number, number] = [
            base[0] + (Math.random() - 0.5) * spawnRadius * 2,
            base[1],
            base[2] + (Math.random() - 0.5) * spawnRadius * 2,
          ];
          agents.push(spawnAgent(undefined, pos));
        }
      }

      return agents;
    },
    [spawnRadius, spawnAgent]
  );

  const despawnAgent = useCallback((id: string) => {
    useGameStore.getState().removeAgent(id);
  }, []);

  const despawnAllAgents = useCallback(() => {
    const { agents } = useGameStore.getState();
    for (const [id] of Object.entries(agents)) {
      despawnAgent(id);
    }
  }, [despawnAgent]);

  return {
    spawnAgent,
    spawnAgentBatch,
    despawnAgent,
    despawnAllAgents,
  };
}

// ============================================================================
// Initial Agent Spawn Component
// ============================================================================

interface InitialAgentsProps {
  count?: number;
}

export function InitialAgents({ count = 100 }: InitialAgentsProps) {
  const hasInitialized = useRef(false);
  const { bridge, registerAgent } = useAgentBridgeContext();
  const { spawnAgent } = useAgentPool();

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const store = useGameStore.getState();

    // Check if we've reached the max agents limit
    if (store.agentCount >= MAX_AGENTS) {
      console.warn(`Initial agents not spawned: Maximum agent limit (${MAX_AGENTS}) already reached`);
      return;
    }

    // Adjust count if we're near the limit
    const actualCount = Math.min(count, MAX_AGENTS - store.agentCount);
    if (actualCount < count) {
      console.warn(`Reducing initial agent spawn from ${count} to ${actualCount} to respect max limit of ${MAX_AGENTS}`);
    }

    const agentIds: string[] = [];

    // Add default tools to agents
    const defaultTools = [
      { id: "search", name: "Search", type: "search" as const, icon: "🔍", description: "Search web", rarity: "common" as const },
      { id: "read", name: "File Reader", type: "file_reader" as const, icon: "📜", description: "Read files", rarity: "common" as const },
      { id: "code", name: "Code Executor", type: "code_executor" as const, icon: "🔨", description: "Execute code", rarity: "common" as const },
    ];

    // Spawn initial agents with Deep Agent instances - using batch spawning for performance
    const spawnInitialAgents = async () => {
      const BATCH_SIZE = 10; // Spawn agents in batches of 10
      const BATCH_DELAY = 50; // 50ms delay between batches (down from 100ms per agent)

      for (let batchStart = 0; batchStart < actualCount; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, actualCount);

        // Spawn a batch of agents in parallel
        const batchPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
          // Calculate grid position for better distribution
          const gridSize = Math.ceil(Math.sqrt(actualCount));
          const spacing = 2;
          const offset = (gridSize * spacing) / 2;
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          const position: [number, number, number] = [
            25 + col * spacing - offset,
            0,
            25 + row * spacing - offset,
          ];

          const promise = (async (index: number, pos: [number, number, number]) => {
            try {
              // Use spawnDeepAgent to create agents with Deep Agent instances
              const agentId = await bridge.spawnDeepAgent({
                name: DEFAULT_AGENTS[index % DEFAULT_AGENTS.length].name,
              });
              agentIds.push(agentId);

              // Update agent position and add tools
              store.updateAgent(agentId, {
                position: pos,
                inventory: [...defaultTools],
                equippedTool: defaultTools[Math.floor(Math.random() * defaultTools.length)],
              });

              // Get the agent to access its Deep Agent reference
              const agent = store.agents[agentId];
              if (agent && agent.agentRef) {
                // Register agent for streaming
                await registerAgent(agentId, agent.agentRef);
              }
            } catch (error) {
              // Log error but continue spawning other agents
              const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
              console.error(`Failed to spawn agent ${index}: ${errorMessage}`);

              // Clean up any partial state if agent was partially created
              // The spawnDeepAgent might have created a store entry before failing
              // We'll let the next iteration continue and the cleanup happens naturally
              // since failed agents won't be in the agentIds array
            }
          })(i, position);

          batchPromises.push(promise);
        }

        // Wait for all agents in this batch to spawn
        await Promise.all(batchPromises);

        // Add delay between batches to prevent blocking
        if (batchEnd < actualCount) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      // Spawn some subagents to test parent-child connection lines
      // Create 5 parent agents with subagents
      if (agentIds.length >= 10) {
        const parentAgentIds = agentIds.slice(0, 5);
        parentAgentIds.forEach((parentId) => {
          const parent = store.agents[parentId];
          if (!parent) return;

          // Spawn 2 subagents per parent
          for (let i = 0; i < 2; i++) {
            try {
              const subagent = spawnAgent(
                `${parent.name}-Sub-${i + 1}`,
                [
                  parent.position[0] + (Math.random() - 0.5) * 3,
                  0,
                  parent.position[2] + (Math.random() - 0.5) * 3,
                ],
                null,
                parentId // This sets up parent-child relationship
              );
              if (subagent) {
                store.updateAgent(subagent.id, {
                  inventory: [...defaultTools],
                  equippedTool: defaultTools[Math.floor(Math.random() * defaultTools.length)],
                });
              }
            } catch (error) {
              const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
              console.error(`Failed to spawn subagent for ${parentId}: ${errorMessage}`);
              // Continue with next subagent
            }
          }
        });
      }

      // Set some agents to WORKING state to test collaboration lines
      if (agentIds.length >= 20) {
        // Set agents 10-14 to WORKING state (they are near each other from grid pattern)
        for (let i = 10; i < 15; i++) {
          store.updateAgent(agentIds[i], {
            state: "WORKING",
            currentTask: "Collaborating on task...",
          });
        }
      }
    };

    spawnInitialAgents();
  }, [count, bridge, registerAgent, spawnAgent]);

  return null;
}

// ============================================================================
// Agent Spawner Panel Component
// ============================================================================

interface AgentSpawnerProps {
  onSpawn?: (agent: GameAgent) => void;
}

export function AgentSpawner({ onSpawn }: AgentSpawnerProps) {
  const { spawnAgent } = useAgentPool();
  const [selectedType, setSelectedType] = useState(0);

  const handleSpawn = () => {
    const agent = spawnAgent(DEFAULT_AGENTS[selectedType].name);
    onSpawn?.(agent);
  };

  return (
    <div className="absolute top-4 left-4 bg-gray-900/90 border border-empire-gold rounded-lg p-4 text-white">
      <h3 className="text-empire-gold text-lg mb-3">Recruit Agents</h3>

      <div className="space-y-2 mb-4">
        {DEFAULT_AGENTS.map((agent, index) => (
          <button
            key={agent.name}
            onClick={() => setSelectedType(index)}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${
              selectedType === index
                ? "bg-empire-gold text-gray-900"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <div className="font-semibold">{agent.name}</div>
            <div className="text-sm opacity-75">{agent.role}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleSpawn}
        className="w-full bg-empire-green hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
      >
        Spawn Agent
      </button>
    </div>
  );
}
