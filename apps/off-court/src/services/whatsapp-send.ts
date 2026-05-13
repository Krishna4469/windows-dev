export interface TemplateComponent {
  type: string;
  parameters?: TemplateParameter[];
}

interface TemplateParameter {
  type: string;
  text?: string;
}

interface TextMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

interface TemplateMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: TemplateComponent[];
  };
}

type MessagePayload = TextMessagePayload | TemplateMessagePayload;

async function postToWhatsApp(payload: MessagePayload): Promise<void> {
  const phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'];
  const accessToken = process.env['WHATSAPP_ACCESS_TOKEN'];

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
  }
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  await postToWhatsApp({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[],
): Promise<void> {
  await postToWhatsApp({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}
