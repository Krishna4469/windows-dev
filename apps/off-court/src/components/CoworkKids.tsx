import { useState } from 'react';

type MainTab = 'cowork' | 'kids';
type ActivityType = 'play' | 'class' | 'party';

interface BookedSlot {
  start_time: string;
  end_time: string;
}

interface CoworkRoom {
  id: string;
  venue_id: string;
  name: string;
  capacity: number;
  booked_slots: BookedSlot[];
}

const CREDITS_PER_HOUR = 5;
const KIDS_CREDITS: Record<ActivityType, number> = { play: 10, class: 15, party: 30 };
const KIDS_DURATIONS: Record<ActivityType, number> = { play: 60, class: 60, party: 120 };

const DEMO_MEMBER_ID = 'placeholder-member-id';
const DEMO_VENUE_ID = 'placeholder-venue-id';
const DEMO_KIDS_ROOM_ID = 'placeholder-room-id';

const OBSIDIAN = '#111118';
const CARD_BG = '#18181F';
const SURFACE = '#1C1C26';
const MERLOT = '#E9B4BD';
const MUTED = '#6B7280';
const FAINT = '#4B5563';
const SUCCESS = '#4ADE80';

function formatTime(hhmm: string): string {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function addHours(hhmm: string, hours: number): string {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const total = h * 60 + m + hours * 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function isConflicted(slotStart: string, slotEnd: string, booked: BookedSlot[]): boolean {
  return booked.some(({ start_time, end_time }) => slotStart < end_time && start_time < slotEnd);
}

const HOUR_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const h = 8 + i;
  const value = `${String(h).padStart(2, '0')}:00`;
  return { value, label: formatTime(value) };
});

export function CoworkKids() {
  const [tab, setTab] = useState<MainTab>('cowork');

  // ── Co-working ──────────────────────────────────────────────────
  const [coworkDate, setCoworkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rooms, setRooms] = useState<CoworkRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [availLoaded, setAvailLoaded] = useState(false);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [coworkNotes, setCoworkNotes] = useState('');
  const [bookingCowork, setBookingCowork] = useState(false);
  const [coworkMsg, setCoworkMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Kids zone ───────────────────────────────────────────────────
  const [actType, setActType] = useState<ActivityType>('play');
  const [kidsDate, setKidsDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [kidsTime, setKidsTime] = useState('10:00');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [bookingKids, setBookingKids] = useState(false);
  const [kidsMsg, setKidsMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
  const coworkCredits = selectedSlot ? durationHours * CREDITS_PER_HOUR : null;

  const checkAvailability = (): void => {
    setLoadingAvail(true);
    setAvailLoaded(false);
    setSelectedSlot(null);
    setCoworkMsg(null);
    fetch(`/api/cowork/availability?date=${coworkDate}&venue_id=${DEMO_VENUE_ID}`)
      .then((r) => r.json() as Promise<CoworkRoom[]>)
      .then((data) => {
        setRooms(data);
        setSelectedRoomId(data[0]?.id ?? null);
        setAvailLoaded(true);
        setLoadingAvail(false);
      })
      .catch(() => setLoadingAvail(false));
  };

  const handleBookCowork = (): void => {
    if (!selectedRoomId || !selectedSlot) return;
    const endTime = addHours(selectedSlot, durationHours);
    if (endTime > '20:00') {
      setCoworkMsg({ ok: false, text: 'Booking must end by 8:00 PM' });
      return;
    }
    setBookingCowork(true);
    setCoworkMsg(null);
    fetch('/api/cowork/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: DEMO_VENUE_ID,
        room_id: selectedRoomId,
        member_id: DEMO_MEMBER_ID,
        date: coworkDate,
        start_time: selectedSlot,
        end_time: endTime,
        notes: coworkNotes.trim() || null,
      }),
    })
      .then((r) => r.json() as Promise<{ error?: string; id?: string }>)
      .then((data) => {
        if (data.error) {
          setCoworkMsg({ ok: false, text: data.error });
        } else {
          setCoworkMsg({ ok: true, text: 'Desk booked!' });
          setSelectedSlot(null);
          setCoworkNotes('');
          checkAvailability();
        }
      })
      .catch(() => setCoworkMsg({ ok: false, text: 'Something went wrong' }))
      .finally(() => setBookingCowork(false));
  };

  const handleBookKids = (): void => {
    if (!childName.trim() || !childAge) {
      setKidsMsg({ ok: false, text: 'Child name and age are required' });
      return;
    }
    setBookingKids(true);
    setKidsMsg(null);
    const scheduledAt = new Date(`${kidsDate}T${kidsTime}:00`).toISOString();
    fetch('/api/kids/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: DEMO_VENUE_ID,
        room_id: DEMO_KIDS_ROOM_ID,
        member_id: DEMO_MEMBER_ID,
        child_name: childName.trim(),
        child_age: Number(childAge),
        activity_type: actType,
        scheduled_at: scheduledAt,
        duration_minutes: KIDS_DURATIONS[actType],
      }),
    })
      .then((r) => r.json() as Promise<{ error?: string; id?: string }>)
      .then((data) => {
        if (data.error) {
          setKidsMsg({ ok: false, text: data.error });
        } else {
          setKidsMsg({ ok: true, text: 'Activity booked!' });
          setChildName('');
          setChildAge('');
        }
      })
      .catch(() => setKidsMsg({ ok: false, text: 'Something went wrong' }))
      .finally(() => setBookingKids(false));
  };

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: OBSIDIAN }}>
      <h1 className="mb-1 text-xl font-semibold text-white">Co-Work & Kids</h1>
      <p className="mb-5 text-xs" style={{ color: MUTED }}>Work smart. Play hard.</p>

      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ backgroundColor: SURFACE }}>
        {(['cowork', 'kids'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
            style={tab === t ? { backgroundColor: MERLOT, color: OBSIDIAN } : { color: MUTED }}
          >
            {t === 'cowork' ? 'Co-Working' : 'Kids Zone'}
          </button>
        ))}
      </div>

      {/* ── CO-WORKING TAB ──────────────────────────────────────── */}
      {tab === 'cowork' && (
        <div className="flex flex-col gap-4">
          {/* Date picker */}
          <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
            <p className="mb-2 text-xs font-medium" style={{ color: MUTED }}>Select Date</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={coworkDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setCoworkDate(e.target.value);
                  setAvailLoaded(false);
                  setSelectedSlot(null);
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: SURFACE, color: '#FFFFFF', border: `1px solid ${FAINT}` }}
              />
              <button
                onClick={checkAvailability}
                disabled={loadingAvail}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
                style={{ backgroundColor: MERLOT, color: OBSIDIAN }}
              >
                {loadingAvail ? '...' : 'Check'}
              </button>
            </div>
          </div>

          {availLoaded && (
            <>
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <p className="text-2xl">🖥️</p>
                  <p className="text-sm" style={{ color: MUTED }}>No co-working desks available.</p>
                  <p className="text-xs" style={{ color: FAINT }}>Try another date.</p>
                </div>
              ) : (
                <>
                  {/* Room selector */}
                  {rooms.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {rooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => { setSelectedRoomId(room.id); setSelectedSlot(null); }}
                          className="shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors"
                          style={
                            selectedRoomId === room.id
                              ? { backgroundColor: MERLOT, color: OBSIDIAN }
                              : { backgroundColor: SURFACE, color: MUTED }
                          }
                        >
                          {room.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Duration selector */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
                    <p className="mb-2 text-xs font-medium" style={{ color: MUTED }}>Duration</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((h) => (
                        <button
                          key={h}
                          onClick={() => { setDurationHours(h); setSelectedSlot(null); }}
                          className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                          style={
                            durationHours === h
                              ? { backgroundColor: MERLOT, color: OBSIDIAN }
                              : { backgroundColor: SURFACE, color: MUTED }
                          }
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs" style={{ color: FAINT }}>
                      {CREDITS_PER_HOUR} credits / hour
                    </p>
                  </div>

                  {/* Time grid */}
                  {selectedRoom && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
                      <p className="mb-3 text-xs font-medium" style={{ color: MUTED }}>
                        Start Time — {selectedRoom.name}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {HOUR_SLOTS.filter(({ value }) => addHours(value, durationHours) <= '20:00').map(
                          ({ value, label }) => {
                            const slotEnd = addHours(value, durationHours);
                            const conflicted = isConflicted(value, slotEnd, selectedRoom.booked_slots);
                            const isSelected = selectedSlot === value;
                            return (
                              <button
                                key={value}
                                onClick={() => !conflicted && setSelectedSlot(isSelected ? null : value)}
                                disabled={conflicted}
                                className="rounded-lg py-2 text-xs font-medium transition-colors"
                                style={
                                  conflicted
                                    ? { backgroundColor: FAINT, color: MUTED, opacity: 0.45, cursor: 'not-allowed' }
                                    : isSelected
                                      ? { backgroundColor: MERLOT, color: OBSIDIAN }
                                      : { backgroundColor: SURFACE, color: '#FFFFFF' }
                                }
                              >
                                {label}
                              </button>
                            );
                          },
                        )}
                      </div>
                      {/* Legend */}
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: SURFACE }} />
                          <span className="text-xs" style={{ color: FAINT }}>Free</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: MERLOT }} />
                          <span className="text-xs" style={{ color: FAINT }}>Selected</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: FAINT, opacity: 0.45 }} />
                          <span className="text-xs" style={{ color: FAINT }}>Booked</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking panel */}
                  {selectedSlot && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
                      <p className="text-sm font-semibold text-white">
                        {formatTime(selectedSlot)} – {formatTime(addHours(selectedSlot, durationHours))}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: MUTED }}>{selectedRoom?.name}</p>

                      <textarea
                        placeholder="Notes (optional)"
                        value={coworkNotes}
                        onChange={(e) => setCoworkNotes(e.target.value)}
                        rows={2}
                        className="mt-3 w-full resize-none rounded-lg px-3 py-2 text-sm"
                        style={{ backgroundColor: SURFACE, color: '#FFFFFF', border: `1px solid ${FAINT}` }}
                      />

                      {coworkMsg && (
                        <p className="mt-2 text-xs" style={{ color: coworkMsg.ok ? SUCCESS : '#F87171' }}>
                          {coworkMsg.text}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-base font-semibold" style={{ color: MERLOT }}>
                          {coworkCredits} credits
                        </span>
                        <button
                          onClick={handleBookCowork}
                          disabled={bookingCowork}
                          className="rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-40"
                          style={{ backgroundColor: MERLOT, color: OBSIDIAN }}
                        >
                          {bookingCowork ? '...' : 'Book Desk'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── KIDS ZONE TAB ───────────────────────────────────────── */}
      {tab === 'kids' && (
        <div className="flex flex-col gap-4">
          {/* Activity type */}
          <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
            <p className="mb-2 text-xs font-medium" style={{ color: MUTED }}>Activity Type</p>
            <div className="flex gap-2">
              {(['play', 'class', 'party'] as const).map((act) => (
                <button
                  key={act}
                  onClick={() => setActType(act)}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-colors"
                  style={
                    actType === act
                      ? { backgroundColor: MERLOT, color: OBSIDIAN }
                      : { backgroundColor: SURFACE, color: MUTED }
                  }
                >
                  {act.charAt(0).toUpperCase() + act.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: FAINT }}>
              {KIDS_DURATIONS[actType]} min session · {KIDS_CREDITS[actType]} credits
            </p>
          </div>

          {/* Date & time */}
          <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
            <p className="mb-2 text-xs font-medium" style={{ color: MUTED }}>Date & Time</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={kidsDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setKidsDate(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: SURFACE, color: '#FFFFFF', border: `1px solid ${FAINT}` }}
              />
              <input
                type="time"
                value={kidsTime}
                onChange={(e) => setKidsTime(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: SURFACE,
                  color: '#FFFFFF',
                  border: `1px solid ${FAINT}`,
                  width: '6.5rem',
                }}
              />
            </div>
          </div>

          {/* Child details */}
          <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
            <p className="mb-3 text-xs font-medium" style={{ color: MUTED }}>Child Details</p>
            <input
              type="text"
              placeholder="Child's name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="mb-2 w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: SURFACE, color: '#FFFFFF', border: `1px solid ${FAINT}` }}
            />
            <input
              type="number"
              placeholder="Age (years)"
              value={childAge}
              min={1}
              max={16}
              onChange={(e) => setChildAge(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: SURFACE, color: '#FFFFFF', border: `1px solid ${FAINT}` }}
            />
          </div>

          {/* Book action */}
          <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG }}>
            {kidsMsg && (
              <p className="mb-3 text-xs" style={{ color: kidsMsg.ok ? SUCCESS : '#F87171' }}>
                {kidsMsg.text}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold" style={{ color: MERLOT }}>
                  {KIDS_CREDITS[actType]} credits
                </p>
                <p className="text-xs" style={{ color: FAINT }}>
                  {KIDS_DURATIONS[actType]} min session
                </p>
              </div>
              <button
                onClick={handleBookKids}
                disabled={bookingKids}
                className="rounded-lg px-6 py-2.5 text-sm font-medium disabled:opacity-40"
                style={{ backgroundColor: MERLOT, color: OBSIDIAN }}
              >
                {bookingKids ? '...' : 'Book Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
