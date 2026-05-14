import { Router } from 'express';
import { db } from '../db/client.js';
import { authSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendOTP, verifyOTP } from '../services/auth.js';
import { checkSystemHealth } from '../services/health-check.js';

const router = Router();

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: 'phone is required' });
    return;
  }
  try {
    await sendOTP(phone);
    res.json({ success: true });
  } catch (err) {
    console.error('sendOTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone || !otp) {
    res.status(400).json({ error: 'phone and otp are required' });
    return;
  }
  try {
    const result = await verifyOTP(phone, otp);
    if (!result) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }
    res.json({ token: result.token, memberId: result.memberId });
  } catch (err) {
    console.error('verifyOTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post('/logout', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(400).json({ error: 'No token provided' });
    return;
  }
  const token = auth.slice(7);
  await db.delete(authSessions).where(eq(authSessions.token, token));
  res.json({ success: true });
});

router.get('/health/detailed', async (_req, res) => {
  try {
    const health = await checkSystemHealth();
    res.json(health);
  } catch (err) {
    console.error('health check error:', err);
    res.json({ api: true, database: false, redis: false, whatsapp: false });
  }
});

export default router;
