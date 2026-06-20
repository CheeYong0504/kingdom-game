'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SPELL_DEFS, getUnlockedSpells, SPELL_MAP } from '@/lib/spells';
import { SpellId } from '@/lib/gameTypes';
import { ARCANE_RUNE_MULTIPLIER } from '@/lib/gameEngine';

export default function MagicPanel() {
  const { cast, getPlayer, provinces, playerProvinceId } = useGameStore();
  const player = getPlayer();
  const rivals = provinces.filter((p) => p.id !== playerProvinceId);

  const [targetId, setTargetId] = useState(rivals[0]?.id ?? '');
  const [msg, setMsg] = useState('');

  const unlocked = getUnlockedSpells(player);
  const arcane = player.completedResearch.includes('arcane');

  const handleCast = (spellId: SpellId) => {
    const def = SPELL_MAP[spellId];
    const tId = def.targetsSelf ? undefined : targetId;
    const result = cast(spellId, tId);
    setMsg(result);
  };

  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Runes: <strong style={{ color: 'var(--accent)' }}>{Math.floor(player.resources.runes)}</strong>
        &nbsp;· Towers: <strong style={{ color: 'var(--accent)' }}>{player.buildings.towers}</strong>
        {arcane && <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>Arcane: -25% rune costs</span>}
      </div>
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Target rival:</label>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {rivals.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {SPELL_DEFS.map((spell) => {
          const isUnlocked = unlocked.includes(spell.id);
          const runeCost = Math.floor(spell.runeCost * (arcane ? ARCANE_RUNE_MULTIPLIER : 1));
          const canCast = isUnlocked && player.resources.runes >= runeCost;
          const activeEffect = player.activeEffects.find((e) => e.spellId === spell.id);

          return (
            <div key={spell.id} style={{
              padding: '0.75rem', borderRadius: '5px',
              background: isUnlocked ? 'var(--surface2)' : '#111',
              border: `1px solid ${isUnlocked ? 'var(--border)' : '#1e1e1e'}`,
              opacity: isUnlocked ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {spell.name}
                    {activeEffect && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--accent2)', fontSize: '0.75rem' }}>
                        (active {activeEffect.turnsLeft}t)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{spell.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {isUnlocked ? (
                      <span style={{ color: 'var(--success)' }}>Unlocked</span>
                    ) : (
                      <span>Requires {spell.towersRequired} towers{spell.scienceRequired ? ` + ${spell.scienceRequired} research` : ''}</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                    {runeCost} runes{spell.durationTurns > 0 ? ` · ${spell.durationTurns}t` : ' · instant'}
                    <br />{spell.targetsSelf ? 'Self' : 'Enemy'}
                  </div>
                  <button className="btn btn-primary"
                    disabled={!canCast}
                    onClick={() => handleCast(spell.id)}>
                    Cast
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {msg && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--surface2)', borderRadius: '4px', fontSize: '0.85rem' }}>
          {msg}
        </div>
      )}
    </div>
  );
}
