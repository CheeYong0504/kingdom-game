import { ScienceNode, ScienceNodeId } from './gameTypes';

// Research nodes — each permanently improves a province stat
export const SCIENCE_TREE: ScienceNode[] = [
  {
    id: 'agri',
    name: 'Agriculture',
    description: 'Improved farming techniques',
    cost: { gold: 500, turns: 3 },
    effect: '+20% food production per farm',
  },
  {
    id: 'mining',
    name: 'Mining',
    description: 'Better ore extraction',
    cost: { gold: 600, turns: 3 },
    effect: '+20% gold production per mine',
  },
  {
    id: 'warfare',
    name: 'Military Tactics',
    description: 'Advanced combat doctrines',
    cost: { gold: 800, turns: 4 },
    effect: '+25% offense and defense unit strength',
  },
  {
    id: 'arcane',
    name: 'Arcane Studies',
    description: 'Deeper mastery of the arcane arts',
    cost: { gold: 700, turns: 4 },
    prerequisite: undefined,
    effect: '-25% rune cost for all spells',
  },
  {
    id: 'espionage',
    name: 'Espionage',
    description: 'Training for covert operatives',
    cost: { gold: 600, turns: 3 },
    effect: '+30% thief success rate',
  },
  {
    id: 'masonry',
    name: 'Masonry',
    description: 'Sturdy construction methods',
    cost: { gold: 500, turns: 3 },
    effect: '-20% building construction cost and time',
  },
];

export const SCIENCE_MAP: Record<ScienceNodeId, ScienceNode> = Object.fromEntries(
  SCIENCE_TREE.map((n) => [n.id, n])
) as Record<ScienceNodeId, ScienceNode>;
