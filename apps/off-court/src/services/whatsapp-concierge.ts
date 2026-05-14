import Anthropic from '@anthropic-ai/sdk';
import { redisClient } from './redis-client.js';
import {
  handleBalanceFlow,
  handleBookFlow,
  handleFindGameFlow,
  handleRSVPFlow,
  handlePrefsFlow,
} from './whatsapp-flows.js';

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

const CONV_TTL_SECONDS = 24 * 60 * 60;

interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Intent = 'BALANCE' | 'BOOK' | 'FIND_GAME' | 'RSVP' | 'PREFS';

function detectIntent(text: string): Intent | null {
  const t = text.toLowerCase();

  // Multi-word phrases checked before single keywords to avoid partial matches
  if (/find.*game|join.*game|open.*game|looking.*for.*player/.test(t)) return 'FIND_GAME';
  if (/sign[\s-]?up/.test(t)) return 'RSVP';
  if (/how\s+much/.test(t)) return 'BALANCE';
  if (/\b(balance|credits)\b/.test(t)) return 'BALANCE';
  if (/\b(book|reserve|court|padel|cricket|play)\b/.test(t)) return 'BOOK';
  if (/\b(event|rsvp|interested)\b/.test(t)) return 'RSVP';
  if (/\bnotifications?\b|\bpreferences?\b|\bsettings\b|\balerts?\b/.test(t)) return 'PREFS';

  return null;
}

async function routeIntent(intent: Intent, from: string): Promise<string> {
  switch (intent) {
    case 'BALANCE':   return handleBalanceFlow(from);
    case 'BOOK':      return handleBookFlow(from);
    case 'FIND_GAME': return handleFindGameFlow(from);
    case 'RSVP':      return handleRSVPFlow(from);
    case 'PREFS':     return handlePrefsFlow(from);
  }
}

function buildMemberContext(from: string): string {
  // Placeholder values — replace with real DB lookups once member service is wired
  return `Member phone: ${from}
Name: Alex
Credit balance: 120 credits
Tier: Gold
Segment: regular
Days since last visit: 3
Last booking: Court 4 – Padel, 2026-05-10
Crews: The Sunday Crew, Padel Mates
Preferences: padel, morning slots
Voice preference: casual
Upcoming bookings: Court 2 – Padel, 2026-05-15 08:00
Referral count: 2`;
}

const SYSTEM_PROMPT = (memberContext: string) => `You are the Off Court concierge. You are NOT Claude or an AI assistant — you are the Off Court concierge.

Always use first-person plural ("we", "our", "let's"). Keep replies warm, concise, and limited to 2–4 sentences. Be actionable and celebratory. NEVER use guilt or pressure. Only suggest next steps when the member has asked or the context clearly calls for it (user-initiated-first).

Member context:
${memberContext}`;

export async function processMessage(from: string, messageText: string): Promise<string> {
  const redisKey = `whatsapp:conv:${from}`;

  const raw = await redisClient.get(redisKey);
  const history: ConvMessage[] = raw ? (JSON.parse(raw) as ConvMessage[]) : [];

  history.push({ role: 'user', content: messageText });

  const intent = detectIntent(messageText);
  let reply: string;

  if (intent !== null) {
    reply = await routeIntent(intent, from);
  } else {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT(buildMemberContext(from)),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    const replyBlock = response.content[0];
    reply = replyBlock?.type === 'text' ? replyBlock.text : 'Sorry, something went wrong.';
  }

  history.push({ role: 'assistant', content: reply });

  await redisClient.set(redisKey, JSON.stringify(history), 'EX', CONV_TTL_SECONDS);

  return reply;
}
