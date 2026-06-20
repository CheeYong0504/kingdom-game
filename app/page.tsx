'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import Dashboard from '@/components/Dashboard';
import BuildPanel from '@/components/BuildPanel';
import MilitaryPanel from '@/components/MilitaryPanel';
import SciencePanel from '@/components/SciencePanel';
import MagicPanel from '@/components/MagicPanel';
import ThieveryPanel from '@/components/ThieveryPanel';
import Leaderboard from '@/components/Leaderboard';

type Tab = 'dashboard' | 'build' | 'military' | 'science' | 'magic' | 'thievery' | 'rankings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'build', label: 'Build' },
  { id: 'military', label: 'Military' },
  { id: 'science', label: 'Science' },
  { id: 'magic', label: 'Magic' },
  { id: 'thievery', label: 'Thievery' },
  { id: 'rankings', label: 'Rankings' },
];

function SetupScreen({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <div className="panel" style={{ maxWidth: '420px', width: '100%', margin: '1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚔ Realm Forge</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Build and defend your province. Outgrow your rivals in land, gold, and power.
        </p>
        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <label style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>
            Province Name
          </label>
          <input
            type="text"
            style={{ width: '100%' }}
            placeholder="e.g. Ironhaven"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name.trim())}
          />
        </div>
        <button
          className="btn btn-gold"
          style={{ width: '100%', padding: '0.6rem' }}
          disabled={!name.trim()}
          onClick={() => onStart(name.trim())}
        >
          Begin Your Reign
        </button>
        <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'left' }}>
          <strong style={{ color: 'var(--accent)' }}>Rivals you'll face:</strong>
          <ul style={{ marginTop: '0.4rem', paddingLeft: '1rem', lineHeight: '1.8' }}>
            <li>Iron Duchy — Aggressive warmonger</li>
            <li>Goldfen — Economy-focused builder</li>
            <li>Stonewall — Turtling defender</li>
            <li>The Wanderers — Balanced generalists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  const { gameStarted, initGame, advanceTurn, getPlayer, currentTurn } = useGameStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/hydration mismatch from localStorage
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (!gameStarted) return <SetupScreen onStart={initGame} />;

  const player = getPlayer();
  if (!player) return <SetupScreen onStart={initGame} />;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1rem', padding: '0.75rem 1rem',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', display: 'inline' }}>⚔ {player.name}</h1>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
            Turn {currentTurn} · Land: {player.totalLand}ac · NW: {Math.floor(player.networth).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            {Math.floor(player.resources.gold)}g · {Math.floor(player.resources.food)}f · {Math.floor(player.resources.runes)}r
          </span>
          <button className="btn btn-gold" onClick={advanceTurn}>
            Advance Turn ▶
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'dashboard' && <Dashboard province={player} currentTurn={currentTurn} />}
        {tab === 'build' && <BuildPanel />}
        {tab === 'military' && <MilitaryPanel />}
        {tab === 'science' && <SciencePanel />}
        {tab === 'magic' && <MagicPanel />}
        {tab === 'thievery' && <ThieveryPanel />}
        {tab === 'rankings' && <Leaderboard />}
      </div>
    </div>
  );
}
