import { Province, Buildings, BuildingType, CombatResult, ScienceNodeId, GameState } from './gameTypes';
import { SCIENCE_MAP } from './scienceTree';

// ============================================================
// CONSTANTS & FORMULAS
// ============================================================

// Per turn, per building:
export const GOLD_PER_MINE = 20;
export const FOOD_PER_FARM = 30;
export const RUNE_PER_TOWER = 15;
// Per turn, per population:
export const FOOD_CONSUMED_PER_POP = 0.1; // 10 pop eat 1 food/turn
// Housing: each home supports this many people
export const POP_PER_HOME = 25;
// Natural growth when fed and housed: % of current pop
export const POP_GROWTH_RATE = 0.05;
// Starvation kill rate when food < 0 (% of pop per turn)
export const STARVATION_RATE = 0.10;
// Offense/defense power per unit
export const OFFENSE_POWER = 5;
export const DEFENSE_POWER = 4;
// Land seized per unit of excess offense power (capped)
export const LAND_GAIN_RATIO = 0.08;
// Casualty rates
export const ATTACKER_CASUALTY_RATE = 0.12;
export const DEFENDER_CASUALTY_RATE = 0.08;
// Training cost per unit
export const TRAIN_GOLD_COST = 50;
export const TRAIN_POP_COST = 1; // consumes population
export const TRAIN_TURNS = 2;
// Thief recruit cost
export const THIEF_GOLD_COST = 80;
// Build cost per acre
export const BUILD_GOLD_COST = 100;
// Build turns (reduced by masonry)
export const BUILD_TURNS = 1;
// Starting land
export const STARTING_LAND = 100;
// Rune production multiplier from arcane research
export const ARCANE_RUNE_MULTIPLIER = 0.75; // spell costs
export const ARCANE_RUNE_PROD_BONUS = 1.25; // rune production bonus

// ============================================================
// STAT HELPERS
// ============================================================

export function maxPopulation(buildings: Buildings): number {
  // Base 50 + homes contribute housing
  return 50 + buildings.homes * POP_PER_HOME;
}

export function goldPerTurn(province: Province): number {
  const base = province.buildings.mines * GOLD_PER_MINE;
  const bonus = province.completedResearch.includes('mining') ? 1.2 : 1;
  return Math.floor(base * bonus);
}

export function foodPerTurn(province: Province): number {
  const base = province.buildings.farms * FOOD_PER_FARM;
  const sciBonus = province.completedResearch.includes('agri') ? 1.2 : 1;
  const harvestEffect = province.activeEffects.find((e) => e.spellId === 'harvest');
  const spellBonus = harvestEffect ? harvestEffect.magnitude : 1;
  return Math.floor(base * sciBonus * spellBonus);
}

export function runesPerTurn(province: Province): number {
  const base = province.buildings.towers * RUNE_PER_TOWER;
  const bonus = province.completedResearch.includes('arcane') ? ARCANE_RUNE_PROD_BONUS : 1;
  return Math.floor(base * bonus);
}

export function foodConsumedPerTurn(province: Province): number {
  return Math.floor(province.resources.population * FOOD_CONSUMED_PER_POP);
}

export function offensePower(province: Province): number {
  const warBonus = province.completedResearch.includes('warfare') ? 1.25 : 1;
  return Math.floor(province.military.offense * OFFENSE_POWER * warBonus);
}

export function defensePower(province: Province): number {
  const warBonus = province.completedResearch.includes('warfare') ? 1.25 : 1;
  const fortEffect = province.activeEffects.find((e) => e.spellId === 'fortify');
  const fortBonus = fortEffect ? fortEffect.magnitude : 1;
  return Math.floor(province.military.defense * DEFENSE_POWER * warBonus * fortBonus);
}

export function calcNetworth(province: Province): number {
  return (
    province.totalLand * 10 +
    province.resources.gold * 0.5 +
    province.resources.population * 2 +
    province.military.offense * 30 +
    province.military.defense * 20 +
    province.thieves * 15 +
    province.completedResearch.length * 500
  );
}

// ============================================================
// TICK — advance one turn for a single province
// ============================================================

export function tickProvince(province: Province): Province {
  let p = { ...province };
  p.resources = { ...p.resources };
  p.military = { ...p.military };
  p.activeEffects = [...p.activeEffects];

  // 1. Production
  p.resources.gold += goldPerTurn(p);
  const foodProduced = foodPerTurn(p);
  const foodEaten = foodConsumedPerTurn(p);
  p.resources.food = Math.max(0, p.resources.food + foodProduced - foodEaten);
  p.resources.runes = Math.min(9999, p.resources.runes + runesPerTurn(p));

  // 2. Population growth / starvation
  const maxPop = maxPopulation(p.buildings);
  const netFood = foodProduced - foodEaten;
  if (netFood >= 0 && p.resources.population < maxPop) {
    // Grow toward max, limited by housing
    const growth = Math.floor(p.resources.population * POP_GROWTH_RATE);
    p.resources.population = Math.min(maxPop, p.resources.population + growth);
  } else if (p.resources.food === 0 && netFood < 0) {
    // Starvation
    const deaths = Math.floor(p.resources.population * STARVATION_RATE);
    p.resources.population = Math.max(10, p.resources.population - deaths);
  }

  // 3. Training queue — decrement turns, graduate finished units
  const remaining: typeof p.military.trainingQueue = [];
  for (const order of p.military.trainingQueue) {
    if (order.turnsLeft <= 1) {
      if (order.type === 'offense') p.military.offense += order.quantity;
      else p.military.defense += order.quantity;
    } else {
      remaining.push({ ...order, turnsLeft: order.turnsLeft - 1 });
    }
  }
  p.military.trainingQueue = remaining;

  // 4. Research — decrement
  if (p.currentResearch) {
    if (p.currentResearch.turnsLeft <= 1) {
      p.completedResearch = [...p.completedResearch, p.currentResearch.nodeId];
      p.currentResearch = null;
    } else {
      p.currentResearch = { ...p.currentResearch, turnsLeft: p.currentResearch.turnsLeft - 1 };
    }
  }

  // 5. Active spell effects — decrement and apply ongoing
  const newEffects: typeof p.activeEffects = [];
  for (const effect of p.activeEffects) {
    if (effect.spellId === 'plague') {
      const deaths = Math.floor(p.resources.population * effect.magnitude);
      p.resources.population = Math.max(10, p.resources.population - deaths);
    }
    if (effect.turnsLeft > 1) {
      newEffects.push({ ...effect, turnsLeft: effect.turnsLeft - 1 });
    }
    // ward and harvest expire after their duration (handled by turnsLeft reaching 0)
  }
  p.activeEffects = newEffects;

  // 6. Update networth
  p.networth = calcNetworth(p);
  p.turnsPlayed += 1;

  return p;
}

// ============================================================
// COMBAT
// ============================================================

export function resolveCombat(attacker: Province, defender: Province): {
  attacker: Province;
  defender: Province;
  result: CombatResult;
} {
  const atkPow = offensePower(attacker);
  const defPow = defensePower(defender);

  // Randomness ±15%
  const atkRoll = atkPow * (0.85 + Math.random() * 0.30);
  const defRoll = defPow * (0.85 + Math.random() * 0.30);

  const success = atkRoll > defRoll;

  // Casualties — attackers always take some losses; defenders take more on loss
  const atkCas = Math.floor(attacker.military.offense * ATTACKER_CASUALTY_RATE);
  const defCas = success
    ? Math.floor(defender.military.defense * DEFENDER_CASUALTY_RATE * 1.5)
    : Math.floor(defender.military.defense * DEFENDER_CASUALTY_RATE * 0.5);

  let landGained = 0;
  let updatedAttacker = { ...attacker, military: { ...attacker.military, offense: attacker.military.offense - atkCas } };
  let updatedDefender = { ...defender, military: { ...defender.military, defense: defender.military.defense - defCas } };

  if (success) {
    // Land seized: proportional to power advantage, capped at 15% of defender's land
    const powerRatio = Math.min(2, atkRoll / Math.max(1, defRoll));
    landGained = Math.max(1, Math.floor(defender.totalLand * LAND_GAIN_RATIO * powerRatio));
    landGained = Math.min(landGained, Math.floor(defender.totalLand * 0.15));

    // Move wilderness land first, then raze buildings proportionally
    const wildnessAvailable = updatedDefender.buildings.wilderness;
    const fromWild = Math.min(landGained, wildnessAvailable);
    const fromBuildings = landGained - fromWild;

    updatedDefender.buildings = {
      ...updatedDefender.buildings,
      wilderness: updatedDefender.buildings.wilderness - fromWild,
    };
    updatedDefender.totalLand -= landGained;
    updatedAttacker.totalLand += landGained;
    updatedAttacker.buildings = {
      ...updatedAttacker.buildings,
      wilderness: updatedAttacker.buildings.wilderness + landGained,
    };

    if (fromBuildings > 0) {
      // Remove from random buildings
      let toRemove = fromBuildings;
      const btypes = (['homes', 'farms', 'mines', 'barracks', 'towers', 'dens'] as const);
      for (const bt of btypes) {
        if (toRemove <= 0) break;
        const take = Math.min(updatedDefender.buildings[bt], toRemove);
        updatedDefender.buildings = { ...updatedDefender.buildings, [bt]: updatedDefender.buildings[bt] - take };
        toRemove -= take;
      }
    }
  }

  // Recompute networth
  updatedAttacker.networth = calcNetworth(updatedAttacker);
  updatedDefender.networth = calcNetworth(updatedDefender);

  const result: CombatResult = {
    success,
    landGained,
    landLost: success ? landGained : 0,
    attackerCasualties: atkCas,
    defenderCasualties: defCas,
    message: success
      ? `Victory! Seized ${landGained} acres from ${defender.name}. Lost ${atkCas} offense units.`
      : `Defeat against ${defender.name}. Lost ${atkCas} offense units.`,
  };

  return { attacker: updatedAttacker, defender: updatedDefender, result };
}

// ============================================================
// BUILDING ACTIONS
// ============================================================

export function buildBuildings(
  province: Province,
  buildingType: Exclude<BuildingType, 'wilderness'>,
  quantity: number
): { province: Province; error?: string } {
  const masonryBonus = province.completedResearch.includes('masonry') ? 0.8 : 1;
  const costPerAcre = Math.floor(BUILD_GOLD_COST * masonryBonus);
  const totalCost = costPerAcre * quantity;

  if (province.buildings.wilderness < quantity) {
    return { province, error: `Not enough wilderness (need ${quantity}, have ${province.buildings.wilderness}).` };
  }
  if (province.resources.gold < totalCost) {
    return { province, error: `Not enough gold (need ${totalCost}, have ${Math.floor(province.resources.gold)}).` };
  }

  return {
    province: {
      ...province,
      resources: { ...province.resources, gold: province.resources.gold - totalCost },
      buildings: {
        ...province.buildings,
        wilderness: province.buildings.wilderness - quantity,
        [buildingType]: province.buildings[buildingType] + quantity,
      },
    },
  };
}

export function razeBuildings(
  province: Province,
  buildingType: Exclude<BuildingType, 'wilderness'>,
  quantity: number
): { province: Province; error?: string } {
  if (province.buildings[buildingType] < quantity) {
    return { province, error: `Not enough ${buildingType} to raze.` };
  }
  return {
    province: {
      ...province,
      buildings: {
        ...province.buildings,
        [buildingType]: province.buildings[buildingType] - quantity,
        wilderness: province.buildings.wilderness + quantity,
      },
    },
  };
}

// ============================================================
// TRAINING
// ============================================================

export function trainUnits(
  province: Province,
  type: 'offense' | 'defense',
  quantity: number
): { province: Province; error?: string } {
  const totalGold = TRAIN_GOLD_COST * quantity;
  const totalPop = TRAIN_POP_COST * quantity;

  if (province.resources.gold < totalGold) {
    return { province, error: `Need ${totalGold} gold to train ${quantity} units.` };
  }
  if (province.resources.population < totalPop + 10) {
    return { province, error: 'Not enough available population to train.' };
  }

  const turnsRequired = BUILD_TURNS + 1; // 2 turns
  return {
    province: {
      ...province,
      resources: {
        ...province.resources,
        gold: province.resources.gold - totalGold,
        population: province.resources.population - totalPop,
      },
      military: {
        ...province.military,
        trainingQueue: [...province.military.trainingQueue, { type, quantity, turnsLeft: turnsRequired }],
      },
    },
  };
}

// ============================================================
// RESEARCH
// ============================================================

export function startResearch(
  province: Province,
  nodeId: ScienceNodeId
): { province: Province; error?: string } {
  if (province.currentResearch) {
    return { province, error: 'Already researching something.' };
  }
  if (province.completedResearch.includes(nodeId)) {
    return { province, error: 'Already researched.' };
  }
  const node = SCIENCE_MAP[nodeId];
  const masonryBonus = province.completedResearch.includes('masonry') ? 0.8 : 1;
  const goldCost = Math.floor(node.cost.gold * masonryBonus);

  if (province.resources.gold < goldCost) {
    return { province, error: `Need ${goldCost} gold to research ${node.name}.` };
  }

  return {
    province: {
      ...province,
      resources: { ...province.resources, gold: province.resources.gold - goldCost },
      currentResearch: { nodeId, turnsLeft: node.cost.turns },
    },
  };
}

// ============================================================
// RECRUIT THIEVES
// ============================================================

export function recruitThieves(
  province: Province,
  quantity: number
): { province: Province; error?: string } {
  const totalCost = THIEF_GOLD_COST * quantity;
  if (province.resources.gold < totalCost) {
    return { province, error: `Need ${totalCost} gold.` };
  }
  return {
    province: {
      ...province,
      resources: { ...province.resources, gold: province.resources.gold - totalCost },
      thieves: province.thieves + quantity,
    },
  };
}

// ============================================================
// FULL GAME TICK
// ============================================================

export function tickGame(state: GameState): GameState {
  const tickedProvinces = state.provinces.map((p) => tickProvince(p));
  return {
    ...state,
    provinces: tickedProvinces,
    currentTurn: state.currentTurn + 1,
    lastTickTime: Date.now(),
  };
}
