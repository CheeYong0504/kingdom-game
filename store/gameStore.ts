'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, Province, BuildingType, ScienceNodeId, SpellId, ThiefMissionType, CombatResult } from '@/lib/gameTypes';
import { createInitialGameState } from '@/lib/initialState';
import { tickGame, buildBuildings, razeBuildings, trainUnits, startResearch, recruitThieves } from '@/lib/gameEngine';
import { castSpell } from '@/lib/spells';
import { executeMission } from '@/lib/thievery';
import { resolveCombat } from '@/lib/gameEngine';
import { runAITick } from '@/lib/aiEngine';

interface GameStore extends GameState {
  // Setup
  initGame: (playerName: string) => void;

  // Turn management
  advanceTurn: () => void;

  // Building
  build: (type: Exclude<BuildingType, 'wilderness'>, qty: number) => string | null;
  raze: (type: Exclude<BuildingType, 'wilderness'>, qty: number) => string | null;

  // Military
  train: (type: 'offense' | 'defense', qty: number) => string | null;

  // Research
  research: (nodeId: ScienceNodeId) => string | null;

  // Magic
  cast: (spellId: SpellId, targetId?: string) => string;

  // Thievery
  recruitThieves: (qty: number) => string | null;
  sendMission: (type: ThiefMissionType, targetId: string) => string;

  // Combat
  attack: (targetId: string) => CombatResult | null;

  // Helpers
  getPlayer: () => Province;
  getProvince: (id: string) => Province | undefined;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial blank state — overwritten by initGame or hydration from localStorage
      provinces: [],
      playerProvinceId: 'player',
      currentTurn: 0,
      gameStarted: false,
      lastTickTime: 0,
      combatLog: [],

      initGame: (playerName) => {
        set(createInitialGameState(playerName));
      },

      advanceTurn: () => {
        const state = get();
        // 1. Tick all provinces (production, growth, timers)
        let ticked = tickGame(state);

        // 2. Run AI decision loop for each AI province
        const aiProvinces = ticked.provinces.filter((p) => !p.isPlayer);
        let provinces = [...ticked.provinces];
        let combatLog = [...ticked.combatLog];

        for (const ai of aiProvinces) {
          const currentAI = provinces.find((p) => p.id === ai.id)!;
          const result = runAITick(currentAI, provinces, state.playerProvinceId, combatLog, ticked.currentTurn);
          provinces = result.provinces;
          combatLog = result.log;
        }

        // Keep combat log capped at 50 entries
        if (combatLog.length > 50) combatLog = combatLog.slice(-50);

        set({ ...ticked, provinces, combatLog });
      },

      build: (type, qty) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const { province, error } = buildBuildings(player, type, qty);
        if (error) return error;
        set({ provinces: state.provinces.map((p) => p.id === player.id ? province : p) });
        return null;
      },

      raze: (type, qty) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const { province, error } = razeBuildings(player, type, qty);
        if (error) return error;
        set({ provinces: state.provinces.map((p) => p.id === player.id ? province : p) });
        return null;
      },

      train: (type, qty) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const { province, error } = trainUnits(player, type, qty);
        if (error) return error;
        set({ provinces: state.provinces.map((p) => p.id === player.id ? province : p) });
        return null;
      },

      research: (nodeId) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const { province, error } = startResearch(player, nodeId);
        if (error) return error;
        set({ provinces: state.provinces.map((p) => p.id === player.id ? province : p) });
        return null;
      },

      cast: (spellId, targetId) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const arcane = player.completedResearch.includes('arcane');
        const target = targetId ? state.provinces.find((p) => p.id === targetId) ?? null : null;

        const { caster, target: updatedTarget, result } = castSpell(spellId, player, target, arcane);
        let provinces = state.provinces.map((p) => p.id === caster.id ? caster : p);
        if (updatedTarget) {
          provinces = provinces.map((p) => p.id === updatedTarget.id ? updatedTarget : p);
        }
        set({ provinces });
        return result.message;
      },

      recruitThieves: (qty) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const { province, error } = recruitThieves(player, qty);
        if (error) return error;
        set({ provinces: state.provinces.map((p) => p.id === player.id ? province : p) });
        return null;
      },

      sendMission: (type, targetId) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const target = state.provinces.find((p) => p.id === targetId);
        if (!target) return 'Target not found.';

        const espionage = player.completedResearch.includes('espionage');
        const { attacker, target: updatedTarget, result } = executeMission(type, player, target, espionage);
        let provinces = state.provinces.map((p) => p.id === attacker.id ? attacker : p);
        provinces = provinces.map((p) => p.id === updatedTarget.id ? updatedTarget : p);
        set({ provinces });
        return result.message;
      },

      attack: (targetId) => {
        const state = get();
        const player = state.provinces.find((p) => p.id === state.playerProvinceId)!;
        const target = state.provinces.find((p) => p.id === targetId);
        if (!target) return null;

        const { attacker, defender, result } = resolveCombat(player, target);
        let provinces = state.provinces.map((p) => p.id === attacker.id ? attacker : p);
        provinces = provinces.map((p) => p.id === defender.id ? defender : p);
        const newLog = [...state.combatLog, { turn: state.currentTurn, message: result.message }];
        set({ provinces, combatLog: newLog });
        return result;
      },

      getPlayer: () => {
        const state = get();
        return state.provinces.find((p) => p.id === state.playerProvinceId)!;
      },

      getProvince: (id) => {
        return get().provinces.find((p) => p.id === id);
      },
    }),
    {
      name: 'realm-forge-save',
      // Persist entire game state
    }
  )
);
