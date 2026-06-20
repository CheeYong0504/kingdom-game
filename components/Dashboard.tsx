'use client';
import { Province } from '@/lib/gameTypes';
import { goldPerTurn, foodPerTurn, runesPerTurn, foodConsumedPerTurn, maxPopulation, offensePower, defensePower } from '@/lib/gameEngine';

interface Props {
  province: Province;
  currentTurn: number;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span>
        <span className="stat-value">{value}</span>
        {sub && <span style={{ color: 'var(--muted)', fontSize: '0.78rem', marginLeft: '0.4rem' }}>{sub}</span>}
      </span>
    </div>
  );
}

export default function Dashboard({ province, currentTurn }: Props) {
  const foodNet = foodPerTurn(province) - foodConsumedPerTurn(province);
  const maxPop = maxPopulation(province.buildings);
  const buildings = province.buildings;
  const totalBuilt = buildings.homes + buildings.farms + buildings.mines + buildings.barracks + buildings.towers + buildings.dens;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      {/* Resources */}
      <div className="panel">
        <h2>Resources</h2>
        <Stat label="Gold" value={Math.floor(province.resources.gold)} sub={`+${goldPerTurn(province)}/turn`} />
        <Stat label="Food" value={Math.floor(province.resources.food)} sub={`${foodNet >= 0 ? '+' : ''}${foodNet}/turn`} />
        <Stat label="Runes" value={Math.floor(province.resources.runes)} sub={`+${runesPerTurn(province)}/turn`} />
        <Stat label="Population" value={Math.floor(province.resources.population)} sub={`/ ${maxPop} cap`} />
      </div>

      {/* Land */}
      <div className="panel">
        <h2>Land — {province.totalLand} acres</h2>
        <Stat label="Wilderness" value={buildings.wilderness} />
        <Stat label="Homes" value={buildings.homes} />
        <Stat label="Farms" value={buildings.farms} />
        <Stat label="Mines" value={buildings.mines} />
        <Stat label="Barracks" value={buildings.barracks} />
        <Stat label="Towers" value={buildings.towers} />
        <Stat label="Thieves' Dens" value={buildings.dens} />
      </div>

      {/* Military */}
      <div className="panel">
        <h2>Military</h2>
        <Stat label="Offense Units" value={province.military.offense} sub={`${offensePower(province)} power`} />
        <Stat label="Defense Units" value={province.military.defense} sub={`${defensePower(province)} power`} />
        <Stat label="Thieves" value={province.thieves} />
        {province.military.trainingQueue.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Training: {province.military.trainingQueue.map((o, i) => (
              <span key={i}>{o.quantity} {o.type} ({o.turnsLeft}t) </span>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="panel">
        <h2>Status</h2>
        <Stat label="Turn" value={currentTurn} />
        <Stat label="Networth" value={Math.floor(province.networth).toLocaleString()} />
        <Stat label="Research" value={province.currentResearch
          ? `${province.currentResearch.nodeId} (${province.currentResearch.turnsLeft}t)`
          : 'None'} />
        <div style={{ marginTop: '0.5rem' }}>
          {province.activeEffects.length > 0 ? (
            <>
              <div className="stat-label" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>Active Effects:</div>
              {province.activeEffects.map((e, i) => (
                <span key={i} style={{
                  display: 'inline-block', marginRight: '0.4rem',
                  background: 'var(--surface2)', padding: '0.1rem 0.4rem',
                  borderRadius: '3px', fontSize: '0.75rem', color: 'var(--accent)',
                }}>
                  {e.spellId} ({e.turnsLeft}t)
                </span>
              ))}
            </>
          ) : (
            <span className="stat-label" style={{ fontSize: '0.8rem' }}>No active effects</span>
          )}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
          Science: {province.completedResearch.length > 0
            ? province.completedResearch.join(', ')
            : 'None researched'}
        </div>
      </div>
    </div>
  );
}
