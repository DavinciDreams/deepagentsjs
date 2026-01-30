import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shallow } from "zustand/shallow";
import { useGameStore, useSelectedAgentIds, useAgentsMap, useAgentsShallow, usePartiesShallow, useQuestsShallow, useSelection, useAgentCount, useDragonCount, useQuestCount, useCompletedQuestCount, type GameAgent, type Tool } from "../store/gameStore";
import { useAgentBridgeContext } from "../bridge/AgentBridge";
import { useCombat } from "../entities/Dragon";
import { ToolCard, ToolListItem, ToolIcon, RarityBadge, TOOL_TYPE_CONFIG, RARITY_CONFIG } from "./ToolCard";
import { PartyPanel } from "./PartyPanel";
import { ControlsTooltip } from "./ControlsTooltip";
import { Tooltip, SimpleTooltip, KeyComboTooltip } from "./Tooltip";

// ============================================================================
// Minimap Component
// Classic RTS Position: Top-Right Corner
// Reference: StarCraft II, Age of Empires II
// ============================================================================

interface MinimapProps {
  width?: number;
  height?: number;
}

export function Minimap({ width = 220, height = 220 }: MinimapProps) {
  const agentsMap = useAgentsShallow();
  const dragonsMap = useGameStore((state) => state.dragons, shallow);
  const structuresMap = useGameStore((state) => state.structures, shallow);
  const selectedAgentIds = useSelection();
  const worldSize = useGameStore((state) => state.worldSize);

  // Convert Records to arrays with useMemo to prevent infinite re-renders
  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);
  const dragons = useMemo(() => Object.values(dragonsMap), [dragonsMap]);
  const structures = useMemo(() => Object.values(structuresMap), [structuresMap]);

  const scale = width / worldSize.width;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute top-4 right-4 bg-gray-900/95 border-2 border-empire-gold rounded-lg overflow-hidden shadow-lg shadow-empire-gold/20"
      style={{ width, height }}
    >
      {/* Classic RTS minimap header */}
      <SimpleTooltip
        title="Minimap"
        description="Shows agent positions, structures, and dragons"
        icon="🗺️"
        position="left"
      >
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-empire-gold/20 to-transparent pointer-events-none cursor-help" />
      </SimpleTooltip>

      <svg width={width} height={height} className="w-full h-full">
        {/* Background - classic RTS dark terrain */}
        <rect width={width} height={height} fill="#1a1a2e" />
        <rect width={width} height={height} fill="url(#terrainPattern)" opacity={0.3} />

        {/* Terrain pattern definition */}
        <defs>
          <pattern id="terrainPattern" patternUnits="userSpaceOnUse" width={20} height={20}>
            <rect width={20} height={20} fill="#1a1a2e" />
            <circle cx={10} cy={10} r={0.5} fill="#2a2a3e" />
          </pattern>
        </defs>

        {/* Structures - marked with distinctive icons */}
        {structures.map((structure) => (
          <g key={structure.id}>
            <circle
              cx={structure.position[0] * scale}
              cy={structure.position[2] * scale}
              r={structure.type === "castle" ? 6 : structure.type === "workshop" ? 5 : 4}
              fill="#f39c12"
              opacity={0.7}
            />
            {/* Structure border for visibility */}
            <circle
              cx={structure.position[0] * scale}
              cy={structure.position[2] * scale}
              r={structure.type === "castle" ? 6 : structure.type === "workshop" ? 5 : 4}
              fill="none"
              stroke="#f4d03f"
              strokeWidth={1}
            />
          </g>
        ))}

        {/* Dragons - enemies marked in red */}
        {dragons.map((dragon) => (
          <g key={dragon.id}>
            <circle
              cx={dragon.position[0] * scale}
              cy={dragon.position[2] * scale}
              r={4}
              fill="#e74c3c"
            />
            {/* Pulsing effect for enemies */}
            <circle
              cx={dragon.position[0] * scale}
              cy={dragon.position[2] * scale}
              r={6}
              fill="none"
              stroke="#e74c3c"
              strokeWidth={1}
              opacity={0.5}
            />
          </g>
        ))}

        {/* Agents - friendly units in blue */}
        {agents.map((agent) => (
          <g key={agent.id}>
            <circle
              cx={agent.position[0] * scale}
              cy={agent.position[2] * scale}
              r={selectedAgentIds.has(agent.id) ? 5 : 3}
              fill={selectedAgentIds.has(agent.id) ? "#f4d03f" : "#3498db"}
            />
            {/* Selection ring for selected agents */}
            {selectedAgentIds.has(agent.id) && (
              <circle
                cx={agent.position[0] * scale}
                cy={agent.position[2] * scale}
                r={7}
                fill="none"
                stroke="#f4d03f"
                strokeWidth={2}
              />
            )}
          </g>
        ))}

        {/* Camera view indicator - classic RTS feature */}
        <rect
          x={0}
          y={0}
          width={width * 0.3}
          height={height * 0.3}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.4}
          rx={2}
        />
      </svg>

      {/* Minimap label - classic RTS style */}
      <div className="absolute bottom-1 right-2 text-xs text-empire-gold font-bold tracking-wider">
        MINIMAP
      </div>

      {/* Compass indicator */}
      <div className="absolute top-1 left-2 text-xs text-gray-500 font-bold">
        N
      </div>
    </motion.div>
  );
}

// ============================================================================
// Agent Panel Component
// Classic RTS Position: Bottom-Left Corner
// Reference: StarCraft II command card, Age of Empires unit info
// ============================================================================

interface AgentPanelProps {
  className?: string;
}

export function AgentPanel({ className = "" }: AgentPanelProps) {
  const selectedAgentIds = useSelectedAgentIds();
  const agentsMap = useAgentsMap();
  const partiesMap = usePartiesShallow();
  const updateAgent = useGameStore((state) => state.updateAgent);
  const clearSelection = useGameStore((state) => state.clearSelection);

  // Convert Set and Record to array with memoization
  const selectedAgents = useMemo(() => {
    const agents: GameAgent[] = [];
    for (const id of selectedAgentIds) {
      const agent = agentsMap[id];
      if (agent) agents.push(agent);
    }
    return agents;
  }, [selectedAgentIds, agentsMap]);

  // Check if all selected agents belong to the same party
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

  if (selectedAgents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`absolute bottom-4 left-4 bg-gray-900/95 border-2 border-empire-gold/50 rounded-lg p-4 text-white w-80 ${className}`}
      >
        <div className="text-center text-gray-400">
          <p className="text-lg font-semibold">No units selected</p>
          <p className="text-sm mt-1">Click on agents or drag to select multiple</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`absolute bottom-4 left-4 bg-gray-900/95 border-2 border-empire-gold rounded-lg p-4 text-white w-80 max-h-96 overflow-y-auto shadow-lg shadow-empire-gold/20 ${className}`}
    >
      {/* Party Status Sync - COORD-005 */}
      {partyInfo && (
        <div className="mb-3 p-3 bg-gradient-to-r from-empire-gold/20 to-empire-gold/10 border border-empire-gold/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: partyInfo.party.color }}
            />
            <span className="text-empire-gold font-bold">{partyInfo.party.name}</span>
            <span className="text-xs text-gray-400 ml-auto">
              {partyInfo.memberCount}/{partyInfo.totalMembers} selected
            </span>
          </div>

          {/* Party health bar - COORD-005 */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">Party Health</span>
              <span
                className={
                  partyInfo.healthPercent > 50
                    ? "text-green-400"
                    : partyInfo.healthPercent > 30
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {Math.round(partyInfo.totalHealth)}/{Math.round(partyInfo.totalMaxHealth)}
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${partyInfo.healthPercent}%` }}
                transition={{ duration: 0.5 }}
                className="h-full"
                style={{
                  backgroundColor:
                    partyInfo.healthPercent > 50
                      ? "#27ae60"
                      : partyInfo.healthPercent > 30
                      ? "#f39c12"
                      : "#e74c3c",
                }}
              />
            </div>
          </div>

          {/* Party state distribution - COORD-005 */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(partyInfo.stateDistribution).map(([state, count]) => (
              <span
                key={state}
                className="text-xs px-2 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-300"
              >
                {state}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {selectedAgents.map((agent) => (
          <div key={agent.id} className="bg-gray-800/80 rounded p-3 border border-empire-gold/30">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-empire-gold text-base">{agent.name}</div>
                <div className="text-xs text-gray-400">Level {agent.level} Agent</div>
              </div>
              <div className="text-xs px-2 py-1 rounded bg-gray-700 border border-gray-600">
                {agent.state}
              </div>
            </div>

            {/* Health bar - classic RTS style */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Health</span>
                <span className={agent.health > 30 ? "text-green-400" : "text-red-400"}>
                  {agent.health}/{agent.maxHealth}
                </span>
              </div>
              <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(agent.health / agent.maxHealth) * 100}%`,
                    backgroundColor: agent.health > 50 ? "#27ae60" : agent.health > 30 ? "#f39c12" : "#e74c3c",
                  }}
                />
              </div>
            </div>

            {/* Current task */}
            {agent.currentTask && (
              <div className="text-xs text-gray-300 mb-2 bg-gray-900/50 px-2 py-1 rounded">
                <span className="text-gray-500">Task:</span> {agent.currentTask}
              </div>
            )}

            {/* Equipped tool */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {agent.equippedTool ? (
                  <span className="text-empire-gold">
                    {agent.equippedTool.icon} {agent.equippedTool.name}
                  </span>
                ) : (
                  <span className="text-gray-500 italic">No tool equipped</span>
                )}
              </div>
              {agent.equippedTool && (
                <button
                  onClick={() => updateAgent(agent.id, { equippedTool: null })}
                  className="text-xs text-gray-400 hover:text-white hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                >
                  Unequip
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Inventory Panel Component - Enhanced RPG-Style
// ============================================================================

interface InventoryPanelProps {
  agentId: string;
  onClose?: () => void;
  viewMode?: "grid" | "list";
}

export function InventoryPanel({ agentId, onClose, viewMode = "list" }: InventoryPanelProps) {
  const agent = useGameStore((state) => state.agents[agentId]);
  const equipTool = useGameStore((state) => state.equipTool);
  const unequipTool = useGameStore((state) => state.unequipTool);
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<string | null>(null);

  if (!agent) return null;

  // Filter inventory by rarity if filter is active
  const filteredInventory = useMemo(() => {
    if (!selectedRarityFilter) return agent.inventory;
    return agent.inventory.filter((tool) => tool.rarity === selectedRarityFilter);
  }, [agent.inventory, selectedRarityFilter]);

  // Count tools by rarity
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    agent.inventory.forEach((tool) => {
      counts[tool.rarity] = (counts[tool.rarity] || 0) + 1;
    });
    return counts;
  }, [agent.inventory]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-900/98 border-2 border-empire-gold rounded-lg p-4 text-white w-80 shadow-2xl shadow-empire-gold/30 max-h-[80vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-empire-gold/30">
        <SimpleTooltip
          title="Inventory"
          description={`Manage ${agent.name}'s equipment and tools`}
          icon="🎒"
          position="left"
        >
          <div className="cursor-help">
            <h3 className="text-empire-gold text-lg font-bold">Inventory</h3>
            <p className="text-xs text-gray-400">{agent.name}&apos;s Equipment</p>
          </div>
        </SimpleTooltip>
        <div className="flex items-center gap-2">
          {onClose && (
            <KeyComboTooltip
              title="Close Inventory"
              description="Close the inventory panel"
              keys={["Esc"]}
            >
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-700 w-6 h-6 rounded transition-colors"
              >
                ✕
              </button>
            </KeyComboTooltip>
          )}
        </div>
      </div>

      {/* Currently Equipped Tool */}
      <div className="mb-4 p-3 rounded-lg bg-gray-800/80 border border-empire-gold/30">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Equipped</p>
        {agent.equippedTool ? (
          <div className="flex items-center gap-3">
            <ToolIcon toolType={agent.equippedTool.type} rarity={agent.equippedTool.rarity} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-empire-gold truncate">{agent.equippedTool.name}</p>
              <RarityBadge rarity={agent.equippedTool.rarity} />
            </div>
            <button
              onClick={() => unequipTool(agentId)}
              className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors"
            >
              Unequip
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic text-center py-2">No tool equipped</p>
        )}
      </div>

      {/* Rarity Filter Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedRarityFilter(null)}
          className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
            selectedRarityFilter === null
              ? "bg-empire-gold text-gray-900 font-bold"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          All ({agent.inventory.length})
        </button>
        {(["common", "rare", "epic", "legendary"] as const).map((rarity) => (
          <button
            key={rarity}
            onClick={() => setSelectedRarityFilter(rarity)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              selectedRarityFilter === rarity
                ? "font-bold"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            style={{
              backgroundColor: selectedRarityFilter === rarity ? RARITY_CONFIG[rarity].color : undefined,
              color: selectedRarityFilter === rarity ? "#1a1a2e" : undefined,
            }}
          >
            {RARITY_CONFIG[rarity].label} ({rarityCounts[rarity]})
          </button>
        ))}
      </div>

      {/* Inventory Grid/List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm italic">
              {selectedRarityFilter ? `No ${selectedRarityFilter} tools` : "No tools available"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredInventory.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isEquipped={agent.equippedTool?.id === tool.id}
                onEquip={() => equipTool(agentId, tool)}
                onUnequip={() => unequipTool(agentId)}
                showDetails={false}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredInventory.map((tool) => (
              <ToolListItem
                key={tool.id}
                tool={tool}
                isEquipped={agent.equippedTool?.id === tool.id}
                onEquip={() => equipTool(agentId, tool)}
                onUnequip={() => unequipTool(agentId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tool Types Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 mb-2">Tool Types</p>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {Object.entries(TOOL_TYPE_CONFIG).map(([type, config]) => (
            <div key={type} className="flex items-center gap-1 text-gray-400">
              <span>{config.icon}</span>
              <span className="truncate">{config.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Quest Tracker Component
// Classic RTS Position: Top-Left Corner
// Reference: Age of Empires objectives panel, StarCraft II objectives
// ============================================================================

interface QuestTrackerProps {
  className?: string;
}

export function QuestTracker({ className = "" }: QuestTrackerProps) {
  const questsMap = useQuestsShallow();
  const questlinesMap = useGameStore((state) => state.questlines, shallow);
  const assignQuestToAgents = useGameStore((state) => state.assignQuestToAgents);
  const startQuestline = useGameStore((state) => state.startQuestline);
  const selectedAgentIds = useSelection();

  // Convert Records to arrays with useMemo to prevent infinite re-renders
  const quests = useMemo(() => Object.values(questsMap), [questsMap]);
  const questlines = useMemo(() => Object.values(questlinesMap), [questlinesMap]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`absolute top-4 left-4 bg-gray-900/95 border-2 border-empire-gold rounded-lg p-4 text-white w-96 shadow-lg shadow-empire-gold/20 max-h-[70vh] overflow-hidden flex flex-col ${className}`}
    >
      {/* Classic RTS objectives header */}
      <SimpleTooltip
        title="Quest Tracker"
        description="Track active questlines and objectives"
        icon="📜"
        position="right"
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-empire-gold/30 cursor-help">
          <span className="text-empire-gold text-xl">📜</span>
          <h3 className="text-empire-gold text-lg font-bold">Questlines</h3>
        </div>
      </SimpleTooltip>

      {/* Debug controls hint */}
      <div className="mb-3 p-2 bg-gray-800/60 rounded border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">DEBUG CONTROLS</div>
        <div className="text-xs text-gray-400 space-y-0.5">
          <div><kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">Shift+S</kbd> Start questline</div>
          <div><kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">Shift+C</kbd> Complete current quest</div>
        </div>
      </div>

      {questlines.length === 0 && quests.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No active questlines</p>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {questlines.map((questline) => {
            const currentQuest = quests.find(q => q.id === questline.questIds[questline.currentQuestIndex]);
            const completedCount = questline.questIds.filter(qId => {
              const q = quests.find(quest => quest.id === qId);
              return q?.status === "completed";
            }).length;
            const progress = (completedCount / questline.questIds.length) * 100;

            return (
              <div
                key={questline.id}
                className={`p-3 rounded border transition-all ${
                  questline.status === "completed"
                    ? "bg-green-900/20 border-green-600"
                    : questline.status === "in_progress"
                    ? "bg-yellow-900/20 border-yellow-600"
                    : "bg-gray-800/80 border-gray-700"
                }`}
              >
                {/* Questline header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-empire-gold">{questline.name}</div>
                    <div className="text-xs text-gray-400">{questline.description}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ml-2 ${
                      questline.status === "completed"
                        ? "bg-green-700 text-white"
                        : questline.status === "in_progress"
                        ? "bg-yellow-700 text-white"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    {questline.status === "completed"
                      ? "Done"
                      : questline.status === "in_progress"
                      ? "Active"
                      : "Pending"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-empire-gold">{completedCount}/{questline.questIds.length}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-empire-gold transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Current active quest */}
                {currentQuest && questline.status === "in_progress" && (
                  <div className="mt-2 p-2 bg-gray-900/60 rounded border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">CURRENT OBJECTIVE</div>
                    <div className="text-sm font-semibold text-gray-200 mb-1">{currentQuest.title}</div>
                    <div className="text-xs text-gray-400 mb-2">{currentQuest.description}</div>

                    {currentQuest.status === "pending" && selectedAgentIds.size > 0 && (
                      <button
                        onClick={() => {
                          assignQuestToAgents(currentQuest.id, Array.from(selectedAgentIds));
                        }}
                        className="text-xs bg-empire-gold text-gray-900 px-3 py-1 rounded font-semibold hover:bg-yellow-500 transition-colors"
                      >
                        Assign ({selectedAgentIds.size})
                      </button>
                    )}

                    {currentQuest.status === "in_progress" && (
                      <div className="text-xs text-gray-400">
                        {currentQuest.assignedAgentIds.length} unit(s) assigned
                      </div>
                    )}
                  </div>
                )}

                {/* Start questline button */}
                {questline.status === "not_started" && (
                  <button
                    onClick={() => startQuestline(questline.id)}
                    className="w-full text-xs bg-empire-gold text-gray-900 px-3 py-1 rounded font-semibold hover:bg-yellow-500 transition-colors mt-2"
                  >
                    Start Questline
                  </button>
                )}

                {/* Quest chain visualization */}
                {questline.questIds.length > 1 && (
                  <div className="mt-2 flex items-center gap-1 overflow-x-auto">
                    {questline.questIds.map((qId, index) => {
                      const q = quests.find(quest => quest.id === qId);
                      if (!q) return null;
                      const isCurrent = index === questline.currentQuestIndex;
                      const isCompleted = q.status === "completed";

                      return (
                        <React.Fragment key={qId}>
                          <div
                            className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                              isCompleted
                                ? "bg-green-600 text-white"
                                : isCurrent
                                ? "bg-empire-gold text-gray-900"
                                : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            {index + 1}
                          </div>
                          {index < questline.questIds.length - 1 && (
                            <div className={`w-4 h-0.5 flex-shrink-0 ${isCompleted ? "bg-green-600" : "bg-gray-700"}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Standalone quests (not part of questlines) */}
          {quests.filter(q => !q.questlineId).length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">SIDE QUESTS</div>
              {quests.filter(q => !q.questlineId).map((quest) => (
                <div
                  key={quest.id}
                  className={`p-3 rounded border transition-all mb-2 ${
                    quest.status === "completed"
                      ? "bg-green-900/30 border-green-600"
                      : quest.status === "in_progress"
                      ? "bg-yellow-900/30 border-yellow-600"
                      : "bg-gray-800/80 border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{quest.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        quest.status === "completed"
                          ? "bg-green-700 text-white"
                          : quest.status === "in_progress"
                          ? "bg-yellow-700 text-white"
                          : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {quest.status === "completed"
                        ? "Done"
                        : quest.status === "in_progress"
                        ? "Active"
                        : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">{quest.description}</p>

                  {quest.status === "pending" && selectedAgentIds.size > 0 && (
                    <button
                      onClick={() => assignQuestToAgents(quest.id, Array.from(selectedAgentIds))}
                      className="text-xs bg-empire-gold text-gray-900 px-3 py-1 rounded font-semibold hover:bg-yellow-500 transition-colors"
                    >
                      Assign ({selectedAgentIds.size})
                    </button>
                  )}

                  {quest.status === "in_progress" && (
                    <div className="text-xs text-gray-400">
                      {quest.assignedAgentIds.length} unit(s) assigned
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Context Menu Component
// ============================================================================

interface ContextMenuProps {
  agentId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ agentId, position, onClose }: ContextMenuProps) {
  const agent = useGameStore((state) => state.agents[agentId]);
  const closeContextMenu = useGameStore((state) => state.closeContextMenu);
  const contextMenuOpen = useGameStore((state) => state.contextMenuOpen);
  const dragonsMap = useGameStore((state) => state.dragons, shallow);
  const partiesMap = useGameStore((state) => state.parties, shallow);
  const [showInventory, setShowInventory] = useState(false);
  const [showCombat, setShowCombat] = useState(false);
  const { attackDragon, autoResolveCombat, callForReinforcements } = useCombat();

  const createParty = useGameStore((state) => state.createParty);
  const addToParty = useGameStore((state) => state.addToParty);
  const removeFromParty = useGameStore((state) => state.removeFromParty);
  const addToolToPartyShared = useGameStore((state) => state.addToolToPartyShared);
  const selectedAgentIds = useSelectedAgentIds();

  if (!agent) return null;

  // Get existing parties
  const parties = useMemo(() => Object.values(partiesMap), [partiesMap]);
  const agentParty = agent.partyId ? partiesMap[agent.partyId] : null;

  // Find nearby dragons with memoization
  const dragons = useMemo(() => {
    return Object.values(dragonsMap).filter(
      (dragon) =>
        Math.abs(dragon.position[0] - agent.position[0]) < 5 &&
        Math.abs(dragon.position[2] - agent.position[2]) < 5
    );
  }, [dragonsMap, agent.position]);

  const handleAttack = (dragonId: string) => {
    closeContextMenu();
    attackDragon(agentId, dragonId);
  };

  const handleAutoCombat = (dragonId: string) => {
    closeContextMenu();
    autoResolveCombat(agentId, dragonId);
  };

  const handleReinforcements = (dragonId: string) => {
    const reinforced = callForReinforcements(agentId, dragonId);
    closeContextMenu();
    // Show feedback about how many agents joined
    if (reinforced.length > 0) {
      useGameStore.getState().updateAgent(agentId, {
        currentTask: `${reinforced.length} reinforcements!`,
      });
    }
  };

  return (
    <>
      {/* Backdrop - render BEFORE menu so it's behind in z-index */}
      {contextMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}

      <AnimatePresence>
        {showInventory && (
          <InventoryPanel agentId={agentId} onClose={() => setShowInventory(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bg-gray-900/95 border-2 border-empire-gold rounded-lg py-2 text-white w-56 z-50 shadow-xl shadow-empire-gold/20 pointer-events-auto"
        style={{
          left: Math.min(position.x, window.innerWidth - 230),
          top: Math.min(position.y, window.innerHeight - 300),
        }}
      >
        <div className="px-4 py-2 border-b border-empire-gold/30 bg-empire-gold/10">
          <div className="font-bold text-empire-gold">{agent.name}</div>
          <div className="text-xs text-gray-400">Level {agent.level} • {agent.state}</div>
        </div>

        <div className="py-1">
          <button
            onClick={() => setShowInventory(true)}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>🎒</span> Open Inventory
          </button>

          <button
            onClick={() => {
              closeContextMenu();
              useGameStore.getState().updateAgent(agentId, { currentTask: "Hold position..." });
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>✋</span> Hold Position
          </button>

          <button
            onClick={() => {
              closeContextMenu();
              useGameStore.getState().updateAgent(agentId, { currentTask: "Returning to base..." });
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>🏠</span> Return to Base
          </button>

          {/* Party options */}
          <div className="border-t border-gray-700 my-1" />
          <div className="px-4 py-1 text-xs text-empire-gold font-semibold">PARTY</div>

          {agentParty ? (
            <>
              <div className="px-4 py-1 text-xs text-gray-400">
                Member of: <span className="text-empire-gold">{agentParty.name}</span>
              </div>
              {agent.equippedTool && (
                <button
                  onClick={() => {
                    addToolToPartyShared(agentParty.id, agent.equippedTool);
                    closeContextMenu();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors text-pink-400"
                  title={`Share ${agent.equippedTool.name} to party pool`}
                >
                  <span>💝</span> Share {agent.equippedTool.name}
                </button>
              )}
              <button
                onClick={() => {
                  removeFromParty(agentParty.id, agentId);
                  closeContextMenu();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors text-red-400"
              >
                <span>🚪</span> Leave Party
              </button>
            </>
          ) : (
            <>
              {selectedAgentIds.size > 1 ? (
                <button
                  onClick={() => {
                    const members = Array.from(selectedAgentIds);
                    createParty(`Squad ${Date.now().toString().slice(-4)}`, members, agentId);
                    closeContextMenu();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                >
                  <span>👥</span> Create Party ({selectedAgentIds.size})
                </button>
              ) : (
                <div className="px-4 py-2 text-xs text-gray-500">
                  Select multiple agents to create a party
                </div>
              )}

              {parties.length > 0 && (
                <>
                  <div className="border-t border-gray-700 my-1" />
                  <div className="px-4 py-1 text-xs text-gray-500">Join Existing:</div>
                  {parties.slice(0, 3).map((party) => (
                    <button
                      key={party.id}
                      onClick={() => {
                        addToParty(party.id, agentId);
                        closeContextMenu();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: party.color }}
                      />
                      <span className="text-sm">{party.name}</span>
                      <span className="text-xs text-gray-500">({party.memberIds.length})</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {dragons.length > 0 && (
            <>
              <div className="border-t border-gray-700 my-1" />
              <div className="px-4 py-1 text-xs text-red-400 font-semibold">NEARBY DRAGONS</div>
              {dragons.map((dragon) => (
                <div key={dragon.id} className="px-4 py-1">
                  <div className="text-sm text-gray-300 flex justify-between">
                    <span>{dragon.type} Dragon</span>
                    <span className="text-red-400">{dragon.health}/{dragon.maxHealth} HP</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleAttack(dragon.id)}
                      className="flex-1 text-xs bg-red-700 hover:bg-red-600 py-1 rounded transition-colors"
                    >
                      Attack
                    </button>
                    <button
                      onClick={() => handleAutoCombat(dragon.id)}
                      className="flex-1 text-xs bg-blue-700 hover:bg-blue-600 py-1 rounded transition-colors"
                    >
                      Auto-Battle
                    </button>
                    <button
                      onClick={() => handleReinforcements(dragon.id)}
                      className="flex-1 text-xs bg-green-700 hover:bg-green-600 py-1 rounded transition-colors"
                      title="Call nearby agents to help"
                    >
                      📞 Reinforce
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ============================================================================
// Top Bar Component (Resource counts, etc.)
// Classic RTS Position: Top Center
// Reference: StarCraft II resource display, Age of Empires resources
// ============================================================================

interface TopBarProps {
  className?: string;
}

export function TopBar({ className = "" }: TopBarProps) {
  const agentCount = useAgentCount();
  const dragonCount = useDragonCount();
  const questCount = useQuestCount();
  const completedQuests = useCompletedQuestCount();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-gray-900/90 to-transparent pt-2 pb-8 px-4 ${className}`}
    >
      <div className="flex justify-center gap-8">
        {/* Classic RTS resource display style */}
        <div className="text-white text-center bg-gray-900/60 px-4 py-1 rounded-lg border border-empire-gold/30">
          <div className="text-2xl font-bold text-empire-gold">{agentCount}</div>
          <div className="text-xs text-gray-400">Units</div>
        </div>
        <div className="text-white text-center bg-gray-900/60 px-4 py-1 rounded-lg border border-empire-green/30">
          <div className="text-2xl font-bold text-empire-green">
            {completedQuests}/{questCount}
          </div>
          <div className="text-xs text-gray-400">Objectives</div>
        </div>
        <div className="text-white text-center bg-gray-900/60 px-4 py-1 rounded-lg border border-empire-red/30">
          <div className="text-2xl font-bold text-empire-red">{dragonCount}</div>
          <div className="text-xs text-gray-400">Threats</div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// HUD Main Component
// Combines all RTS-style UI elements
// ============================================================================

interface HUDProps {
  className?: string;
}

export function HUD({ className = "" }: HUDProps) {
  const contextMenuOpen = useGameStore((state) => state.contextMenuOpen);
  const contextMenuPosition = useGameStore((state) => state.contextMenuPosition);
  const contextMenuAgentId = useGameStore((state) => state.contextMenuAgentId);
  const closeContextMenu = useGameStore((state) => state.closeContextMenu);
  const spawnDragon = useGameStore((state) => state.spawnDragon);
  const agents = useAgentsShallow();

  // Keyboard shortcuts for testing (COMB-001: Dragon spawn test, GOAL-006: Quest completion)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+D to spawn a test dragon
      if (e.shiftKey && e.key === "D") {
        const agentList = Object.values(agents);
        if (agentList.length > 0) {
          const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
          const errorTypes = [
            { type: "SYNTAX" as const, error: "Unexpected token ';'" },
            { type: "RUNTIME" as const, error: "TypeError: Cannot read property" },
            { type: "NETWORK" as const, error: "Network request failed" },
            { type: "PERMISSION" as const, error: "Access denied: insufficient permissions" },
            { type: "UNKNOWN" as const, error: "Unknown error occurred" },
          ];
          const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
          spawnDragon(
            randomError.type,
            [randomAgent.position[0] + 2, 0, randomAgent.position[2]] as [number, number, number],
            randomError.error,
            randomAgent.id
          );
          console.log(`[COMB-001 Test] Spawned ${randomError.type} dragon at ${randomAgent.name}'s location`);
        }
      }

      // Shift+C to complete current active quest (for testing questline progression)
      if (e.shiftKey && e.key === "C") {
        const { quests, completeQuest } = useGameStore.getState();
        const activeQuest = Object.values(quests).find(q => q.status === "in_progress");
        if (activeQuest) {
          completeQuest(activeQuest.id);
          console.log(`[GOAL-006 Test] Completed quest: ${activeQuest.title}`);
        } else {
          console.log("[GOAL-006 Test] No active quest to complete. Press 'S' first to start the questline.");
        }
      }

      // Shift+S to start the first questline (for testing)
      if (e.shiftKey && e.key === "S") {
        const { questlines, startQuestline } = useGameStore.getState();
        const questlineList = Object.values(questlines);
        if (questlineList.length > 0) {
          const firstQuestline = questlineList[0];
          if (firstQuestline.status === "not_started") {
            startQuestline(firstQuestline.id);
            console.log(`[GOAL-006 Test] Started questline: ${firstQuestline.name}`);
          } else {
            console.log(`[GOAL-006 Test] Questline already started or completed`);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [agents, spawnDragon]);

  return (
    <div className={`pointer-events-none ${className}`}>
      {/* Top bar - Classic RTS resource display (top center) */}
      <TopBar />

      {/* Quest tracker - Classic RTS objectives panel (top-left) */}
      <QuestTracker />

      {/* Minimap - Classic RTS minimap (top-right) */}
      <Minimap />

      {/* Agent panel - Classic RTS unit info (bottom-left) */}
      <AgentPanel />

      {/* Party panel - Party/squad management (bottom-right) */}
      <div className="pointer-events-auto">
        <PartyPanel />
      </div>

      {/* Context menu (has pointer events) */}
      <AnimatePresence>
        {contextMenuOpen && contextMenuAgentId && contextMenuPosition && (
          <ContextMenu
            key="context-menu"
            agentId={contextMenuAgentId}
            position={contextMenuPosition}
            onClose={closeContextMenu}
          />
        )}
      </AnimatePresence>

      {/* Controls tooltip (has pointer events) */}
      <div className="pointer-events-auto">
        <ControlsTooltip />
      </div>
    </div>
  );
}
