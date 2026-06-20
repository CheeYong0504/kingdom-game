'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SCIENCE_TREE } from '@/lib/scienceTree';
import { ScienceNodeId } from '@/lib/gameTypes';

export default function SciencePanel() {
  const { research, getPlayer } = useGameStore();
  const player = getPlayer();
  const [msg, setMsg] = useState('');

  const handleResearch = (nodeId: ScienceNodeId) => {
    const err = research(nodeId);
    setMsg(err ? `Error: ${err}` : `Started researching ${nodeId}.`);
  };

  const masonryBonus = player.completedResearch.includes('masonry');

  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Research science to permanently improve your province.
        {masonryBonus && <span style={{ color: 'var(--success)', marginLeft: '0.4rem' }}>Masonry reduces research costs by 20%.</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {SCIENCE_TREE.map((node) => {
          const done = player.completedResearch.includes(node.id);
          const inProgress = player.currentResearch?.nodeId === node.id;
          const goldCost = Math.floor(node.cost.gold * (masonryBonus ? 0.8 : 1));

          return (
            <div key={node.id} style={{
              padding: '0.75rem', borderRadius: '5px',
              background: done ? '#1a2e1a' : inProgress ? '#1a1a2e' : 'var(--surface2)',
              border: `1px solid ${done ? 'var(--success)' : inProgress ? 'var(--accent2)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{node.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{node.description}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '0.2rem' }}>{node.effect}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  {done ? (
                    <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>✓ Complete</span>
                  ) : inProgress ? (
                    <span style={{ color: 'var(--accent2)', fontSize: '0.85rem' }}>
                      In progress ({player.currentResearch!.turnsLeft}t left)
                    </span>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                        {goldCost}g · {node.cost.turns} turns
                      </div>
                      <button className="btn btn-primary"
                        disabled={!!player.currentResearch || player.resources.gold < goldCost}
                        onClick={() => handleResearch(node.id)}>
                        Research
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {msg && (
        <div style={{ marginTop: '0.75rem' }} className={msg.startsWith('Error') ? 'msg-error' : 'msg-success'}>
          {msg}
        </div>
      )}
    </div>
  );
}
