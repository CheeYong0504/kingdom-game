'use client';
import { useGameStore } from '@/store/gameStore';
import { offensePower, defensePower } from '@/lib/gameEngine';

export default function Leaderboard() {
  const { provinces, playerProvinceId, combatLog } = useGameStore();
  const sorted = [...provinces].sort((a, b) => b.networth - a.networth);

  const badgeClass = (personality: string) => {
    return `badge badge-${personality}`;
  };

  const personalityLabel: Record<string, string> = {
    aggressive: 'Aggressive',
    turtle: 'Turtle',
    economic: 'Economic',
    balanced: 'Balanced',
  };

  return (
    <div>
      <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--muted)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.4rem' }}>#</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.4rem' }}>Province</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.4rem' }}>Style</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem' }}>Land</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem' }}>Pop</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem' }}>Off Pwr</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem' }}>Def Pwr</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem' }}>Gold</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem' }}>Networth</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const isPlayer = p.id === playerProvinceId;
              return (
                <tr key={p.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: isPlayer ? 'rgba(124, 92, 191, 0.12)' : 'transparent',
                }}>
                  <td style={{ padding: '0.5rem 0.4rem', color: 'var(--muted)' }}>
                    {i === 0 ? '👑' : i + 1}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', fontWeight: isPlayer ? 700 : 400 }}>
                    {p.name}
                    {isPlayer && <span style={{ color: 'var(--accent2)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>(You)</span>}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem' }}>
                    <span className={badgeClass(p.personality)}>{personalityLabel[p.personality]}</span>
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--accent)' }}>{p.totalLand}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>{Math.floor(p.resources.population)}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>{offensePower(p)}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>{defensePower(p)}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>{Math.floor(p.resources.gold).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>
                    {Math.floor(p.networth).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Combat log */}
      <div className="panel">
        <h2>Recent Events</h2>
        {combatLog.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No events yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '200px', overflowY: 'auto' }}>
            {[...combatLog].reverse().map((entry, i) => (
              <div key={i} style={{ fontSize: '0.82rem', color: 'var(--muted)', padding: '0.2rem 0' }}>
                <span style={{ color: 'var(--accent2)', marginRight: '0.4rem' }}>T{entry.turn}</span>
                {entry.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
