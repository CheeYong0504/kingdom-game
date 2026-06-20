// ============================================================
// Core type definitions for Realm Forge
// ============================================================

export type BuildingType = 'homes' | 'farms' | 'mines' | 'barracks' | 'towers' | 'dens' | 'wilderness';

export interface Buildings {
  homes: number;     // +population capacity
  farms: number;     // +food production
  mines: number;     // +gold production
  barracks: number;  // +military training slots
  towers: number;    // +rune production, unlocks spells
  dens: number;      // +thief capacity
  wilderness: number;// unimproved land
}

export type UnitType = 'offense' | 'defense';

export interface TrainingOrder {
  type: UnitType;
  quantity: number;
  turnsLeft: number;
}

export interface Military {
  offense: number;       // trained offense units
  defense: number;       // trained defense units
  trainingQueue: TrainingOrder[];
}

export type SpellId = 'fireball' | 'ward' | 'harvest' | 'scry' | 'plague' | 'fortify';

export interface ActiveEffect {
  spellId: SpellId;
  turnsLeft: number;
  magnitude: number;
  sourceId: string;  // province id that cast it
}

export type ScienceNodeId = 'agri' | 'mining' | 'warfare' | 'arcane' | 'espionage' | 'masonry';

export interface ScienceNode {
  id: ScienceNodeId;
  name: string;
  description: string;
  cost: { gold: number; turns: number };
  prerequisite?: ScienceNodeId;
  effect: string; // human-readable effect description
}

export interface CurrentResearch {
  nodeId: ScienceNodeId;
  turnsLeft: number;
}

export interface ThieveryMission {
  type: ThiefMissionType;
  targetId: string;
  thieves: number;
  turnsLeft: number;
}

export type ThiefMissionType = 'steal_gold' | 'steal_food' | 'sabotage' | 'assassinate' | 'spy';

export type AIPersonality = 'aggressive' | 'turtle' | 'economic' | 'balanced';

export interface Resources {
  gold: number;
  food: number;
  population: number;
  runes: number;
}

export interface Province {
  id: string;
  name: string;
  isPlayer: boolean;
  personality: AIPersonality; // used by AI; 'balanced' for player

  // Land
  totalLand: number;
  buildings: Buildings;

  // Resources
  resources: Resources;

  // Military
  military: Military;

  // Magic
  knownSpells: SpellId[];
  activeEffects: ActiveEffect[];

  // Science
  completedResearch: ScienceNodeId[];
  currentResearch: CurrentResearch | null;

  // Thievery
  thieves: number;
  activeMissions: ThieveryMission[];

  // Stats / history
  networth: number;
  turnsPlayed: number;
}

export interface CombatResult {
  success: boolean;
  landGained: number;
  landLost: number;
  attackerCasualties: number;
  defenderCasualties: number;
  message: string;
}

export interface SpellResult {
  success: boolean;
  message: string;
}

export interface ThieveryResult {
  success: boolean;
  message: string;
  value?: number;
}

export interface GameState {
  provinces: Province[];
  playerProvinceId: string;
  currentTurn: number;
  gameStarted: boolean;
  lastTickTime: number;
  combatLog: { turn: number; message: string }[];
}
