import { sendTemplateMessage, type TemplateComponent } from './whatsapp-send.js';

export interface HsmTemplate {
  name: string;
  category: 'UTILITY' | 'MARKETING';
  language: string;
  description: string;
}

export const TEMPLATES = {
  booking_confirmation: {
    name: 'booking_confirmation',
    category: 'UTILITY',
    language: 'en',
    description: 'Sent immediately after a booking is created, with court, date, time, and credit deduction.',
  },
  game_reminder: {
    name: 'game_reminder',
    category: 'UTILITY',
    language: 'en',
    description: 'Reminder sent 24 h and 1 h before a booked session.',
  },
  game_players: {
    name: 'game_players',
    category: 'UTILITY',
    language: 'en',
    description: 'Lists confirmed players for an upcoming session so members know who they are playing with.',
  },
  post_game_highlights: {
    name: 'post_game_highlights',
    category: 'UTILITY',
    language: 'en',
    description: 'Post-session message with score, highlights link, and credit summary.',
  },
  credit_balance_low: {
    name: 'credit_balance_low',
    category: 'UTILITY',
    language: 'en',
    description: 'Alert when a member\'s credit balance falls below their configured threshold.',
  },
  event_invitation: {
    name: 'event_invitation',
    category: 'MARKETING',
    language: 'en',
    description: 'Invite members to an upcoming club event or tournament.',
  },
  weekly_digest: {
    name: 'weekly_digest',
    category: 'MARKETING',
    language: 'en',
    description: 'Monday morning digest of open courts, upcoming events, and crew activity.',
  },
  welcome_member: {
    name: 'welcome_member',
    category: 'UTILITY',
    language: 'en',
    description: 'Onboarding message sent when a new member account is activated.',
  },
  reactivation_welcome_back: {
    name: 'reactivation_welcome_back',
    category: 'UTILITY',
    language: 'en',
    description: 'Re-engagement message sent to lapsed members returning after 30+ days.',
  },
  referral_reward: {
    name: 'referral_reward',
    category: 'UTILITY',
    language: 'en',
    description: 'Notification that credits were awarded for a successful member referral.',
  },
} satisfies Record<string, HsmTemplate>;

export async function sendBookingConfirmation(
  to: string,
  bookingDetails: { courtName: string; date: string; time: string; creditsUsed: number },
): Promise<void> {
  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: bookingDetails.courtName },
        { type: 'text', text: bookingDetails.date },
        { type: 'text', text: bookingDetails.time },
        { type: 'text', text: String(bookingDetails.creditsUsed) },
      ],
    },
  ];
  await sendTemplateMessage(to, TEMPLATES.booking_confirmation.name, TEMPLATES.booking_confirmation.language, components);
}

export async function sendGameReminder(
  to: string,
  bookingDetails: { courtName: string; date: string; time: string },
): Promise<void> {
  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: bookingDetails.courtName },
        { type: 'text', text: bookingDetails.date },
        { type: 'text', text: bookingDetails.time },
      ],
    },
  ];
  await sendTemplateMessage(to, TEMPLATES.game_reminder.name, TEMPLATES.game_reminder.language, components);
}

export async function sendWelcomeMember(to: string, memberName: string): Promise<void> {
  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: [{ type: 'text', text: memberName }],
    },
  ];
  await sendTemplateMessage(to, TEMPLATES.welcome_member.name, TEMPLATES.welcome_member.language, components);
}
