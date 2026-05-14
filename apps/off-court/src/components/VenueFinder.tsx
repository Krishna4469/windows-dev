import { useState, useEffect } from 'react';

const BG      = '#0D0D11';
const CARD    = '#18181F';
const BORDER  = '#2a2a38';
const WHITE   = '#FFFFFF';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const MERLOT  = '#7A2233';
const MERLOT2 = '#9B2C3E';
const GREEN   = '#22C55E';
const AMBER   = '#F59E0B';
const BLUE    = '#3B82F6';

const API_KEY = (import.meta as unknown as { env: Record<string, string | undefined> }).env['VITE_GOOGLE_MAPS_API_KEY'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  live:          { color: GREEN, bg: GREEN  + '22', label: 'Live' },
  'coming-soon': { color: AMBER, bg: AMBER  + '22', label: 'Coming Soon' },
  prospect:      { color: BLUE,  bg: BLUE   + '22', label: 'Prospect' },
};

interface VenueLocation {
  id: string;
  venue_name: string;
  city: string;
  country: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string | null;
  whatsapp_number: string | null;
  status: string;
  sports: string[];
  amenities: string[];
  opening_hours: Record<string, string>;
  created_at: string;
  distance_km?: number;
}

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied';

function SportChip({ sport }: { sport: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: MERLOT + '33', color: MERLOT2, border: `1px solid ${MERLOT}44`,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {sport}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['prospect']!;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`,
    }}>
      {cfg.label}
    </span>
  );
}

function VenueCard({ venue }: { venue: VenueLocation }) {
  const lat = parseFloat(venue.latitude);
  const lng = parseFloat(venue.longitude);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(venue.venue_name)}`;
  const waUrl = venue.whatsapp_number
    ? `https://wa.me/${venue.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'm interested in ${venue.venue_name}`)}`
    : null;
  const sports = Array.isArray(venue.sports) ? (venue.sports as string[]) : [];

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: WHITE, fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{venue.venue_name}</div>
          <div style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>{venue.city}, {venue.country}</div>
          <div style={{ color: GRAY, fontSize: 12, marginTop: 4 }}>{venue.address}</div>
        </div>
        <StatusBadge status={venue.status} />
      </div>

      {venue.distance_km !== undefined && (
        <div style={{ color: MERLOT2, fontSize: 13, fontWeight: 600 }}>
          {venue.distance_km} km away
        </div>
      )}

      {sports.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sports.map((s) => <SportChip key={s} sport={s} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, background: MERLOT, color: WHITE, border: 'none', borderRadius: 10,
            padding: '10px 0', fontSize: 13, fontWeight: 700, textAlign: 'center',
            cursor: 'pointer', textDecoration: 'none', display: 'block',
          }}
        >
          Get Directions
        </a>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, background: '#128C7E', color: WHITE, border: 'none', borderRadius: 10,
              padding: '10px 0', fontSize: 13, fontWeight: 700, textAlign: 'center',
              cursor: 'pointer', textDecoration: 'none', display: 'block',
            }}
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

export default function VenueFinder() {
  const [venues, setVenues] = useState<VenueLocation[]>([]);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/venues')
      .then((r) => r.json())
      .then((data: VenueLocation[]) => setVenues(data))
      .catch(() => setError('Failed to load venues'));
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationState('denied');
      return;
    }
    setLocationState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationState('granted');
        setLoading(true);
        fetch(`/api/venues/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radiusKm=200`)
          .then((r) => r.json())
          .then((data: VenueLocation[]) => setVenues(data))
          .catch(() => setError('Failed to load nearby venues'))
          .finally(() => setLoading(false));
      },
      () => setLocationState('denied'),
    );
  }

  const mapCenterLat = userLat ?? 20.5937;
  const mapCenterLng = userLng ?? 78.9629;
  const mapZoom = userLat ? 9 : 5;

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '20px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: WHITE, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Find a Venue
          </h1>
          <p style={{ color: MUTED, fontSize: 14, margin: '6px 0 0' }}>
            Discover Off Court locations near you
          </p>
        </div>

        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
          padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {locationState === 'granted' ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
              <div>
                <div style={{ color: WHITE, fontSize: 14, fontWeight: 600 }}>Location detected</div>
                <div style={{ color: MUTED, fontSize: 12 }}>
                  {userLat?.toFixed(4)}, {userLng?.toFixed(4)}
                </div>
              </div>
            </>
          ) : locationState === 'denied' ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              <div style={{ color: MUTED, fontSize: 14 }}>Location access denied — showing all venues</div>
            </>
          ) : locationState === 'requesting' ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: AMBER, flexShrink: 0 }} />
              <div style={{ color: MUTED, fontSize: 14 }}>Requesting location…</div>
            </>
          ) : (
            <>
              <div style={{ flex: 1, color: MUTED, fontSize: 14 }}>Allow location to sort venues by distance</div>
              <button
                onClick={requestLocation}
                style={{
                  background: MERLOT, color: WHITE, border: 'none', borderRadius: 10,
                  padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Allow Location
              </button>
            </>
          )}
        </div>

        {API_KEY && (
          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 20, border: `1px solid ${BORDER}` }}>
            <iframe
              title="Venue Map"
              width="100%"
              height="280"
              style={{ display: 'block', border: 'none' }}
              src={`https://www.google.com/maps/embed/v1/view?key=${API_KEY}&center=${mapCenterLat},${mapCenterLng}&zoom=${mapZoom}&maptype=roadmap`}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {error && (
          <div style={{
            background: '#EF444422', border: '1px solid #EF444444', borderRadius: 10,
            padding: '12px 16px', color: '#EF4444', fontSize: 14, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
            Finding venues near you…
          </div>
        ) : venues.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
            No venues found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ color: GRAY, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
              {locationState === 'granted' ? ' nearby' : ' available'}
            </div>
            {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
