import { useState, useEffect } from 'react';

interface Crew {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  venue_id: string;
  created_by: string;
  created_at: string;
}

interface CrewCard extends Crew {
  memberCount: number;
}

export function Crews() {
  const [crewList, setCrewList] = useState<CrewCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crews')
      .then((r) => r.json() as Promise<Crew[]>)
      .then((data) => {
        setCrewList(data.map((c) => ({ ...c, memberCount: 0 })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleJoin = (crewId: string): void => {
    fetch(`/api/crews/${crewId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: 'placeholder-member-id' }),
    }).catch(console.error);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1a1a]">
        <p className="text-sm text-neutral-400">Loading crews...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#1a1a1a] px-4 py-6">
      <h1 className="mb-5 text-xl font-semibold text-white">Crews</h1>
      {crewList.length === 0 ? (
        <p className="mt-16 text-center text-sm text-neutral-400">
          No crews yet. Be the first to create one.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {crewList.map((crew) => (
            <li key={crew.id} className="rounded-xl bg-[#242424] p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{crew.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-neutral-400">{crew.sport}</p>
                </div>
                <button
                  onClick={() => handleJoin(crew.id)}
                  className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: '#6B2737' }}
                >
                  Join
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {crew.memberCount} {crew.memberCount === 1 ? 'member' : 'members'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
