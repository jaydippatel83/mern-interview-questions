# 🔐 Authentication & Authorization — Interview Questions

> JWT · Sessions · OAuth · Refresh tokens · RBAC · Password security · MFA · Common attacks

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Password Security](#password-security)
3. [Sessions vs JWT](#sessions-vs-jwt)
4. [JWT Deep Dive](#jwt-deep-dive)
5. [Refresh Token Flow](#refresh-token-flow)
6. [OAuth 2.0 & OpenID Connect](#oauth-20--openid-connect)
7. [Authorization (RBAC/ABAC)](#authorization-rbacabac)
8. [Multi-Factor Authentication](#multi-factor-authentication)
9. [Common Attacks](#common-attacks)
10. [Full Implementation](#full-implementation)
11. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is the difference between authentication and authorization?

### Answer

- **Authentication (AuthN)** — *Who are you?* Verifying identity with credentials.
- **Authorization (AuthZ)** — *What are you allowed to do?* Checking permissions.

Authentication happens once per session; authorization happens on **every** request.

### Example

```js
// Authentication — verify identity, issue a credential
app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });   // ← generic message
  }
  const token = signToken(user);
  res.cookie('token', token, cookieOptions).json({ user: sanitise(user) });
});

// Authorization — check permission on every protected action
app.delete('/posts/:id', requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  const isOwner = post.authorId.equals(req.user.id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  await post.deleteOne();
  res.status(204).end();
});
```

**Interview Tip:** 401 = "I don't know who you are." 403 = "I know who you are, and you can't do this." Mixing them up is a small thing that interviewers notice.

**Common Mistakes:** Authenticating once and then trusting a client-side role flag. Authorization must be re-checked server-side on every request.

---

# Password Security

## How do you store passwords securely?

### Answer

Hash with a **slow, salted, adaptive** algorithm. Never encrypt (reversible), never hash with MD5/SHA (too fast — billions of guesses per second on a GPU).

### Example

```js
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';

// bcrypt — battle-tested, widely supported
const hash = await bcrypt.hash(password, 12);        // cost 12 ≈ 250ms
const valid = await bcrypt.compare(password, hash);  // constant-time internally

// argon2id — the current OWASP recommendation
const hash2 = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456,   // 19 MiB — resists GPU/ASIC attacks
  timeCost: 2,
  parallelism: 1,
});
const valid2 = await argon2.verify(hash2, password);
```

### Password policy (NIST 800-63B, current guidance)

```js
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .max(128, 'Too long')                       // prevent DoS via huge inputs
  .refine((p) => !commonPasswords.has(p.toLowerCase()), 'Password is too common')
  .refine((p) => !p.includes(email.split('@')[0]), "Can't contain your username");

// Check against breached password lists (k-anonymity — only 5 hash chars are sent)
async function isBreached(password) {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const [prefix, suffix] = [sha1.slice(0, 5), sha1.slice(5)];
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  return (await res.text()).includes(suffix);
}
```

### What NIST no longer recommends

- ❌ Forced periodic rotation (leads to `Password1`, `Password2`…)
- ❌ Complex composition rules (uppercase + symbol + digit)
- ✅ Longer minimums, breach checks, and MFA instead

**Interview Tip:** Say "bcrypt is fine, argon2id is better" and explain *why* slowness matters: hashing must be expensive enough that offline brute-forcing a stolen database is impractical. Cost 12 ≈ 250ms is the usual balance.

**Common Mistakes:** Storing a "password hint"; salting manually (bcrypt embeds the salt in the hash); returning different errors for "user not found" vs "wrong password" (user enumeration).

---

## How do you implement a secure password reset?

### Answer

```js
import crypto from 'node:crypto';

// 1. Request a reset
app.post('/forgot-password', authLimiter, async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // ALWAYS return the same response — never reveal whether the email exists
  const genericResponse = { message: 'If that email exists, a reset link has been sent' };
  if (!user) return res.json(genericResponse);

  // Generate a random token; store only its HASH
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetToken = hashedToken;
  user.resetTokenExpires = Date.now() + 15 * 60 * 1000;   // short window
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    html: `<a href="${process.env.APP_URL}/reset/${rawToken}">Reset password</a>`,
  });

  res.json(genericResponse);
});

// 2. Perform the reset
app.post('/reset-password/:token', async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetToken: hashedToken,
    resetTokenExpires: { $gt: Date.now() },
  });
  if (!user) return res.status(400).json({ error: 'Token is invalid or has expired' });

  user.password = await bcrypt.hash(req.body.password, 12);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  // Invalidate every existing session/refresh token
  await RefreshToken.deleteMany({ userId: user.id });

  await sendEmail({ to: user.email, subject: 'Your password was changed' });  // alert on compromise
  res.json({ message: 'Password reset successful' });
});
```

**Interview Tip:** Three details that mark a strong answer: store the **hash** of the reset token (so a DB leak can't be used to reset accounts), return an **identical response** whether or not the email exists, and **revoke all sessions** after a reset.

---

# Sessions vs JWT

## What is the difference between session-based and token-based auth?

### Answer

| | Session (stateful) | JWT (stateless) |
|---|---|---|
| Server storage | Session store (Redis/DB) | **None** |
| Client holds | Session ID (opaque) | The full signed token |
| Revocation | **Instant** — delete the session | Hard — needs a blocklist |
| Scaling | Needs a shared store | Scales trivially |
| Size | ~32 bytes | 200–1000+ bytes, sent every request |
| Data freshness | Always current (read from DB) | Stale until expiry |
| Cross-domain / mobile | Cookie limitations | Easy |
| Best for | Traditional web apps, admin panels | APIs, microservices, mobile |

### Example — sessions

```js
import session from 'express-session';
import RedisStore from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,                    // refresh expiry on each request
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.post('/login', async (req, res) => {
  const user = await verifyCredentials(req.body);
  req.session.regenerate((err) => {          // ⚠️ prevents session fixation
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.save(() => res.json({ user }));
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid').json({ message: 'Logged out' });
  });
});
```

**Interview Tip:** The honest answer to "JWT or sessions?" — *"JWTs are chosen for stateless scaling, but the moment you need instant revocation (logout everywhere, ban a user, role change) you add a Redis blocklist, and now you're stateful anyway. So for a single web app, sessions are often simpler and safer. JWTs earn their place with mobile clients and microservices."*

That nuance beats reciting a comparison table.

---

# JWT Deep Dive

## How does a JWT work?

### Answer

Three base64url-encoded parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ . SflKxwRJSMeKKF2QT4f
└─────────── header ───────────────┘   └────────── payload ──────────────┘   └──── signature ────┘
```

```js
// Header — algorithm and type
{ "alg": "HS256", "typ": "JWT" }

// Payload — registered + custom claims
{
  "sub": "user_123",          // subject (who)
  "iat": 1730000000,          // issued at
  "exp": 1730003600,          // expires
  "iss": "api.example.com",   // issuer
  "aud": "example.com",       // audience
  "jti": "unique-token-id",   // JWT ID — for revocation lists
  "role": "admin"             // custom claim
}

// Signature
HMACSHA256(base64url(header) + "." + base64url(payload), secret)
```

### Critical: the payload is only **encoded**, not encrypted

```js
// Anyone can read a JWT payload — no secret needed
JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
// Never put passwords, PII, or secrets in a JWT
```

### Example

```js
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m', issuer: 'api.example.com', audience: 'example.com', jwtid: crypto.randomUUID() }
);

try {
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],           // ⚠️ ALWAYS pin the algorithm
    issuer: 'api.example.com',
    audience: 'example.com',
  });
} catch (err) {
  if (err.name === 'TokenExpiredError') { /* 401, prompt refresh */ }
  if (err.name === 'JsonWebTokenError') { /* invalid signature */ }
}
```

### HS256 vs RS256

| | HS256 (symmetric) | RS256 (asymmetric) |
|---|---|---|
| Keys | One shared secret | Private signs, public verifies |
| Who can verify | Anyone with the secret (= can also forge) | Anyone with the public key |
| Best for | Single service | Microservices, third-party verifiers, OIDC |

**Interview Tip:** The **`alg: none` attack** — an attacker changes the header to `{"alg":"none"}` and strips the signature. Vulnerable libraries accepted it. That's why you must always pass `algorithms: ['HS256']` explicitly to `verify`. It's the classic JWT security question.

**Common Mistakes:** Storing JWTs in localStorage (XSS-readable); long expiry with no revocation; putting sensitive data in the payload; not validating `iss`/`aud`.

---

## Where should you store a JWT on the client?

### Answer

| Storage | XSS safe | CSRF risk | Works cross-domain | Verdict |
|---|---|---|---|---|
| `localStorage` | ❌ Any script reads it | None | ✅ | Avoid |
| `sessionStorage` | ❌ Same | None | ✅ | Avoid |
| Memory (a JS variable) | ✅ | None | ✅ | Good, but lost on refresh |
| `HttpOnly` cookie | ✅ | ⚠️ Needs `SameSite`/CSRF token | Harder | **Best** |

### The recommended pattern

```js
// Access token in memory, refresh token in an HttpOnly cookie
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,        // JS cannot read it → XSS-proof
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  path: '/api/auth/refresh',   // sent ONLY to the refresh endpoint
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
res.json({ accessToken });     // client keeps this in memory only
```

**Interview Tip:** "Store it in localStorage" is the answer most candidates give, and it's the wrong one. Any XSS — including from a compromised npm package — reads the whole token. `HttpOnly` cookies are unreadable by JavaScript by design.

---

# Refresh Token Flow

## How do refresh tokens work and why do you need them?

### Answer

Short-lived **access tokens** (15 min) limit the damage if one leaks. Long-lived **refresh tokens** (7–30 days) let the user stay logged in without re-entering credentials.

```
Login  → access (15m, memory) + refresh (7d, HttpOnly cookie, stored in DB)
API    → Authorization: Bearer <access>
401    → POST /refresh with the cookie → new access + ROTATED refresh
Logout → delete the refresh token from the DB + clear the cookie
```

### Example — with rotation and reuse detection

```js
// Model
const refreshTokenSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', index: true },
  tokenHash: { type: String, unique: true },
  family: String,                          // rotation family id
  expiresAt: { type: Date, index: { expires: 0 } },   // TTL auto-cleanup
  revokedAt: Date,
  userAgent: String,
  ip: String,
});

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function issueTokens(user, { family = crypto.randomUUID(), req } = {}) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 864e5),
    userAgent: req?.get('user-agent'),
    ip: req?.ip,
  });

  return { accessToken, refreshToken };
}

// Refresh endpoint with reuse detection
app.post('/api/auth/refresh', async (req, res) => {
  const raw = req.cookies.refreshToken;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(raw) });

  // 🚨 Token not found, or already used/revoked → possible theft
  if (!stored || stored.revokedAt) {
    if (stored?.family) {
      // Kill the WHOLE family — the legitimate user and the attacker both logged out
      await RefreshToken.updateMany({ family: stored.family }, { revokedAt: new Date() });
      logger.warn({ userId: stored.userId }, 'Refresh token reuse detected');
    }
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  if (stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  // Rotate: revoke the old, issue a new one in the same family
  stored.revokedAt = new Date();
  await stored.save();

  const user = await User.findById(stored.userId);
  const tokens = await issueTokens(user, { family: stored.family, req });

  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  res.json({ accessToken: tokens.accessToken });
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  const raw = req.cookies.refreshToken;
  if (raw) await RefreshToken.updateOne({ tokenHash: hashToken(raw) }, { revokedAt: new Date() });
  res.clearCookie('refreshToken').json({ message: 'Logged out' });
});

// Logout everywhere
app.post('/api/auth/logout-all', requireAuth, async (req, res) => {
  await RefreshToken.updateMany({ userId: req.user.id }, { revokedAt: new Date() });
  res.clearCookie('refreshToken').json({ message: 'Logged out on all devices' });
});
```

### Client-side auto-refresh

```js
// Axios interceptor — retry once on 401
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    original._retry = true;
    // Deduplicate — 10 concurrent 401s must trigger ONE refresh
    refreshPromise ??= api.post('/auth/refresh').finally(() => { refreshPromise = null; });

    try {
      const { data } = await refreshPromise;
      setAccessToken(data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      redirectToLogin();
      return Promise.reject(error);
    }
  }
);
```

**Interview Tip:** **Refresh token rotation with reuse detection** is the answer that separates senior candidates. If a stolen token is used after the legitimate one rotated, you detect it and revoke the entire family. Also mention deduplicating concurrent refresh calls on the client — a real bug people hit.

---

# OAuth 2.0 & OpenID Connect

## Explain the OAuth 2.0 Authorization Code flow with PKCE.

### Answer

OAuth 2.0 is for **delegated authorization** ("let this app read my Google Calendar"). OpenID Connect adds an identity layer on top (an `id_token` telling you *who* the user is).

```
User          Your App                Auth Server (Google)         API
 │               │                            │                     │
 │──Login────────>│                            │                     │
 │               │─ redirect + code_challenge ─>│                    │
 │<────────── consent screen ──────────────────│                     │
 │──approve─────────────────────────────────────>│                   │
 │<─ redirect back with ?code=xyz&state=abc ────│                    │
 │               │─ POST code + code_verifier ─>│                    │
 │               │<─ access_token + id_token ───│                    │
 │               │──── Bearer access_token ─────────────────────────>│
```

### Why PKCE?

Without it, an attacker who intercepts the authorization code (via a malicious app registered on the same URL scheme, or browser history) can exchange it for a token. PKCE binds the code to a secret only the original client knows.

### Example

```js
// 1. Start the flow
app.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');          // CSRF protection
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',     // get a refresh token
    prompt: 'consent',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// 2. Handle the callback
app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  // ⚠️ ALWAYS verify state — this is the CSRF protection
  if (!state || state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  delete req.session.oauthState;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: req.session.codeVerifier,
    }),
  });

  const { access_token, id_token } = await tokenRes.json();

  // Verify the id_token signature against Google's JWKS — don't just decode it
  const payload = await verifyGoogleIdToken(id_token);

  const user = await User.findOneAndUpdate(
    { googleId: payload.sub },
    { email: payload.email, name: payload.name, avatar: payload.picture },
    { upsert: true, new: true }
  );

  const tokens = await issueTokens(user, { req });
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  res.redirect('/dashboard');
});
```

### The grant types

| Grant | Use for |
|---|---|
| **Authorization Code + PKCE** | Web apps, SPAs, mobile — **the default** |
| Client Credentials | Machine-to-machine, no user |
| Refresh Token | Getting a new access token |
| ~~Implicit~~ | **Deprecated** — token in the URL fragment |
| ~~Password (ROPC)~~ | **Deprecated** — app sees the password |

**Interview Tip:** Two must-mention items: **`state` prevents CSRF** on the callback, and **PKCE is now recommended for all clients**, not just public/mobile ones. Also know that OAuth is *authorization*; OIDC is what gives you *authentication*.

---

# Authorization (RBAC/ABAC)

## How do you implement role and permission-based access control?

### Answer

```js
// RBAC — roles map to permissions
const PERMISSIONS = {
  viewer:    ['post:read'],
  editor:    ['post:read', 'post:create', 'post:update:own'],
  moderator: ['post:read', 'post:create', 'post:update', 'post:delete', 'comment:moderate'],
  admin:     ['*'],
};

const can = (user, permission, resource) => {
  const perms = PERMISSIONS[user.role] ?? [];
  if (perms.includes('*') || perms.includes(permission)) return true;

  // Ownership-scoped permission
  const ownPerm = `${permission}:own`;
  if (perms.includes(ownPerm) && resource?.ownerId?.toString() === user.id) return true;

  return false;
};

// Middleware
const requirePermission = (permission) => async (req, res, next) => {
  let resource = null;
  if (req.params.id) resource = await loadResource(req.baseUrl, req.params.id);

  if (!can(req.user, permission, resource)) {
    logger.warn({ userId: req.user.id, permission }, 'Authorization denied');
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.resource = resource;
  next();
};

router.delete('/posts/:id', requireAuth, requirePermission('post:delete'), deletePost);

// ABAC — attribute-based, for more complex rules
const policies = {
  'document:read': (user, doc) =>
    doc.isPublic ||
    doc.ownerId === user.id ||
    doc.sharedWith.includes(user.id) ||
    (doc.departmentId === user.departmentId && user.clearanceLevel >= doc.classification),
};
```

### Multi-tenant isolation

```js
// Every query MUST be scoped by tenant — the #1 SaaS security bug
const tenantScope = (req) => ({ tenantId: req.user.tenantId });

const orders = await Order.find({ ...tenantScope(req), status: 'pending' });

// Even better: enforce it at the ORM layer so it can't be forgotten
orderSchema.pre(/^find/, function () {
  const tenantId = asyncLocalStorage.getStore()?.tenantId;
  if (tenantId) this.where({ tenantId });
});
```

**Interview Tip:** The strongest thing you can say here: *"I enforce tenant scoping at the data-access layer, not in each controller, because relying on every developer remembering it is how cross-tenant leaks happen."*

---

# Multi-Factor Authentication

## How do you implement TOTP-based 2FA?

### Answer

```js
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// 1. Enrol
app.post('/2fa/setup', requireAuth, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `MyApp (${req.user.email})`,
    length: 32,
  });

  // Store as PENDING until verified — don't lock the user out
  await User.findByIdAndUpdate(req.user.id, { twoFactorPendingSecret: secret.base32 });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ qrCode, manualEntryKey: secret.base32 });
});

// 2. Verify and activate
app.post('/2fa/verify', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('+twoFactorPendingSecret');

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorPendingSecret,
    encoding: 'base32',
    token: req.body.code,
    window: 1,                     // allow ±30s for clock drift
  });
  if (!valid) return res.status(400).json({ error: 'Invalid code' });

  // Generate single-use backup codes, stored hashed
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex')
  );

  await User.findByIdAndUpdate(req.user.id, {
    twoFactorSecret: user.twoFactorPendingSecret,
    twoFactorPendingSecret: undefined,
    twoFactorEnabled: true,
    backupCodes: await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10))),
  });

  res.json({ backupCodes, message: 'Save these codes — they will not be shown again' });
});

// 3. Login with 2FA — two steps
app.post('/login', async (req, res) => {
  const user = await verifyCredentials(req.body);

  if (user.twoFactorEnabled) {
    // Issue a short-lived token that ONLY allows completing 2FA
    const challengeToken = jwt.sign(
      { sub: user.id, scope: '2fa_pending' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.json({ requires2FA: true, challengeToken });
  }

  const tokens = await issueTokens(user, { req });
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions).json(tokens);
});

app.post('/login/2fa', twoFaLimiter, async (req, res) => {
  const payload = jwt.verify(req.body.challengeToken, process.env.JWT_SECRET);
  if (payload.scope !== '2fa_pending') return res.status(400).json({ error: 'Invalid token' });

  const user = await User.findById(payload.sub).select('+twoFactorSecret +backupCodes');

  let valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: req.body.code,
    window: 1,
  });

  // Fall back to a backup code (single use)
  if (!valid) {
    const index = await findMatchingBackupCode(user.backupCodes, req.body.code);
    if (index >= 0) {
      user.backupCodes.splice(index, 1);    // consume it
      await user.save();
      valid = true;
    }
  }

  if (!valid) return res.status(401).json({ error: 'Invalid code' });

  const tokens = await issueTokens(user, { req });
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions).json(tokens);
});
```

**Interview Tip:** Three details: rate-limit the 2FA endpoint hard (a 6-digit code is brute-forceable in ~1M tries), store backup codes **hashed** and consume them, and keep the secret **pending** until the first successful verification so a user can't lock themselves out.

---

# Common Attacks

## What attacks target authentication and how do you prevent them?

### Answer

| Attack | How it works | Prevention |
|---|---|---|
| **Brute force** | Guessing passwords | Rate limiting, lockout, CAPTCHA, MFA |
| **Credential stuffing** | Using leaked passwords from other sites | Breach checks, MFA, device fingerprinting |
| **Session fixation** | Attacker sets a known session ID before login | `session.regenerate()` on login |
| **Session hijacking** | Stealing a session cookie | `HttpOnly`, `Secure`, HTTPS, short TTL, bind to IP/UA |
| **CSRF** | Forged request using the victim's cookies | `SameSite`, CSRF tokens, check `Origin` |
| **XSS → token theft** | Script reads localStorage | `HttpOnly` cookies, CSP, escape output |
| **JWT `alg: none`** | Header changed to skip verification | Pin `algorithms` in `verify` |
| **JWT key confusion** | RS256 token verified as HS256 with the public key as secret | Pin algorithms, separate keys |
| **User enumeration** | Different responses for existing vs missing users | Identical messages and timing |
| **Timing attack** | Response time leaks comparison progress | `crypto.timingSafeEqual` |
| **Open redirect** | `?redirect=evil.com` after login | Allowlist redirect targets |

### Example — CSRF protection

```js
// 1. SameSite cookies — the first line of defence
res.cookie('token', jwt, { sameSite: 'strict', httpOnly: true, secure: true });
// 'strict' = never sent cross-site
// 'lax'    = sent on top-level GET navigation (usual default)
// 'none'   = always sent, REQUIRES Secure

// 2. Double-submit CSRF token
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken ||
      !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
});

// 3. Verify the Origin header
const allowedOrigins = ['https://app.example.com'];
app.use((req, res, next) => {
  if (req.method === 'GET') return next();
  const origin = req.get('origin') ?? req.get('referer');
  if (origin && !allowedOrigins.some((a) => origin.startsWith(a))) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  next();
});
```

### Example — preventing user enumeration

```js
// ❌ Leaks which emails are registered
if (!user) return res.status(404).json({ error: 'No account with that email' });
if (!match) return res.status(401).json({ error: 'Wrong password' });

// ✅ Identical response, and constant-ish timing
const user = await User.findOne({ email }).select('+password');
// Always run a hash comparison, even when the user doesn't exist
const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinvalidha';
const valid = await bcrypt.compare(password, user?.password ?? dummyHash);

if (!user || !valid) {
  return res.status(401).json({ error: 'Invalid email or password' });
}
```

**Interview Tip:** The dummy-hash trick for timing is a great detail. Without it, a missing user returns in 2ms and an existing user in 250ms — an attacker can enumerate your entire user list from response times alone.

---

# Full Implementation

## Complete auth module

```js
// ============ models/user.model.js ============
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'editor', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  passwordChangedAt: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
}, { timestamps: true });

// Hash on save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);  // token-safety margin
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Invalidate tokens issued before a password change
userSchema.methods.changedPasswordAfter = function (jwtIat) {
  if (!this.passwordChangedAt) return false;
  return jwtIat * 1000 < this.passwordChangedAt.getTime();
};

userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

// Never leak sensitive fields
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.twoFactorSecret;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);


// ============ middleware/auth.js ============
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies.accessToken ??
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) throw new UnauthorizedError('Not authenticated');

  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER,
  });

  const user = await User.findById(payload.sub);
  if (!user) throw new UnauthorizedError('User no longer exists');
  if (user.changedPasswordAfter(payload.iat)) {
    throw new UnauthorizedError('Password changed — please log in again');
  }
  if (user.isLocked()) throw new ForbiddenError('Account is locked');

  req.user = user;
  next();
});

// Optional auth — for endpoints that behave differently when logged in
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try { await requireAuth(req, res, () => {}); } catch { /* ignore */ }
  next();
});


// ============ controllers/auth.controller.js ============
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+password');

  if (user?.isLocked()) {
    throw new ForbiddenError(`Account locked. Try again in ${LOCK_MINUTES} minutes`);
  }

  const dummyHash = '$2a$12$' + 'x'.repeat(53);
  const valid = await bcrypt.compare(password, user?.password ?? dummyHash);

  if (!user || !valid) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
        user.failedLoginAttempts = 0;
        await sendEmail({ to: user.email, subject: 'Suspicious login attempts' });
      }
      await user.save();
    }
    throw new UnauthorizedError('Invalid email or password');
  }

  // Success — reset the counter
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();

  if (user.twoFactorEnabled) {
    return res.json({
      requires2FA: true,
      challengeToken: jwt.sign({ sub: user.id, scope: '2fa_pending' },
        process.env.JWT_SECRET, { expiresIn: '5m' }),
    });
  }

  const { accessToken, refreshToken } = await issueTokens(user, { req });

  res
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({ accessToken, user });
});
```

---

# Rapid Fire

**What is a salt and why does it matter?**
Random data mixed into the password before hashing so identical passwords produce different hashes, defeating rainbow tables. bcrypt generates and embeds it automatically.

**What is a pepper?**
A secret added to all passwords, stored outside the database (env var or HSM). Protects against a DB-only leak.

**Why 15-minute access tokens?**
Limits the damage window if one leaks. Refresh tokens keep the user logged in without weakening that.

**How do you revoke a JWT before it expires?**
Keep a Redis blocklist of `jti` values until their `exp`, or keep refresh tokens stateful and access tokens short.

**What is `SameSite`?**
Cookie attribute controlling cross-site sending. `Strict` (never), `Lax` (top-level GET navigation), `None` (always, requires `Secure`).

**What is the difference between `Secure` and `HttpOnly`?**
`Secure` = HTTPS only. `HttpOnly` = unreadable by JavaScript.

**What is a magic link?**
Passwordless login via a single-use, short-lived, hashed token emailed to the user.

**What are passkeys / WebAuthn?**
Public-key credentials bound to the device with biometric unlock. Phishing-resistant because the credential is tied to the origin. The strongest option available today.

**What is SSO?**
One login across multiple applications, usually via SAML or OIDC with a central identity provider.

**What is SAML vs OIDC?**
SAML is XML-based and enterprise-oriented; OIDC is JSON/JWT on top of OAuth 2.0 and better suited to modern web and mobile.

**What is a JWKS endpoint?**
`/.well-known/jwks.json` — publishes public keys so anyone can verify RS256 tokens, and supports key rotation.

**How do you handle key rotation?**
Publish multiple keys with `kid` in the JWT header; verifiers pick the matching key. Keep old keys until all tokens signed with them expire.

**Should you bind a session to an IP address?**
It stops some hijacking but breaks mobile users switching networks. Binding to the user agent is gentler; risk-based re-authentication is better.

**What is step-up authentication?**
Requiring stronger auth (MFA, password re-entry) for sensitive actions like changing an email or making a payment, even when already logged in.

**What is rate limiting per user vs per IP?**
Per-IP blocks distributed brute force but hurts users behind shared NAT. Per-account blocks targeted attacks. Do both.

**How do you log auth events safely?**
Log user id, IP, user agent, event type and outcome. **Never** log passwords, tokens, or full session ids.

**What is OWASP ASVS?**
The Application Security Verification Standard — a checklist of security requirements by assurance level. Good to name-drop with substance.

---

## 📌 Interview Checklist

- [ ] AuthN vs AuthZ, and 401 vs 403
- [ ] Why bcrypt/argon2 and not SHA-256?
- [ ] Sessions vs JWT — give the honest tradeoff, not a sales pitch
- [ ] Where do you store tokens on the client, and why not localStorage?
- [ ] Draw the refresh token rotation flow with reuse detection
- [ ] Explain the OAuth code flow and what `state` and PKCE prevent
- [ ] How do you revoke a JWT?
- [ ] Name five auth attacks and their mitigations
- [ ] How do you build a secure password reset?
- [ ] What is IDOR and how do you scope queries to prevent it?
