import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { sendTextMessage } from '../services/whatsapp-send.js';

export interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text';
  text: { body: string };
}

export interface WhatsAppInteractiveMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'interactive';
  interactive: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface WhatsAppUnsupportedMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<WhatsAppTextMessage | WhatsAppInteractiveMessage | WhatsAppUnsupportedMessage>;
      };
      field: string;
    }>;
  }>;
}

async function handleTextMessage(message: WhatsAppTextMessage): Promise<void> {
  console.log(`Text message from ${message.from}:`, message.text.body);
  await sendTextMessage(message.from, 'Got it');
}

async function handleInteractiveMessage(message: WhatsAppInteractiveMessage): Promise<void> {
  console.log(`Interactive message from ${message.from}:`, message.interactive);
}

async function handleUnsupported(message: WhatsAppUnsupportedMessage): Promise<void> {
  await sendTextMessage(message.from, 'We work best with text messages');
}

const router = Router();

router.get('/webhook', (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env['WHATSAPP_VERIFY_TOKEN']) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

router.post('/webhook', (req: Request, res: Response): void => {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env['WHATSAPP_APP_SECRET'];

  if (!secret || !signature || typeof signature !== 'string') {
    res.status(403).send('Forbidden');
    return;
  }

  const rawBody = req.body as Buffer;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    res.status(403).send('Forbidden');
    return;
  }

  // Return 200 immediately — Meta retries if it doesn't receive a timely 200
  res.status(200).send('OK');

  try {
    const payload = JSON.parse(rawBody.toString()) as WhatsAppWebhookPayload;
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        for (const message of change.value.messages ?? []) {
          if (message.type === 'text') {
            handleTextMessage(message as WhatsAppTextMessage).catch(console.error);
          } else if (message.type === 'interactive') {
            handleInteractiveMessage(message as WhatsAppInteractiveMessage).catch(console.error);
          } else {
            handleUnsupported(message).catch(console.error);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error processing WhatsApp webhook payload:', err);
  }
});

export default router;
