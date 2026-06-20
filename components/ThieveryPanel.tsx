'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { MISSION_DEFS, calcSuccessChance } from '@/lib/thievery';
import { ThiefMissionType } from '@/lib/gameTypes';
import { THIEF_GOLD_COST } from '@/lib/gameEngine';

export default function ThieveryPanel() {
  const { sendMission, recruitThieves: recruit, getPlayer, provinces, playerProvinceId } = useGameStore();
  const player = getPlayer();
  const rivals = provinces.filter((p) => p.id !== playerProvinceId);

  const [targetId, setTargetId] = useState(rivals[0]?.id ?? '');
  const [recruitQty, setRecruitQty] = useState(5);
  const [msg, setMsg] = useState('');

  const espionage = player.completedResearch.includes('espionage');
  const target = rivals.find((r) => r.id === targetId);

  const handleMission = (type: ThiefMissionType) => {
    const result = sendMission(type, targetId);
    setMsg(result);
  };

  const handleRecruit = () => {
    const err = recruit(recruitQty);
    setMsg(err ? `Error: ${err}` : `Recruited ${recruitQty} thieves.`);
  };

  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Thieves: <strong style={{ color: 'var(--accent)' }}>{player.thieves}</strong>
        {espionage && <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>Espionage: +30% success chance</span>}
      </div>

      {/* Recruit */}
      <div className="panel" style={{ marginBottom: '0.75rem' }}>
        <h2>Recruit Thieves</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            {THIEF_GOLD_COST} gold each · Gold: {Math.floor(player.resources.gold)}
          </span>
          <input type="number" min={1} max={20} value={recruitQty}
            onChange={(e) => setRecruitQty(Math.max(1, parseInt(e.target.value) || 1))} />
          <button className="btn btn-primary"
            disabled={player.resources.gold < THIEF_GOLD_COST * recruitQty}
            onClick={handleRecruit}>
            Recruit ({recruitQty * THIEF_GOLD_COST}g)
          </button>
        </div>
      </div>

      {/* Missions */}
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Target:</label>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {rivals.map((r) => (
            <option key={r.id} value={r.id}>{r.name} (Dens: {r.buildings.dens})</option>
          ))}
        </select>
        {target && (
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Success chance: ~{Math.round(calcSuccessChance(player.thieves, target.buildings.dens, espionage) * 100)}%
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {MISSION_DEFS.map((mission) => {
          const canRun = player.thieves >= mission.thievesRequired;
          return (
            <div key={mission.type} style={{
              padding: '0.75rem', borderRadius: '5px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{mission.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{mission.description}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                  Requires {mission.thievesRequired} thieves
                </div>
              </div>
              <button className="btn btn-primary" disabled={!canRun || !target}
                onClick={() => handleMission(mission.type)}>
                Send
              </button>
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
