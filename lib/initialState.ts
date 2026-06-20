import { Province, GameState, AIPersonality } from './gameTypes';
import { calcNetworth } from './gameEngine';

function makeProvince(
  id: string,
  name: string,
  isPlayer: boolean,
  personality: AIPersonality
): Province {
  const p: Province = {
    id,
    name,
    isPlayer,
    personality,
    totalLand: 100,
    buildings: {
      homes: 5,
      farms: 8,
      mines: 5,
      barracks: 3,
      towers: 2,
      dens: 2,
      wilderness: 75,
    },
    resources: {
      gold: 800,
      food: 500,
      population: 200,
      runes: 100,
    },
    military: {
      offense: 20,
      defense: 25,
      trainingQueue: [],
    },
    knownSpells: [],
    activeEffects: [],
    completedResearch: [],
    currentResearch: null,
    thieves: 10,
    activeMissions: [],
    networth: 0,
    turnsPlayed: 0,
  };
  p.networth = calcNetworth(p);
  return p;
}

export function createInitialGameState(playerName: string): GameState {
  const player = makeProvince('player', playerName, true, 'balanced');
  const ai1 = makeProvince('ai1', 'Iron Duchy', false, 'aggressive');
  const ai2 = makeProvince('ai2', 'Goldfen', false, 'economic');
  const ai3 = makeProvince('ai3', 'Stonewall', false, 'turtle');
  const ai4 = makeProvince('ai4', 'The Wanderers', false, 'balanced');

  return {
    provinces: [player, ai1, ai2, ai3, ai4],
    playerProvinceId: 'player',
    currentTurn: 1,
    gameStarted: true,
    lastTickTime: Date.now(),
    combatLog: [],
  };
}
