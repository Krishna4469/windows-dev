// Placeholder flow handlers — real DB queries wired in C4.

export async function handleBalanceFlow(_from: string): Promise<string> {
  return (
    'You have *120 credits* available — enough for 4 padel sessions.\n\n' +
    'View your full credit history: offcourt://credits'
  );
}

export async function handleBookFlow(_from: string): Promise<string> {
  return (
    'Available courts this week:\n\n' +
    '• *Court 2 – Padel* · Tomorrow 07:00\n' +
    '• *Court 4 – Padel* · Thu 09:00\n' +
    '• *Cricket Net A* · Sat 10:00\n\n' +
    'Book your slot: offcourt://book'
  );
}

export async function handleFindGameFlow(_from: string): Promise<string> {
  return (
    'Open games looking for players:\n\n' +
    '• *Padel Social* · Tue 18:00 · 1 spot left\n' +
    '• *Cricket Nets* · Wed 07:30 · 3 spots left\n\n' +
    'Jump in: offcourt://book?tab=find'
  );
}

export async function handleRSVPFlow(_from: string): Promise<string> {
  return (
    'Upcoming events:\n\n' +
    '• *Members Mixer* · Sat 17 May · Free\n' +
    '• *Padel Tournament* · Sun 25 May · 40 credits\n\n' +
    'RSVP now: offcourt://events'
  );
}

export async function handlePrefsFlow(_from: string): Promise<string> {
  return (
    'Your notification preferences:\n\n' +
    '• *Game Updates* — ON\n' +
    '• *Events* — ON\n' +
    '• *Club News* — ON\n' +
    '• *Offers* — ON\n\n' +
    'Reply with a preference name to toggle it (e.g. "Offers").'
  );
}
