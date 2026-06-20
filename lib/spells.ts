import { SpellId, Province, ActiveEffect, SpellResult, ScienceNodeId } from './gameTypes';

export interface SpellDef {
  id: SpellId;
  name: string;
  description: string;
  runeCost: number;
  towersRequired: number; // minimum tower buildings to cast
  scienceRequired?: ScienceNodeId;
  targetsSelf: boolean; // false = targets a rival
  durationTurns: number; // 0 = instant
}

export const SPELL_DEFS: SpellDef[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Incinerates enemy farms, destroying food and buildings.',
    runeCost: 80,
    towersRequired: 2,
    targetsSelf: false,
    durationTurns: 0,
  },
  {
    id: 'ward',
    name: 'Mystic Ward',
    description: 'Shields your province from the next offensive spell.',
    runeCost: 60,
    towersRequired: 1,
    targetsSelf: true,
    durationTurns: 3,
  },
  {
    id: 'harvest',
    name: 'Harvest Boon',
    description: 'Doubles food production for 2 turns.',
    runeCost: 50,
    towersRequired: 1,
    targetsSelf: true,
    durationTurns: 2,
  },
  {
    id: 'scry',
    name: 'Scrying Eye',
    description: 'Reveals the exact military and resource counts of a rival.',
    runeCost: 30,
    towersRequired: 1,
    targetsSelf: false,
    durationTurns: 0,
  },
  {
    id: 'plague',
    name: 'Plague',
    description: 'Kills 5–10% of enemy population over 2 turns.',
    runeCost: 120,
    towersRequired: 3,
    scienceRequired: 'arcane',
    targetsSelf: false,
    durationTurns: 2,
  },
  {
    id: 'fortify',
    name: 'Fortify',
    description: '+40% defense strength for 3 turns.',
    runeCost: 90,
    towersRequired: 2,
    targetsSelf: true,
    durationTurns: 3,
  },
];

export const SPELL_MAP: Record<SpellId, SpellDef> = Object.fromEntries(
  SPELL_DEFS.map((s) => [s.id, s])
) as Record<SpellId, SpellDef>;

// Determine which spells a province has unlocked
export function getUnlockedSpells(province: Province): SpellId[] {
  return SPELL_DEFS.filter((s) => {
    const towersOk = province.buildings.towers >= s.towersRequired;
    const sciOk = !s.scienceRequired || province.completedResearch.includes(s.scienceRequired);
    return towersOk && sciOk;
  }).map((s) => s.id);
}

// Cast a spell; returns updated caster + target + result message
export function castSpell(
  spellId: SpellId,
  caster: Province,
  target: Province | null,
  arcaneResearched: boolean
): { caster: Province; target: Province | null; result: SpellResult } {
  const def = SPELL_MAP[spellId];
  const runeCostMultiplier = arcaneResearched ? 0.75 : 1;
  const actualCost = Math.floor(def.runeCost * runeCostMultiplier);

  if (caster.resources.runes < actualCost) {
    return { caster, target, result: { success: false, message: 'Not enough runes.' } };
  }

  const updatedCaster: Province = {
    ...caster,
    resources: { ...caster.resources, runes: caster.resources.runes - actualCost },
  };

  let updatedTarget = target;
  let message = '';

  switch (spellId) {
    case 'fireball': {
      if (!updatedTarget) break;
      // Check if target has a ward
      const warded = updatedTarget.activeEffects.some((e) => e.spellId === 'ward');
      if (warded) {
        message = `Fireball aimed at ${updatedTarget.name} was blocked by their Mystic Ward!`;
        updatedTarget = {
          ...updatedTarget,
          activeEffects: updatedTarget.activeEffects.filter((e) => e.spellId !== 'ward'),
        };
      } else {
        // Destroy 2-4 farms and burn food
        const farmsDestroyed = Math.min(updatedTarget.buildings.farms, 2 + Math.floor(Math.random() * 3));
        const foodBurned = Math.floor(updatedTarget.resources.food * 0.15);
        updatedTarget = {
          ...updatedTarget,
          buildings: { ...updatedTarget.buildings, farms: updatedTarget.buildings.farms - farmsDestroyed, wilderness: updatedTarget.buildings.wilderness + farmsDestroyed },
          resources: { ...updatedTarget.resources, food: Math.max(0, updatedTarget.resources.food - foodBurned) },
        };
        message = `Fireball hit ${updatedTarget.name}! Destroyed ${farmsDestroyed} farms and burned ${foodBurned} food.`;
      }
      break;
    }
    case 'ward': {
      const effect: ActiveEffect = { spellId: 'ward', turnsLeft: def.durationTurns, magnitude: 1, sourceId: caster.id };
      updatedCaster.activeEffects = [...updatedCaster.activeEffects.filter((e) => e.spellId !== 'ward'), effect];
      message = 'Mystic Ward is now protecting your province.';
      break;
    }
    case 'harvest': {
      const effect: ActiveEffect = { spellId: 'harvest', turnsLeft: def.durationTurns, magnitude: 2, sourceId: caster.id };
      updatedCaster.activeEffects = [...updatedCaster.activeEffects.filter((e) => e.spellId !== 'harvest'), effect];
      message = 'Harvest Boon will double your food production for 2 turns.';
      break;
    }
    case 'scry': {
      if (!updatedTarget) break;
      message = `Scrying Eye reveals: ${updatedTarget.name} has ${updatedTarget.military.offense} offense, ${updatedTarget.military.defense} defense, ${Math.floor(updatedTarget.resources.gold)} gold, ${Math.floor(updatedTarget.resources.food)} food.`;
      break;
    }
    case 'plague': {
      if (!updatedTarget) break;
      const warded2 = updatedTarget.activeEffects.some((e) => e.spellId === 'ward');
      if (warded2) {
        message = `Plague aimed at ${updatedTarget.name} was blocked by their Mystic Ward!`;
        updatedTarget = { ...updatedTarget, activeEffects: updatedTarget.activeEffects.filter((e) => e.spellId !== 'ward') };
      } else {
        const effect: ActiveEffect = { spellId: 'plague', turnsLeft: def.durationTurns, magnitude: 0.07, sourceId: caster.id };
        updatedTarget = { ...updatedTarget, activeEffects: [...updatedTarget.activeEffects.filter((e) => e.spellId !== 'plague'), effect] };
        message = `Plague afflicts ${updatedTarget.name}! Their population will suffer over the next 2 turns.`;
      }
      break;
    }
    case 'fortify': {
      const effect: ActiveEffect = { spellId: 'fortify', turnsLeft: def.durationTurns, magnitude: 1.4, sourceId: caster.id };
      updatedCaster.activeEffects = [...updatedCaster.activeEffects.filter((e) => e.spellId !== 'fortify'), effect];
      message = 'Fortify grants +40% defense strength for 3 turns.';
      break;
    }
  }

  return { caster: updatedCaster, target: updatedTarget, result: { success: true, message } };
}
