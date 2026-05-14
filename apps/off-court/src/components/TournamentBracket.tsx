import { useState, useEffect, useCallback } from 'react';

interface Tournament {
  id: string;
  event_id: string;
  format: string;
  sport: string;
  status: string;
  created_at: string;
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface BracketResponse {
  tournament: Tournament;
  bracket: Record<string, TournamentMatch[]>;
  memberNames: Record<string, string>;
}

const MERLOT = '#6B2737';
const MERLOT_DIM = '#3D1520';
const MERLOT_TEXT = '#E9B4BD';

export function TournamentBracket({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<BracketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { p1: string; p2: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBracket = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/tournaments/${tournamentId}/bracket`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load bracket');
        return r.json() as Promise<BracketResponse>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    loadBracket();
  }, [loadBracket]);

  const getName = useCallback(
    (id: string | null): string => {
      if (!id) return 'TBD';
      return data?.memberNames[id] ?? `…${id.slice(-4)}`;
    },
    [data],
  );

  const submitResult = useCallback(
    async (match: TournamentMatch) => {
      const p1 = parseInt(scores[match.id]?.p1 ?? '', 10);
      const p2 = parseInt(scores[match.id]?.p2 ?? '', 10);
      if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2) return;
      const winner_id = p1 > p2 ? match.player1_id : match.player2_id;
      setSubmitting(match.id);
      try {
        const r = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player1_score: p1, player2_score: p2, winner_id }),
        });
        if (r.ok) {
          loadBracket();
          setScores((prev) => {
            const next = { ...prev };
            delete next[match.id];
            return next;
          });
        }
      } finally {
        setSubmitting(null);
      }
    },
    [scores, tournamentId, loadBracket],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-[#0d0d0d]">
        <p className="text-sm text-neutral-400">Loading bracket...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[#0d0d0d]">
        <p className="text-sm text-neutral-400">{error ?? 'Could not load bracket.'}</p>
        <button
          onClick={loadBracket}
          className="text-xs px-3 py-1.5 rounded-lg text-white"
          style={{ backgroundColor: MERLOT }}
        >
          Retry
        </button>
      </div>
    );
  }

  const rounds = Object.keys(data.bracket).map(Number).sort((a, b) => a - b);
  const maxRound = rounds[rounds.length - 1] ?? 1;
  const round1Count = data.bracket[1]?.length ?? 1;
  const colHeight = Math.max(round1Count * 148, 200);

  const finalMatch = data.bracket[maxRound]?.[0];
  const tournamentWinnerId = finalMatch?.winner_id ?? null;

  const roundLabel = (r: number): string => {
    if (r === maxRound) return 'Final';
    if (r === maxRound - 1 && maxRound > 2) return 'Semis';
    return `Round ${r}`;
  };

  return (
    <div className="bg-[#0d0d0d] min-h-full pb-10">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Bracket</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
          style={{
            backgroundColor: data.tournament.status === 'completed' ? '#052E16' : '#1a1a3a',
            color: data.tournament.status === 'completed' ? '#34D399' : '#93C5FD',
          }}
        >
          {data.tournament.status}
        </span>
      </div>

      {tournamentWinnerId && (
        <div
          className="mx-4 mb-4 rounded-xl flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: MERLOT_DIM }}
        >
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Tournament Winner</p>
            <p className="text-sm font-bold" style={{ color: MERLOT_TEXT }}>
              {getName(tournamentWinnerId)}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: rounds.length * 180 }}>
          {rounds.map((round) => (
            <div key={round} style={{ width: 168, flexShrink: 0 }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 text-center">
                {roundLabel(round)}
              </p>
              <div
                className="flex flex-col"
                style={{ height: colHeight, justifyContent: 'space-evenly' }}
              >
                {(data.bracket[round] ?? []).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    getName={getName}
                    tournamentWinnerId={tournamentWinnerId}
                    score={scores[match.id] ?? { p1: '', p2: '' }}
                    onScoreChange={(player, val) =>
                      setScores((prev) => ({
                        ...prev,
                        [match.id]: { ...(prev[match.id] ?? { p1: '', p2: '' }), [player]: val },
                      }))
                    }
                    onSubmit={() => submitResult(match)}
                    submitting={submitting === match.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  getName,
  tournamentWinnerId,
  score,
  onScoreChange,
  onSubmit,
  submitting,
}: {
  match: TournamentMatch;
  getName: (id: string | null) => string;
  tournamentWinnerId: string | null;
  score: { p1: string; p2: string };
  onScoreChange: (player: 'p1' | 'p2', val: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const isBye = match.status === 'bye';
  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';
  const canSubmit = isPending && match.player1_id !== null && match.player2_id !== null;

  const p1IsWinner = match.winner_id !== null && match.winner_id === match.player1_id;
  const p2IsWinner = match.winner_id !== null && match.winner_id === match.player2_id;
  const p1IsTournamentWinner = tournamentWinnerId !== null && match.player1_id === tournamentWinnerId;
  const p2IsTournamentWinner = tournamentWinnerId !== null && match.player2_id === tournamentWinnerId;

  const submitDisabled =
    submitting ||
    score.p1 === '' ||
    score.p2 === '' ||
    isNaN(parseInt(score.p1, 10)) ||
    isNaN(parseInt(score.p2, 10)) ||
    parseInt(score.p1, 10) === parseInt(score.p2, 10);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
    >
      {isBye ? (
        <div className="px-3 py-2.5">
          <p className="text-sm font-semibold text-white truncate">{getName(match.player1_id)}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Auto-advance ›
          </p>
        </div>
      ) : (
        <>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              borderLeft: p1IsWinner ? `3px solid ${MERLOT}` : '3px solid transparent',
              backgroundColor: p1IsWinner ? '#1f1218' : 'transparent',
            }}
          >
            <span
              className="text-sm font-semibold truncate flex-1 mr-1"
              style={{ color: p1IsWinner ? MERLOT_TEXT : match.player1_id ? 'white' : '#6B7280' }}
            >
              {p1IsTournamentWinner && <span className="mr-1">🏆</span>}
              {getName(match.player1_id)}
            </span>
            {isCompleted ? (
              <span
                className="text-sm font-bold min-w-[20px] text-right"
                style={{ color: p1IsWinner ? MERLOT_TEXT : '#6B7280' }}
              >
                {match.player1_score ?? '-'}
              </span>
            ) : canSubmit ? (
              <input
                type="number"
                min="0"
                value={score.p1}
                onChange={(e) => onScoreChange('p1', e.target.value)}
                className="w-10 text-center text-sm rounded text-white outline-none py-0.5"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              />
            ) : null}
          </div>

          <div style={{ height: 1, backgroundColor: '#2a2a2a', marginLeft: 12, marginRight: 12 }} />

          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              borderLeft: p2IsWinner ? `3px solid ${MERLOT}` : '3px solid transparent',
              backgroundColor: p2IsWinner ? '#1f1218' : 'transparent',
            }}
          >
            <span
              className="text-sm font-semibold truncate flex-1 mr-1"
              style={{ color: p2IsWinner ? MERLOT_TEXT : match.player2_id ? 'white' : '#6B7280' }}
            >
              {p2IsTournamentWinner && <span className="mr-1">🏆</span>}
              {getName(match.player2_id)}
            </span>
            {isCompleted ? (
              <span
                className="text-sm font-bold min-w-[20px] text-right"
                style={{ color: p2IsWinner ? MERLOT_TEXT : '#6B7280' }}
              >
                {match.player2_score ?? '-'}
              </span>
            ) : canSubmit ? (
              <input
                type="number"
                min="0"
                value={score.p2}
                onChange={(e) => onScoreChange('p2', e.target.value)}
                className="w-10 text-center text-sm rounded text-white outline-none py-0.5"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              />
            ) : null}
          </div>

          {canSubmit && (
            <div className="px-3 pb-2.5 pt-1">
              <button
                onClick={onSubmit}
                disabled={submitDisabled}
                className="w-full rounded-lg py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: MERLOT }}
              >
                {submitting ? 'Saving...' : 'Submit Result'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
