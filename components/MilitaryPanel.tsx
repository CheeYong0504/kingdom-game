'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { TRAIN_GOLD_COST, offensePower, defensePower } from '@/lib/gameEngine';

export default function MilitaryPanel() {
  const { train, attack, getPlayer, provinces, playerProvinceId } = useGameStore();
  const player = getPlayer();
  const rivals = provinces.filter((p) => p.id !== playerProvinceId);

  const [offQty, setOffQty] = useState(5);
  const [defQty, setDefQty] = useState(5);
  const [targetId, setTargetId] = useState(rivals[0]?.id ?? '');
  const [msg, setMsg] = useState('');
  const [combatResult, setCombatResult] = useState<string | null>(null);

  const handleTrain = (type: 'offense' | 'defense', qty: number) => {
    const err = train(type, qty);
    setMsg(err ? `Error: ${err}` : `Training ${qty} ${type} units (arrives in 2 turns).`);
  };

  const handleAttack = () => {
    const result = attack(targetId);
    if (!result) { setCombatResult('Target not found.'); return; }
    setCombatResult(result.message);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Current strength */}
      <div className="panel">
        <h2>Current Forces</h2>
        <div className="stat-row">
          <span className="stat-label">Offense Units</span>
          <span className="stat-value">{player.military.offense} <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>({offensePower(player)} power)</span></span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Defense Units</span>
          <span className="stat-value">{player.military.defense} <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>({defensePower(player)} power)</span></span>
        </div>
        {player.military.trainingQueue.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            In training: {player.military.trainingQueue.map((o, i) => (
              <span key={i}>{o.quantity} {o.type} ({o.turnsLeft} turns) </span>
            ))}
          </div>
        )}
      </div>

      {/* Train */}
      <div className="panel">
        <h2>Train Units</h2>
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Cost: {TRAIN_GOLD_COST} gold + 1 population per unit · Delivers in 2 turns
          {player.completedResearch.includes('warfare') && (
            <span style={{ color: 'var(--success)', marginLeft: '0.4rem' }}>(+25% power from Military Tactics)</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Offense:</label>
            <input type="number" min={1} max={100} value={offQty}
              onChange={(e) => setOffQty(Math.max(1, parseInt(e.target.value) || 1))} />
            <button className="btn btn-primary" onClick={() => handleTrain('offense', offQty)}>
              Train ({offQty * TRAIN_GOLD_COST}g)
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Defense:</label>
            <input type="number" min={1} max={100} value={defQty}
              onChange={(e) => setDefQty(Math.max(1, parseInt(e.target.value) || 1))} />
            <button className="btn btn-primary" onClick={() => handleTrain('defense', defQty)}>
              Train ({defQty * TRAIN_GOLD_COST}g)
            </button>
          </div>
        </div>
        {msg && <div style={{ marginTop: '0.5rem' }} className={msg.startsWith('Error') ? 'msg-error' : 'msg-success'}>{msg}</div>}
      </div>

      {/* Attack */}
      <div className="panel">
        <h2>Attack a Province</h2>
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Use your offense units to seize land from a rival. You will take casualties win or lose.
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {rivals.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Off: {r.military.offense}, Def: {r.military.defense}, Land: {r.totalLand})
              </option>
            ))}
          </select>
          <button className="btn btn-danger" onClick={handleAttack}
            disabled={player.military.offense < 5}>
            Attack!
          </button>
        </div>
        {player.military.offense < 5 && (
          <div className="msg-error" style={{ marginTop: '0.5rem' }}>Need at least 5 offense units to attack.</div>
        )}
        {combatResult && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--surface2)', borderRadius: '4px', fontSize: '0.85rem' }}>
            {combatResult}
          </div>
        )}
      </div>
    </div>
  );
}
