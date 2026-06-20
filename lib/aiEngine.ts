import { Province, GameState, AIPersonality } from './gameTypes';
import {
  buildBuildings,
  trainUnits,
  startResearch,
  recruitThieves,
  resolveCombat,
  goldPerTurn,
  offensePower,
  defensePower,
  calcNetworth,
} from './gameEngine';
import { castSpell, getUnlockedSpells, SPELL_MAP } from './spells';
import { executeMission } from './thievery';
import { SCIENCE_TREE } from './scienceTree';

// Personality weights — each AI prioritizes differently
const PERSONALITY_CONFIG: Record<AIPersonality, {
  buildWeight: number;    // how eagerly to build
  militaryWeight: number; // how eagerly to train military
  attackWeight: number;   // how eagerly to attack
  economyWeight: number;  // prioritize economic buildings
  magicWeight: number;    // how often to cast spells
  thieveryWeight: number; // how often to run thief missions
}> = {
  aggressive: { buildWeight: 0.4, militaryWeight: 0.9, attackWeight: 0.8, economyWeight: 0.3, magicWeight: 0.3, thieveryWeight: 0.4 },
  turtle:     { buildWeight: 0.8, militaryWeight: 0.6, attackWeight: 0.1, economyWeight: 0.5, magicWeight: 0.5, thieveryWeight: 0.2 },
  economic:   { buildWeight: 0.9, militaryWeight: 0.3, attackWeight: 0.2, economyWeight: 0.9, magicWeight: 0.3, thieveryWeight: 0.5 },
  balanced:   { buildWeight: 0.6, militaryWeight: 0.6, attackWeight: 0.4, economyWeight: 0.6, magicWeight: 0.4, thieveryWeight: 0.4 },
};

function roll(weight: number): boolean {
  return Math.random() < weight;
}

function pickResearchTarget(p: Province) {
  const remaining = SCIENCE_TREE.filter((n) => !p.completedResearch.includes(n.id));
  if (remaining.length === 0) return null;

  const cfg = PERSONALITY_CONFIG[p.personality];
  // Economic AI prioritizes agri/mining; aggressive prioritizes warfare; balanced is random
  let sorted = remaining;
  if (p.personality === 'aggressive') {
    sorted = [...remaining].sort((a) => (a.id === 'warfare' ? -1 : 1));
  } else if (p.personality === 'economic') {
    sorted = [...remaining].sort((a) => (a.id === 'agri' || a.id === 'mining' ? -1 : 1));
  } else if (p.personality === 'turtle') {
    sorted = [...remaining].sort((a) => (a.id === 'masonry' || a.id === 'espionage' ? -1 : 1));
  }
  return sorted[0];
}

export function runAITick(
  ai: Province,
  allProvinces: Province[],
  playerProvinceId: string,
  combatLog: GameState['combatLog'],
  currentTurn: number
): { ai: Province; provinces: Province[]; log: GameState['combatLog'] } {
  const cfg = PERSONALITY_CONFIG[ai.personality];
  let updatedAI = { ...ai };
  let updatedProvinces = [...allProvinces];
  let log = [...combatLog];

  const others = allProvinces.filter((p) => p.id !== ai.id);
  const playerProvince = allProvinces.find((p) => p.id === playerProvinceId);

  // 1. BUILD — if wilderness available and gold sufficient
  if (roll(cfg.buildWeight) && updatedAI.buildings.wilderness >= 2) {
    const gold = updatedAI.resources.gold;
    const buildTypes = cfg.economyWeight > 0.6
      ? (['farms', 'mines', 'homes', 'barracks', 'towers', 'dens'] as const)
      : (['barracks', 'farms', 'mines', 'homes', 'towers', 'dens'] as const);

    for (const bt of buildTypes) {
      if (gold >= 200) {
        const qty = Math.min(updatedAI.buildings.wilderness, Math.floor(gold / 200), 3);
        if (qty >= 1) {
          const res = buildBuildings(updatedAI, bt, qty);
          if (!res.error) { updatedAI = res.province; break; }
        }
      }
    }
  }

  // 2. TRAIN — if gold and population available
  if (roll(cfg.militaryWeight)) {
    const gold = updatedAI.resources.gold;
    const trainType = ai.personality === 'turtle' ? 'defense' : (roll(0.6) ? 'offense' : 'defense');
    const qty = Math.min(5, Math.floor(gold / 100));
    if (qty >= 1) {
      const res = trainUnits(updatedAI, trainType, qty);
      if (!res.error) updatedAI = res.province;
    }
  }

  // 3. RESEARCH — if no current research and can afford
  if (!updatedAI.currentResearch && roll(0.5)) {
    const target = pickResearchTarget(updatedAI);
    if (target) {
      const res = startResearch(updatedAI, target.id);
      if (!res.error) updatedAI = res.province;
    }
  }

  // 4. RECRUIT THIEVES — low priority
  if (roll(cfg.thieveryWeight * 0.3) && updatedAI.resources.gold > 500) {
    const res = recruitThieves(updatedAI, 2);
    if (!res.error) updatedAI = res.province;
  }

  // 5. THIEVERY MISSION
  if (roll(cfg.thieveryWeight) && updatedAI.thieves >= 5 && others.length > 0) {
    const target = others[Math.floor(Math.random() * others.length)];
    const missionType = roll(0.5) ? 'steal_gold' : (roll(0.5) ? 'steal_food' : 'sabotage');
    const espOk = updatedAI.completedResearch.includes('espionage');
    const { attacker, target: updatedTarget, result } = executeMission(missionType, updatedAI, target, espOk);
    updatedAI = attacker;
    // Update target in provinces array
    updatedProvinces = updatedProvinces.map((p) => p.id === updatedTarget.id ? updatedTarget : p);
    if (result.success && target.id === playerProvinceId) {
      log = [...log, { turn: currentTurn, message: `${ai.name} thieves: ${result.message}` }];
    }
  }

  // 6. CAST SPELL
  if (roll(cfg.magicWeight) && updatedAI.resources.runes >= 50 && others.length > 0) {
    const spells = getUnlockedSpells(updatedAI);
    if (spells.length > 0) {
      const spellId = spells[Math.floor(Math.random() * spells.length)];
      const arcane = updatedAI.completedResearch.includes('arcane');
      const spellDef = SPELL_MAP[spellId];
      if (!spellDef.targetsSelf) {
        const target = others[Math.floor(Math.random() * others.length)];
        let targetProvince = updatedProvinces.find((p) => p.id === target.id)!;
        const { caster, target: updatedTarget, result } = castSpell(spellId, updatedAI, targetProvince, arcane);
        updatedAI = caster;
        if (updatedTarget) {
          updatedProvinces = updatedProvinces.map((p) => p.id === updatedTarget.id ? updatedTarget : p);
          if (target.id === playerProvinceId && result.success) {
            log = [...log, { turn: currentTurn, message: `${ai.name} cast a spell: ${result.message}` }];
          }
        }
      } else {
        const { caster, result } = castSpell(spellId, updatedAI, null, arcane);
        updatedAI = caster;
      }
    }
  }

  // 7. ATTACK — aggressive AIs attack more; need offense power advantage
  if (roll(cfg.attackWeight) && updatedAI.military.offense >= 10 && others.length > 0) {
    // Pick weakest target by defense power
    const sortedTargets = others
      .filter((t) => defensePower(t) < offensePower(updatedAI) * 1.1)
      .sort((a, b) => defensePower(a) - defensePower(b));

    if (sortedTargets.length > 0) {
      const target = sortedTargets[0];
      let targetProvince = updatedProvinces.find((p) => p.id === target.id)!;
      const { attacker, defender, result } = resolveCombat(updatedAI, targetProvince);
      updatedAI = attacker;
      updatedProvinces = updatedProvinces.map((p) => p.id === defender.id ? defender : p);

      if (target.id === playerProvinceId || result.success) {
        log = [...log, { turn: currentTurn, message: `${ai.name} attacked ${target.name}: ${result.message}` }];
      }
    }
  }

  // Apply updated AI back to provinces
  updatedAI.networth = calcNetworth(updatedAI);
  updatedProvinces = updatedProvinces.map((p) => p.id === updatedAI.id ? updatedAI : p);

  return { ai: updatedAI, provinces: updatedProvinces, log };
}
