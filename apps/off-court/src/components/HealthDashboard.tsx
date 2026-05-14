import { useState, useEffect } from 'react';

const BG = '#0D0D11';
const CARD = '#18181F';
const BORDER = '#2A2A38';
const ROSE = '#E9B4BD';
const ROSE_DARK = '#6B2737';
const WHITE = '#F9FAFB';
const GRAY = '#6B7280';
const DEMO_MEMBER_ID = '00000000-0000-0000-0000-000000000001';

type WellnessScore = {
  activity: number;
  recovery: number;
  consistency: number;
  overall: number;
  insights: string[];
};

type HealthProfile = {
  fitness_level: string;
  health_goals: unknown[];
};

type TrendPoint = {
  week: string;
  type: string;
  avg: number;
  count: number;
};

const DEMO_SCORE: WellnessScore = {
  activity: 72,
  recovery: 58,
  consistency: 81,
  overall: 70,
  insights: [
    '7 games this month — aim for 8+ to reach your activity goal.',
    'Sleep average is 6.8h. Target 7-8h nightly for optimal recovery.',
    'Good momentum — stay active 3+ days per week to push your consistency score higher.',
  ],
};

const DEMO_PROFILE: HealthProfile = {
  fitness_level: 'intermediate',
  health_goals: ['Play 3× per week', 'Improve VO₂ max', 'Lose 5 kg by July'],
};

const DEMO_TRENDS: TrendPoint[] = [
  ...['2026-03-23', '2026-03-30', '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27', '2026-05-04', '2026-05-11'].map((week, i) => ({
    week, type: 'resting-hr', avg: [68, 70, 67, 71, 65, 69, 66, 68][i] ?? 68, count: 3,
  })),
  ...['2026-03-23', '2026-03-30', '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27', '2026-05-04', '2026-05-11'].map((week, i) => ({
    week, type: 'calories-burned', avg: [420, 380, 510, 290, 460, 500, 350, 440][i] ?? 400, count: 2,
  })),
  ...['2026-03-23', '2026-03-30', '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27', '2026-05-04', '2026-05-11'].map((week, i) => ({
    week, type: 'sleep-hours', avg: [7.2, 6.8, 7.5, 6.2, 7.0, 6.5, 7.8, 6.9][i] ?? 7, count: 5,
  })),
];

function scoreColor(score: number): string {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#FBBF24';
  if (score >= 40) return '#FB923C';
  return '#F87171';
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;
  const arc = Math.min(1, score / 100) * circumference;

  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BORDER} strokeWidth={10} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={ROSE}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${arc.toFixed(2)} ${circumference.toFixed(2)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={WHITE} fontSize={28} fontWeight="700">{score}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill={GRAY} fontSize={9} fontWeight="400" letterSpacing="1">WELLNESS</text>
    </svg>
  );
}

interface SparklineProps {
  values: number[];
  color: string;
  w?: number;
  h?: number;
}

function Sparkline({ values, color, w = 120, h = 40 }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={w} height={h}>
        <text x={4} y={h / 2 + 4} fill={GRAY} fontSize={9}>No data</text>
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(w - 2).toFixed(1)}
        cy={(h - 4 - ((values[values.length - 1] ?? min) - min) / range * (h - 8)).toFixed(1)}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

function fitnessBadge(level: string) {
  const map: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Beginner', color: '#60A5FA' },
    intermediate: { label: 'Intermediate', color: '#FBBF24' },
    advanced: { label: 'Advanced', color: '#4ADE80' },
  };
  return map[level] ?? { label: level, color: GRAY };
}

function SubScoreCard({ label, score, icon }: { label: string; score: number; icon: string }) {
  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 22;
  const arc = Math.min(1, score / 100) * circumference;

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1,
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <svg width={54} height={54} viewBox="0 0 54 54">
        <circle cx={27} cy={27} r={22} fill="none" stroke={BORDER} strokeWidth={5} />
        <circle cx={27} cy={27} r={22} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${arc.toFixed(2)} ${circumference.toFixed(2)}`}
          transform="rotate(-90 27 27)" />
        <text x={27} y={27} textAnchor="middle" dominantBaseline="middle" fill={WHITE} fontSize={12} fontWeight="700">{score}</text>
      </svg>
      <span style={{ color: GRAY, fontSize: 11, textAlign: 'center' }}>{label}</span>
    </div>
  );
}

export function HealthDashboard({ memberId = DEMO_MEMBER_ID }: { memberId?: string }) {
  const [score, setScore] = useState<WellnessScore>(DEMO_SCORE);
  const [profile, setProfile] = useState<HealthProfile>(DEMO_PROFILE);
  const [trends, setTrends] = useState<TrendPoint[]>(DEMO_TRENDS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [scoreRes, profileRes, trendsRes] = await Promise.all([
          fetch(`/api/health/score?member_id=${memberId}`),
          fetch(`/api/health/profile?member_id=${memberId}`),
          fetch(`/api/health/trends?member_id=${memberId}`),
        ]);
        if (scoreRes.ok) {
          const s = await scoreRes.json() as unknown;
          if (s && typeof s === 'object' && 'overall' in s) setScore(s as WellnessScore);
        }
        if (profileRes.ok) {
          const p = await profileRes.json() as unknown;
          if (p && typeof p === 'object' && 'fitness_level' in p) setProfile(p as HealthProfile);
        }
        if (trendsRes.ok) {
          const t = await trendsRes.json() as unknown;
          if (Array.isArray(t) && t.length > 0) setTrends(t as TrendPoint[]);
        }
      } catch {
        // keep demo data
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, [memberId]);

  const hrValues = trends.filter(t => t.type === 'resting-hr').map(t => t.avg);
  const calValues = trends.filter(t => t.type === 'calories-burned').map(t => t.avg);
  const sleepValues = trends.filter(t => t.type === 'sleep-hours').map(t => t.avg);

  const badge = fitnessBadge(profile.fitness_level);

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: WHITE, padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Health Analytics</div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>Your wellness at a glance</div>
        </div>
        <span style={{ background: ROSE_DARK, color: ROSE, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
          {badge.label}
        </span>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Wellness Score Ring */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: GRAY, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Overall Wellness Score</div>
          {loading ? (
            <div style={{ width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GRAY }}>…</div>
          ) : (
            <ScoreRing score={score.overall} />
          )}
          <div style={{ color: ROSE, fontSize: 12, fontWeight: 500 }}>
            {score.overall >= 80 ? 'Excellent' : score.overall >= 60 ? 'Good' : score.overall >= 40 ? 'Fair' : 'Needs work'}
          </div>
        </div>

        {/* Sub-score Cards */}
        <div style={{ display: 'flex', gap: 10 }}>
          <SubScoreCard label="Activity" score={score.activity} icon="⚡" />
          <SubScoreCard label="Recovery" score={score.recovery} icon="🌙" />
          <SubScoreCard label="Consistency" score={score.consistency} icon="📅" />
        </div>

        {/* Insights */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Insights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {score.insights.map((insight, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                <span style={{ color: GRAY, fontSize: 13, lineHeight: 1.5 }}>{insight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Sparklines */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>8-Week Trends</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Resting HR</div>
                <div style={{ fontSize: 11, color: GRAY }}>bpm</div>
              </div>
              <Sparkline values={hrValues} color="#F87171" />
            </div>
            <div style={{ height: 1, background: BORDER }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Calories Burned</div>
                <div style={{ fontSize: 11, color: GRAY }}>kcal</div>
              </div>
              <Sparkline values={calValues} color={ROSE} />
            </div>
            <div style={{ height: 1, background: BORDER }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Sleep</div>
                <div style={{ fontSize: 11, color: GRAY }}>hours</div>
              </div>
              <Sparkline values={sleepValues} color="#A78BFA" />
            </div>
          </div>
        </div>

        {/* Health Goals */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Health Goals</div>
          {profile.health_goals.length === 0 ? (
            <div style={{ color: GRAY, fontSize: 12 }}>No goals set. Update your profile to add goals.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profile.health_goals.map((goal, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: `2px solid ${ROSE}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: ROSE }} />
                  </div>
                  <span style={{ fontSize: 13, color: WHITE }}>{String(goal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fitness Level */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Fitness Level</div>
            <div style={{ fontSize: 11, color: GRAY, marginTop: 3 }}>Based on your profile</div>
          </div>
          <div style={{
            background: `${badge.color}22`,
            color: badge.color,
            border: `1px solid ${badge.color}44`,
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {badge.label}
          </div>
        </div>

      </div>
    </div>
  );
}
