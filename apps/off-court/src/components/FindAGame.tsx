import { useState, useEffect } from 'react';

interface OpenGame {
  id: string;
  venue_id: string;
  room_id: string | null;
  sport: string;
  game_type: string;
  scheduled_at: string;
  max_players: number;
  notes: string | null;
  created_by: string;
  status: string;
  created_at: string;
  player_count: number;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SPORT_EMOJI: Record<string, string> = {
  tennis: '🎾',
  padel: '🏓',
  squash: '🟡',
  badminton: '🏸',
  pickleball: '🥒',
};

export function FindAGame() {
  const [games, setGames] = useState<OpenGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const loadGames = (): void => {
    setLoading(true);
    fetch('/api/games')
      .then((r) => r.json() as Promise<OpenGame[]>)
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleJoin = (gameId: string): void => {
    setJoining(gameId);
    fetch(`/api/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: 'placeholder-member-id' }),
    })
      .then((r) => {
        if (r.ok) loadGames();
      })
      .catch(console.error)
      .finally(() => setJoining(null));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1a1a]">
        <p className="text-sm text-neutral-400">Finding games...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#1a1a1a] px-4 py-6">
      <h1 className="mb-5 text-xl font-semibold text-white">Find a Game</h1>
      {games.length === 0 ? (
        <div className="mt-24 flex flex-col items-center gap-2">
          <p className="text-3xl">🎾</p>
          <p className="text-sm text-neutral-400">No open games right now.</p>
          <p className="text-xs text-neutral-600">Check back soon or create one.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {games.map((game) => {
            const isFull = game.player_count >= game.max_players;
            const emoji = SPORT_EMOJI[game.sport.toLowerCase()] ?? '🏅';
            return (
              <li key={game.id} className="rounded-xl bg-[#242424] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-2xl">{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold capitalize text-white">
                      {game.sport}{' '}
                      <span className="text-xs font-normal capitalize text-neutral-400">
                        · {game.game_type}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">{formatTime(game.scheduled_at)}</p>
                    {game.room_id && (
                      <p className="mt-0.5 text-xs text-neutral-500">Room {game.room_id.slice(0, 8)}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`text-xs font-semibold ${isFull ? 'text-neutral-500' : 'text-emerald-400'}`}
                    >
                      {game.player_count}/{game.max_players}
                    </span>
                    <button
                      onClick={() => handleJoin(game.id)}
                      disabled={isFull || joining === game.id}
                      className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                      style={{ backgroundColor: '#6B2737' }}
                    >
                      {joining === game.id ? '...' : isFull ? 'Full' : 'Join'}
                    </button>
                  </div>
                </div>
                {game.notes && (
                  <p className="mt-2 text-xs text-neutral-500">{game.notes}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
