# Meta / WhatsApp Business API — Registration Checklist

## 1. Meta Business Account
- [ ] Create a Meta Business Account at <https://business.facebook.com>
- [ ] Verify the business (legal name, address, phone number)

## 2. Meta App Setup
- [ ] Go to <https://developers.facebook.com> → **My Apps → Create App**
- [ ] Select app type: **Business**
- [ ] Name the app (e.g. `off-court-whatsapp`)

## 3. Add WhatsApp Product
- [ ] In the app dashboard select **Add Product → WhatsApp**
- [ ] Accept the WhatsApp Business API terms

## 4. Add Phone Number
- [ ] Under **WhatsApp → Getting Started**, add the Off Court business phone number
- [ ] Complete OTP verification for the number
- [ ] Confirm the number appears as **Connected** in the dashboard

## 5. Generate System User Token
- [ ] In **Meta Business Settings → System Users**, create a system user with `MANAGE` role
- [ ] Assign the WhatsApp app asset to the system user
- [ ] Generate a **permanent (never-expiring) access token** with scope `whatsapp_business_messaging`

## 6. Register Environment Variables
- [ ] Add `WHATSAPP_PHONE_NUMBER_ID` to `.env` (found in **WhatsApp → Getting Started**)
- [ ] Add `WHATSAPP_ACCESS_TOKEN` to `.env` (the system user token from step 5)

## 7. Webhook Configuration
- [ ] Set webhook URL to `https://offcourt.club/api/whatsapp/webhook`
- [ ] Set `WHATSAPP_VERIFY_TOKEN` in `.env` (any secure random string)
- [ ] Enter the same verify token in **WhatsApp → Configuration → Webhook → Verify Token**
- [ ] Click **Verify and Save** — the endpoint must respond `200 OK` with the hub.challenge

## 8. Webhook Subscriptions
- [ ] Subscribe to `messages` under **Webhook Fields**
- [ ] Subscribe to `messaging_postbacks` under **Webhook Fields**

## 9. Submit HSM Templates for Approval
Go to **WhatsApp → Message Templates → Create Template** and submit each of the following:

- [ ] `booking_confirmation` — UTILITY
- [ ] `game_reminder` — UTILITY
- [ ] `game_players` — UTILITY
- [ ] `post_game_highlights` — UTILITY
- [ ] `credit_balance_low` — UTILITY
- [ ] `event_invitation` — MARKETING
- [ ] `weekly_digest` — MARKETING
- [ ] `welcome_member` — UTILITY
- [ ] `reactivation_welcome_back` — UTILITY
- [ ] `referral_reward` — UTILITY

> Meta typically reviews templates within 24 h. MARKETING templates may require additional review.

## 10. Go Live Checklist
- [ ] Complete **Meta Business Verification** (upload business registration documents)
- [ ] Get **Display Name approval** for the WhatsApp sender name ("Off Court")
- [ ] Switch app from **Development** to **Live** mode in the app dashboard
- [ ] Test end-to-end with a real phone number via the **API Explorer** or production webhook
- [ ] Confirm all 10 templates show status **Approved** in the Message Templates dashboard
