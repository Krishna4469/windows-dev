import { sendTemplateMessage, type TemplateComponent } from './whatsapp-send.js';
import { TEMPLATES } from './whatsapp-templates.js';

// Placeholder: replace with real DB lookup once member service is wired
async function getMemberPhone(memberId: string): Promise<string> {
  console.log(`[auto-topup] phone lookup for member ${memberId} — using placeholder`);
  return `+971500000000`;
}

export async function checkAndTriggerAutoTopup(
  memberId: string,
  currentBalance: number,
  threshold: number,
  topupAmount: number,
): Promise<void> {
  if (currentBalance >= threshold) return;

  console.log(
    `[auto-topup] member=${memberId} balance=${currentBalance} below threshold=${threshold} — triggering top-up of ${topupAmount} credits`,
  );

  const phone = await getMemberPhone(memberId);

  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(currentBalance) },
        { type: 'text', text: String(threshold) },
        { type: 'text', text: String(topupAmount) },
      ],
    },
  ];

  await sendTemplateMessage(
    phone,
    TEMPLATES.credit_balance_low.name,
    TEMPLATES.credit_balance_low.language,
    components,
  );
}
