import { Province, ThiefMissionType, ThieveryResult } from './gameTypes';

export interface MissionDef {
  type: ThiefMissionType;
  name: string;
  description: string;
  thievesRequired: number; // minimum thieves to attempt
  targetsSelf: boolean;
}

export const MISSION_DEFS: MissionDef[] = [
  {
    type: 'spy',
    name: 'Intelligence Gathering',
    description: 'Reveal a rival\'s full province report.',
    thievesRequired: 3,
    targetsSelf: false,
  },
  {
    type: 'steal_gold',
    name: 'Rob Treasury',
    description: 'Steal 5–15% of a rival\'s gold reserves.',
    thievesRequired: 5,
    targetsSelf: false,
  },
  {
    type: 'steal_food',
    name: 'Raid Granary',
    description: 'Steal 5–15% of a rival\'s food stores.',
    thievesRequired: 5,
    targetsSelf: false,
  },
  {
    type: 'sabotage',
    name: 'Sabotage',
    description: 'Destroy 1–3 random buildings in a rival province.',
    thievesRequired: 8,
    targetsSelf: false,
  },
  {
    type: 'assassinate',
    name: 'Assassinate',
    description: 'Kill 50–150 enemy military units.',
    thievesRequired: 10,
    targetsSelf: false,
  },
];

// Base success chance: attacker thieves / (attacker + defender*1.5) + espionage bonus
export function calcSuccessChance(
  attackerThieves: number,
  defenderDens: number,
  attackerHasEspionage: boolean
): number {
  const denDefense = defenderDens * 2; // each den adds 2 virtual defense points
  const base = attackerThieves / (attackerThieves + denDefense + 1);
  const bonus = attackerHasEspionage ? 0.3 : 0;
  return Math.min(0.95, base + bonus);
}

// Execute a thievery mission immediately (instant resolution for player-visible actions)
export function executeMission(
  missionType: ThiefMissionType,
  attacker: Province,
  target: Province,
  espionageResearched: boolean
): { attacker: Province; target: Province; result: ThieveryResult } {
  const thievesUsed = MISSION_DEFS.find((m) => m.type === missionType)?.thievesRequired ?? 5;

  if (attacker.thieves < thievesUsed) {
    return { attacker, target, result: { success: false, message: `Need at least ${thievesUsed} thieves.` } };
  }

  const chance = calcSuccessChance(attacker.thieves, target.buildings.dens, espionageResearched);
  const roll = Math.random();

  if (roll > chance) {
    // Failed — lose some thieves
    const lost = Math.ceil(thievesUsed * 0.5);
    return {
      attacker: { ...attacker, thieves: attacker.thieves - lost },
      target,
      result: { success: false, message: `Mission failed! Lost ${lost} thieves.` },
    };
  }

  // Success
  let updatedAttacker = { ...attacker };
  let updatedTarget = { ...target };
  let message = '';
  let value: number | undefined;

  switch (missionType) {
    case 'spy': {
      message = `Intel on ${target.name}: Land ${target.totalLand}, Pop ${Math.floor(target.resources.population)}, Gold ${Math.floor(target.resources.gold)}, Food ${Math.floor(target.resources.food)}, Off ${target.military.offense}, Def ${target.military.defense}, Thieves ${target.thieves}.`;
      break;
    }
    case 'steal_gold': {
      const pct = 0.05 + Math.random() * 0.10;
      value = Math.floor(target.resources.gold * pct);
      updatedTarget.resources = { ...updatedTarget.resources, gold: updatedTarget.resources.gold - value };
      updatedAttacker.resources = { ...updatedAttacker.resources, gold: updatedAttacker.resources.gold + value };
      message = `Stole ${value} gold from ${target.name}!`;
      break;
    }
    case 'steal_food': {
      const pct = 0.05 + Math.random() * 0.10;
      value = Math.floor(target.resources.food * pct);
      updatedTarget.resources = { ...updatedTarget.resources, food: Math.max(0, updatedTarget.resources.food - value) };
      updatedAttacker.resources = { ...updatedAttacker.resources, food: updatedAttacker.resources.food + value };
      message = `Raided ${value} food from ${target.name}!`;
      break;
    }
    case 'sabotage': {
      const buildingTypes = (['homes', 'farms', 'mines', 'barracks', 'towers', 'dens'] as const).filter(
        (b) => updatedTarget.buildings[b] > 0
      );
      if (buildingTypes.length === 0) {
        message = `${target.name} had no buildings to sabotage.`;
      } else {
        const count = 1 + Math.floor(Math.random() * 3);
        const destroyed: Partial<typeof updatedTarget.buildings> = {};
        for (let i = 0; i < count; i++) {
          const bt = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
          if (updatedTarget.buildings[bt] > 0) {
            destroyed[bt] = (destroyed[bt] ?? 0) + 1;
            updatedTarget.buildings = { ...updatedTarget.buildings, [bt]: updatedTarget.buildings[bt] - 1, wilderness: updatedTarget.buildings.wilderness + 1 };
          }
        }
        const summary = Object.entries(destroyed).map(([k, v]) => `${v} ${k}`).join(', ');
        message = `Sabotaged ${summary} in ${target.name}!`;
      }
      break;
    }
    case 'assassinate': {
      const killed = 50 + Math.floor(Math.random() * 100);
      const offKill = Math.floor(killed * 0.5);
      const defKill = killed - offKill;
      updatedTarget.military = {
        ...updatedTarget.military,
        offense: Math.max(0, updatedTarget.military.offense - offKill),
        defense: Math.max(0, updatedTarget.military.defense - defKill),
      };
      message = `Assassins killed ${offKill} offense and ${defKill} defense units in ${target.name}!`;
      break;
    }
  }

  return { attacker: updatedAttacker, target: updatedTarget, result: { success: true, message, value } };
}
