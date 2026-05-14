# Off Court — Launch Checklist

## Environment

- [ ] `DATABASE_URL` set and points to production PostgreSQL instance
- [ ] `REDIS_URL` set and points to production Redis instance
- [ ] `PORT` set (default 3002)
- [ ] `JWT_SECRET` set (minimum 32 characters, randomly generated)
- [ ] `WHATSAPP_ACCESS_TOKEN` set (Meta permanent token)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` set
- [ ] `WHATSAPP_VERIFY_TOKEN` set (matches webhook registration)
- [ ] `RAZORPAY_KEY_ID` set
- [ ] `RAZORPAY_KEY_SECRET` set
- [ ] `RAZORPAY_WEBHOOK_SECRET` set
- [ ] `MSG91_AUTH_KEY` set
- [ ] `MSG91_TEMPLATE_ID` set
- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set
- [ ] `MICROSOFT_CLIENT_ID` set
- [ ] `MICROSOFT_CLIENT_SECRET` set
- [ ] `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set (for AI features)
- [ ] Hetzner server provisioned and SSH access confirmed
- [ ] PostgreSQL 15+ running and accepting connections on port 5432
- [ ] Redis 7+ running and accepting connections on port 6379
- [ ] SSL certificate active (Let's Encrypt or equivalent, not expired)
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] PM2 ecosystem config (`ecosystem.config.js`) committed and correct
- [ ] `NODE_ENV=production` set in PM2 or system environment
- [ ] Firewall rules: ports 80, 443 open; 3002 restricted to localhost

## WhatsApp

- [ ] Meta Business account verified (green tick or standard verification)
- [ ] WhatsApp Business phone number registered and active
- [ ] Webhook URL registered: `https://yourdomain.com/api/whatsapp/webhook`
- [ ] Webhook verify token matches `WHATSAPP_VERIFY_TOKEN` env var
- [ ] Webhook fields subscribed: `messages`, `message_deliveries`, `messaging_postbacks`
- [ ] HSM template approved — **OTP / One-Time Password** (authentication category)
- [ ] HSM template approved — **Booking Confirmation** (utility category)
- [ ] HSM template approved — **Booking Reminder** (utility category)
- [ ] HSM template approved — **Booking Cancellation** (utility category)
- [ ] HSM template approved — **Payment Receipt** (utility category)
- [ ] HSM template approved — **Membership Welcome** (utility category)
- [ ] HSM template approved — **Membership Expiry Reminder** (utility category)
- [ ] HSM template approved — **Check-in Notification** (utility category)
- [ ] HSM template approved — **Event Invitation** (marketing category)
- [ ] HSM template approved — **Court Availability Alert** (utility category)
- [ ] All 10 HSM templates: status confirmed as APPROVED in Meta Business Manager
- [ ] WhatsApp echo test sent and received successfully

## Payments

- [ ] Razorpay account switched from test mode to live mode
- [ ] Razorpay KYC complete and account activated for live transactions
- [ ] Live Key ID and Key Secret copied into environment variables
- [ ] Razorpay webhook URL registered: `https://yourdomain.com/api/finance/razorpay-webhook`
- [ ] Razorpay webhook secret matches `RAZORPAY_WEBHOOK_SECRET` env var
- [ ] Webhook events subscribed: `payment.captured`, `payment.failed`, `refund.created`
- [ ] Test transaction of ₹1 completed successfully on live account
- [ ] Refund confirmed for test transaction

## Auth

- [ ] MSG91 OTP template approved (template ID matches `MSG91_TEMPLATE_ID`)
- [ ] MSG91 sender ID / DLT registration complete
- [ ] Google OAuth app in production mode (not test mode)
- [ ] Google OAuth redirect URI added: `https://yourdomain.com/api/auth/google/callback`
- [ ] Microsoft Azure app registration in production tenant
- [ ] Microsoft OAuth redirect URI added: `https://yourdomain.com/api/auth/microsoft/callback`
- [ ] Staff auth PIN/password system tested with at least one staff account
- [ ] OTP flow tested end-to-end: send → receive SMS → verify → token issued

## Data

- [ ] Database migrations applied (`drizzle-kit push` or `migrate`)
- [ ] Seed script run for **GF (Ground Floor)** rooms — all court names, capacities, rates correct
- [ ] Seed script run for **1F (First Floor)** rooms — all court names, capacities, rates correct
- [ ] Chart of accounts seeded (`seed-accounts.ts` run successfully)
- [ ] At least one **venue location** record seeded with correct name, address, coordinates
- [ ] Compliance checks seeded (safety, fire, electrical, equipment certifications)
- [ ] At least one admin member account created
- [ ] At least one staff account created and tested
- [ ] Pricing tiers configured per court type and time slot

## Testing

- [ ] `GET /health` returns `{"status":"ok"}` with HTTP 200
- [ ] `GET /api/auth/health/detailed` returns all four status booleans
- [ ] OTP flow tested: `/api/auth/send-otp` → SMS received → `/api/auth/verify-otp` returns token
- [ ] Booking flow tested: slot search → create booking → payment → confirmation
- [ ] WhatsApp echo tested: incoming message received and processed without error
- [ ] Razorpay payment webhook tested (use Razorpay test webhook feature in dashboard)
- [ ] Check-in flow tested: member QR scan → check-in recorded → WhatsApp notification sent
- [ ] Google OAuth tested: redirect → consent → callback → token issued
- [ ] Microsoft OAuth tested: redirect → consent → callback → token issued
- [ ] Staff login tested: PIN → JWT → dashboard access
- [ ] `GET /api/health` (wellness) returns data for a test member
- [ ] Socket.IO connection established from browser without errors
- [ ] Display CMS: screen registered, content pushed, display updated

## Launch Day

- [ ] `pm2 start ecosystem.config.js` — off-court process running and status `online`
- [ ] `pm2 save` — process list persisted across reboots
- [ ] `pm2 startup` — PM2 set to auto-start on server reboot
- [ ] nginx config updated: proxy `api.*` or `/api/` to `localhost:3002`
- [ ] nginx config updated: serve Vite build from `/dist` for all other routes
- [ ] nginx reloaded: `nginx -t && systemctl reload nginx`
- [ ] DNS A record pointing `yourdomain.com` to Hetzner server IP
- [ ] DNS propagation confirmed (check with `dig +short yourdomain.com`)
- [ ] SSL certificate renewed or auto-renewal (certbot) confirmed active
- [ ] HTTPS redirect in nginx (port 80 → 301 → 443)
- [ ] `pm2 logs off-court` checked — no startup errors, no uncaught exceptions
- [ ] Health check from external network: `curl https://yourdomain.com/health`
- [ ] Team briefed on: admin dashboard URL, staff login URL, WhatsApp test number
- [ ] On-call escalation path documented and shared with team
- [ ] Rollback plan documented: previous build tag, `pm2 reload` command
