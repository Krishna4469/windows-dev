import { Router } from 'express';
import type { RequestHandler } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ConfidentialClientApplication } from '@azure/msal-node';
import type { AuthorizationCodeRequest } from '@azure/msal-node';
import { handleGoogleCallback, handleMicrosoftCallback } from '../services/oauth.js';

const redirectBase = process.env['OAUTH_REDIRECT_BASE_URL'] ?? 'http://localhost:3002';

// ── Google (passport-google-oauth20 strategy) ─────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
      callbackURL: `${redirectBase}/api/auth/google/callback`,
    },
    (_at, _rt, profile, done) => done(null, profile),
  ),
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

// ── Microsoft (MSAL ConfidentialClientApplication) ────────────────────────────
// passport-azure-ad transitively requires the native bunyan/dtrace-provider
// build which is blocked by this workspace's pnpm onlyBuiltDependencies policy.
// @azure/msal-node is the Microsoft-recommended pure-JS alternative; we drive
// the OAuth2 authorization-code flow directly without a passport wrapper.

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env['MICROSOFT_CLIENT_ID'] ?? '',
    clientSecret: process.env['MICROSOFT_CLIENT_SECRET'] ?? '',
    authority: 'https://login.microsoftonline.com/common',
  },
});

const MS_REDIRECT_URI = `${redirectBase}/api/auth/microsoft/callback`;
const MS_SCOPES = ['user.read', 'openid', 'email', 'profile'];

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();
router.use(passport.initialize() as RequestHandler);

// Google — initiate
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }) as RequestHandler,
);

// Google — callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failWithError: true }) as RequestHandler,
  (async (req, res) => {
    const profile = req.user as {
      id: string;
      displayName?: string;
      emails?: { value: string }[];
    };
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value ?? '';
    const name = profile.displayName ?? email;
    try {
      const result = await handleGoogleCallback(googleId, email, name);
      res.json(result);
    } catch (err) {
      console.error('Google OAuth error:', err);
      res.status(500).json({ error: 'OAuth failed' });
    }
  }) as RequestHandler,
);

// Microsoft — initiate: redirect to Microsoft login
router.get('/microsoft', (async (_req, res) => {
  try {
    const url = await msalClient.getAuthCodeUrl({
      scopes: MS_SCOPES,
      redirectUri: MS_REDIRECT_URI,
    });
    res.redirect(url);
  } catch (err) {
    console.error('Microsoft OAuth initiate error:', err);
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
}) as RequestHandler);

// Microsoft — callback: exchange code for tokens, issue session
router.get('/microsoft/callback', (async (req, res) => {
  const { code, error } = req.query as { code?: string; error?: string };
  if (error ?? !code) {
    res.status(400).json({ error: error ?? 'No code provided' });
    return;
  }

  try {
    const tokenRequest: AuthorizationCodeRequest = {
      code,
      scopes: MS_SCOPES,
      redirectUri: MS_REDIRECT_URI,
    };
    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);

    const microsoftId = tokenResponse.uniqueId; // Azure AD Object ID (oid)
    const email = tokenResponse.account?.username ?? '';
    const name = tokenResponse.account?.name ?? email;

    const result = await handleMicrosoftCallback(microsoftId, email, name);
    res.json(result);
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err);
    res.status(500).json({ error: 'OAuth failed' });
  }
}) as RequestHandler);

export default router;
