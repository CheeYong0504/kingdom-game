'use client';
import { useState } from 'react';
import { BuildingType } from '@/lib/gameTypes';
import { BUILD_GOLD_COST } from '@/lib/gameEngine';
import { useGameStore } from '@/store/gameStore';

const BUILDING_DEFS: { type: Exclude<BuildingType, 'wilderness'>; name: string; effect: string }[] = [
  { type: 'homes', name: 'Homes', effect: '+25 population cap each' },
  { type: 'farms', name: 'Farms', effect: '+30 food/turn each' },
  { type: 'mines', name: 'Mines', effect: '+20 gold/turn each' },
  { type: 'barracks', name: 'Barracks', effect: 'Enables military training' },
  { type: 'towers', name: 'Towers', effect: '+15 runes/turn, unlocks spells' },
  { type: 'dens', name: "Thieves' Dens", effect: 'Defends against enemy thieves' },
];

export default function BuildPanel() {
  const { build, raze, getPlayer } = useGameStore();
  const player = getPlayer();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');

  const masonryBonus = player.completedResearch.includes('masonry') ? 0.8 : 1;
  const costPerAcre = Math.floor(BUILD_GOLD_COST * masonryBonus);

  const handleBuild = (type: Exclude<BuildingType, 'wilderness'>) => {
    const q = qty[type] || 1;
    const err = build(type, q);
    setMsg(err ? `Error: ${err}` : `Built ${q} ${type}.`);
  };

  const handleRaze = (type: Exclude<BuildingType, 'wilderness'>) => {
    const q = qty[type] || 1;
    const err = raze(type, q);
    setMsg(err ? `Error: ${err}` : `Razed ${q} ${type}.`);
  };

  return (
    <div>
      <div style={{ marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
        Wilderness available: <strong style={{ color: 'var(--accent)' }}>{player.buildings.wilderness}</strong> acres
        &nbsp;·&nbsp; Cost: <strong style={{ color: 'var(--accent)' }}>{costPerAcre} gold/acre</strong>
        {player.completedResearch.includes('masonry') && (
          <span style={{ color: 'var(--success)', marginLeft: '0.4rem' }}>(Masonry -20%)</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {BUILDING_DEFS.map(({ type, name, effect }) => (
          <div key={type} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.5rem', background: 'var(--surface2)', borderRadius: '4px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{effect}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Current: <span style={{ color: 'var(--accent)' }}>{player.buildings[type]}</span>
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={player.buildings.wilderness}
              value={qty[type] || 1}
              onChange={(e) => setQty({ ...qty, [type]: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            <button className="btn btn-primary" onClick={() => handleBuild(type)}>Build</button>
            <button className="btn btn-danger" onClick={() => handleRaze(type)}
              disabled={player.buildings[type] === 0}>Raze</button>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginTop: '0.75rem' }}
          className={msg.startsWith('Error') ? 'msg-error' : 'msg-success'}>
          {msg}
        </div>
      )}
    </div>
  );
}
