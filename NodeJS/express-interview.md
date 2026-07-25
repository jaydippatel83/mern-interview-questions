# 🚂 Express.js Interview Questions

> Middleware · Routing · Error handling · REST API design · Validation · Security · Testing

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Middleware](#middleware)
3. [Routing](#routing)
4. [Request & Response](#request--response)
5. [Error Handling](#error-handling)
6. [REST API Design](#rest-api-design)
7. [Validation](#validation)
8. [File Uploads](#file-uploads)
9. [Security](#security)
10. [Project Structure](#project-structure)
11. [Testing](#testing)
12. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is Express.js?

### Answer

A minimal, unopinionated web framework for Node. It wraps the `http` module with routing, middleware, and helpers for requests and responses.

### Why do we use it?

Plain Node's `http` module gives you a raw request and response — you'd write your own router, body parser, and error handling. Express gives you all of that in a few lines, plus a huge middleware ecosystem.

### Example

```js
// Plain Node
import http from 'node:http';

http.createServer((req, res) => {
  if (req.url === '/users' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(3000);

// Express
import express from 'express';
const app = express();

app.use(express.json());
app.get('/users', (req, res) => res.json(users));
app.listen(3000);
```

### Express vs the alternatives

| | Express | Fastify | NestJS | Koa | Hono |
|---|---|---|---|---|---|
| Style | Minimal, middleware | Minimal, schema-first | Opinionated, DI + decorators | Minimal, async-first | Edge-first, tiny |
| Performance | Baseline | ~2–3× faster | Similar to Express | Similar | Very fast |
| Learning curve | Low | Low | High | Low | Low |
| Best for | Most APIs, huge ecosystem | High throughput | Large enterprise teams | Custom stacks | Edge/serverless |

**Interview Tip:** Express 5 finally shipped (2024) after years in beta. The headline change: **async errors are caught automatically** — no more `express-async-handler` wrappers. Mentioning that shows you're current.

---

# Middleware

## What is middleware and how does it work?

### Answer

A function with access to `(req, res, next)` that runs in the order it was registered. It can modify the request/response, end the cycle, or call `next()` to pass control on.

```
Request → [logger] → [cors] → [json parser] → [auth] → [route handler] → Response
             ↓ next()   ↓ next()    ↓ next()      ↓ next()
```

### Types

```js
// 1. Application-level
app.use(logger);
app.use('/api', apiRoutes);

// 2. Router-level
const router = express.Router();
router.use(requireAuth);

// 3. Route-level — an array of handlers
app.get('/admin', requireAuth, requireRole('admin'), handler);

// 4. Built-in
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', { maxAge: '1d' }));

// 5. Third-party
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// 6. Error-handling — FOUR arguments, always registered LAST
app.use((err, req, res, next) => { … });
```

### Example — writing middleware

```js
// Request logger with timing
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: ms.toFixed(1),
    });
  });

  next();
}

// Auth middleware
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token ?? req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('-password');
    if (!req.user) return res.status(401).json({ error: 'User no longer exists' });

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    next(err);
  }
}

// Role-based authorization — a middleware factory
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/admin/users', requireAuth, requireRole('admin', 'owner'), listUsers);
```

**Interview Tip:** **Order matters absolutely.** `app.use(express.json())` must come before any route that reads `req.body`. Error handlers must come last. Getting the order wrong is the most common Express bug.

**Common Mistakes:** Forgetting `next()` — the request hangs until the client times out. Or calling `next()` *and* sending a response, which produces "Cannot set headers after they are sent".

---

## What is the difference between `next()`, `next(err)` and `return next()`?

### Answer

```js
next();           // pass to the next middleware
next(err);        // SKIP all normal middleware, jump to the error handler
next('route');    // skip remaining handlers in THIS route, go to the next matching route
return next();    // pass control AND stop executing this function
```

### Example

```js
// ❌ Bug — code after next() still runs
function middleware(req, res, next) {
  if (!req.user) {
    next(new Error('Unauthorized'));    // no return!
  }
  console.log(req.user.name);           // 💥 TypeError — still executes
}

// ✅
function middleware(req, res, next) {
  if (!req.user) return next(new Error('Unauthorized'));
  console.log(req.user.name);
}

// next('route') — skip to the next route definition
app.get('/user/:id',
  (req, res, next) => {
    if (req.params.id === '0') return next('route');   // skip to the handler below
    next();
  },
  (req, res) => res.send('regular user')
);
app.get('/user/:id', (req, res) => res.send('special user'));
```

**Interview Tip:** Always `return next(...)`. It's the single most common source of "Cannot set headers after they are sent to the client".

---

## How do you handle async errors in Express?

### Answer

```js
// Express 4 — async rejections are NOT caught, the request hangs
app.get('/users', async (req, res) => {
  const users = await db.query();     // if this throws → unhandled rejection
  res.json(users);
});

// Fix 1: a wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  res.json(await db.query());
}));

// Fix 2: express-async-errors — patches Express globally
import 'express-async-errors';

// Fix 3: Express 5 — handles it natively ✅
app.get('/users', async (req, res) => {
  res.json(await db.query());     // rejections go to the error handler automatically
});
```

**Interview Tip:** This is *the* classic Express interview question. Say: "In Express 4 I wrap handlers with an asyncHandler; Express 5 does it natively." Both halves matter.

---

# Routing

## How does routing work in Express?

### Answer

```js
// HTTP methods
app.get('/users', handler);
app.post('/users', handler);
app.put('/users/:id', handler);
app.patch('/users/:id', handler);
app.delete('/users/:id', handler);
app.all('/users', handler);            // every method

// Route parameters
app.get('/users/:id/posts/:postId', (req, res) => {
  const { id, postId } = req.params;
});

// Optional and patterns (Express 4 syntax)
app.get('/files/:name?', handler);
app.get('/ab*cd', handler);
app.get(/^\/users\/(\d+)$/, handler);   // regex

// Chaining on one path
app.route('/books')
  .get(listBooks)
  .post(createBook)
  .put(replaceBooks);

// Routers for modularity
// routes/users.js
const router = express.Router({ mergeParams: true });
router.use(requireAuth);                  // applies to the whole router
router.get('/', listUsers);
router.get('/:id', getUser);
export default router;

// app.js
app.use('/api/v1/users', usersRouter);

// param middleware — runs whenever :id appears
router.param('id', async (req, res, next, id) => {
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  req.foundUser = user;                   // fetched once, reused by all handlers
  next();
});

// 404 — after all routes
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
```

**Interview Tip:** `mergeParams: true` is required when a nested router needs the parent's params — e.g. `/users/:userId/posts` where the posts router needs `userId`. Forgetting it gives you an undefined param.

**Common Mistakes:** Defining `/users/:id` before `/users/new` — `:id` matches "new" first. Static routes must come before dynamic ones.

---

# Request & Response

## What are the key properties of `req` and `res`?

### Answer

```js
// Request
req.params        // /users/:id → { id: '123' }
req.query         // ?page=2&sort=name → { page: '2', sort: 'name' }
req.body          // parsed body (needs express.json() or urlencoded)
req.headers       // all headers (lowercased keys)
req.get('Content-Type');
req.cookies       // needs cookie-parser
req.signedCookies
req.method        // 'GET'
req.originalUrl   // '/api/users?page=2'
req.path          // '/api/users'
req.protocol      // 'http' | 'https'
req.hostname
req.ip            // needs app.set('trust proxy', 1) behind a load balancer
req.secure        // boolean
req.xhr
req.files         // needs multer

// Response
res.status(201).json({ data });
res.send('text');
res.sendFile(path.join(__dirname, 'file.pdf'));
res.download('/report.pdf', 'monthly-report.pdf');
res.redirect(301, '/new-url');
res.set('X-Custom', 'value');
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  signed: true,
});
res.clearCookie('token');
res.type('application/json');
res.end();
res.locals.user = req.user;    // available in templates & later middleware

// Chaining
res.status(201).set('Location', `/users/${id}`).json(user);
```

**Interview Tip:** Behind a proxy (Nginx, ALB, Cloudflare), `req.ip` returns the proxy's IP unless you set `app.set('trust proxy', 1)`. That silently breaks rate limiting — everyone shares one bucket.

---

# Error Handling

## How do you structure error handling in Express?

### Answer

```js
// 1. Error classes
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') { super(`${resource} not found`, 404, 'NOT_FOUND'); }
}
class ValidationError extends AppError {
  constructor(details) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') { super(message, 401, 'UNAUTHORIZED'); }
}
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403, 'FORBIDDEN'); }
}
class ConflictError extends AppError {
  constructor(message) { super(message, 409, 'CONFLICT'); }
}

// 2. The central error handler — LAST middleware, four arguments
function errorHandler(err, req, res, next) {
  // Normalise known third-party errors
  if (err.name === 'ValidationError' && err.errors) {          // Mongoose
    err = new ValidationError(
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  }
  if (err.code === 11000) {                                    // Mongo duplicate key
    err = new ConflictError(`Duplicate value for ${Object.keys(err.keyValue)}`);
  }
  if (err.name === 'CastError') {
    err = new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
  }
  if (err.name === 'JsonWebTokenError') err = new UnauthorizedError('Invalid token');
  if (err.name === 'TokenExpiredError') err = new UnauthorizedError('Token expired');

  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Log everything; alert only on unexpected errors
  const log = statusCode >= 500 ? logger.error : logger.warn;
  log({ err, requestId: req.id, url: req.originalUrl, userId: req.user?.id }, err.message);

  res.status(statusCode).json({
    error: {
      message: isOperational ? err.message : 'Internal server error',
      code: err.code ?? 'INTERNAL_ERROR',
      ...(err.details && { details: err.details }),
      // NEVER leak stack traces in production
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    requestId: req.id,
  });
}

// 3. Wire it up — order is critical
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ error: { message: 'Route not found' } }));
app.use(errorHandler);
```

**Interview Tip:** Never send `err.message` for unexpected 500s — a raw database error can leak table names, queries, or file paths. Log the detail, return something generic, and include a `requestId` so support can correlate.

---

# REST API Design

## How do you design a good REST API?

### Answer

```js
// Resource-based URLs — nouns, plural, no verbs
GET    /api/v1/users              // list (with pagination)
POST   /api/v1/users              // create
GET    /api/v1/users/:id          // read one
PUT    /api/v1/users/:id          // full replace
PATCH  /api/v1/users/:id          // partial update
DELETE /api/v1/users/:id          // delete

GET    /api/v1/users/:id/posts    // nested resource
POST   /api/v1/users/:id/posts

// ❌ Verbs in URLs
POST /api/getUser
POST /api/createUserAndSendEmail
```

### Status codes

| Code | Meaning | Use for |
|---|---|---|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST (+ `Location` header) |
| 202 | Accepted | Async job queued |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Malformed input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, version mismatch |
| 422 | Unprocessable | Valid syntax, invalid semantics |
| 429 | Too Many Requests | Rate limited (+ `Retry-After`) |
| 500 | Server Error | Unexpected failure |
| 503 | Unavailable | Down for maintenance / overloaded |

### Example — a well-shaped list endpoint

```js
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // Filtering
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.$text = { $search: req.query.search };

  // Sorting — whitelist the allowed fields
  const allowedSorts = ['createdAt', 'name', 'price'];
  const sortField = allowedSorts.includes(req.query.sort) ? req.query.sort : 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;

  // Sparse fieldsets
  const fields = req.query.fields?.split(',').join(' ');

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).select(fields).lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}));
```

### Other design points

```js
// Versioning
app.use('/api/v1', v1Routes);                    // URL (most common)
// or Accept: application/vnd.api.v1+json        // header (purer REST)

// Idempotency for payments
router.post('/payments', async (req, res) => {
  const key = req.get('Idempotency-Key');
  const existing = await redis.get(`idem:${key}`);
  if (existing) return res.json(JSON.parse(existing));   // return the same result
  const result = await charge(req.body);
  await redis.setex(`idem:${key}`, 86400, JSON.stringify(result));
  res.status(201).json(result);
});

// Cursor pagination — stable for large/changing datasets
GET /api/posts?cursor=eyJpZCI6MTIzfQ&limit=20

// HATEOAS (rarely used in practice, but know the term)
{ "data": {...}, "links": { "self": "/users/1", "posts": "/users/1/posts" } }
```

**Interview Tip:** Two things that separate senior answers: **cursor pagination** (offset pagination gets slow and duplicates rows when data shifts) and **idempotency keys** (so a retried payment doesn't double-charge).

---

# Validation

## How do you validate requests?

### Answer

```js
// Zod — schema-first, and you get TypeScript types free
import { z } from 'zod';

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/[A-Z]/, 'Need an uppercase letter'),
    age: z.coerce.number().int().min(18).optional(),
    role: z.enum(['user', 'admin']).default('user'),
  }),
  params: z.object({ id: z.string().uuid() }).optional(),
  query: z.object({ page: z.coerce.number().default(1) }).optional(),
});

// Reusable validation middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    });
  }
  // Use the PARSED data — it's coerced, defaulted and stripped of extras
  req.body = result.data.body;
  next();
};

router.post('/users', validate(createUserSchema), createUser);
```

```js
// express-validator — chain style
import { body, param, validationResult } from 'express-validator';

router.post('/users',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('age').optional().isInt({ min: 18 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  createUser
);
```

**Interview Tip:** Always use the **parsed output**, not the original `req.body`. Zod strips unknown keys, which prevents mass-assignment attacks (a user POSTing `{"role": "admin"}` to a signup endpoint).

---

# File Uploads

## How do you handle file uploads?

### Answer

```js
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

// Memory storage — good for piping straight to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG and WebP allowed', 400));
    }
    cb(null, true);
  },
});

router.post('/avatar', requireAuth, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('No file uploaded');

  // ⚠️ mimetype comes from the CLIENT — verify the actual bytes
  const { fileTypeFromBuffer } = await import('file-type');
  const type = await fileTypeFromBuffer(req.file.buffer);
  if (!type || !['jpg', 'png', 'webp'].includes(type.ext)) {
    throw new ValidationError('File content does not match its type');
  }

  // Never trust the original filename
  const key = `avatars/${req.user.id}/${crypto.randomUUID()}.${type.ext}`;

  // Process, then upload
  const optimised = await sharp(req.file.buffer)
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: optimised,
    ContentType: 'image/webp',
  }));

  await User.findByIdAndUpdate(req.user.id, { avatar: key });
  res.json({ url: `${process.env.CDN_URL}/${key}` });
}));

// Multiple files
upload.array('photos', 10);
upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'docs', maxCount: 5 }]);

// Handle multer's own errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 5MB)' });
    }
  }
  next(err);
});
```

### Better for large files: presigned URLs

```js
// The file goes browser → S3 directly, never through your server
router.post('/upload-url', requireAuth, asyncHandler(async (req, res) => {
  const key = `uploads/${req.user.id}/${crypto.randomUUID()}`;
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: req.body.contentType,
  }), { expiresIn: 300 });

  res.json({ uploadUrl: url, key });
}));
```

**Interview Tip:** Two security points that impress: **verify the file's magic bytes**, not the client-supplied MIME type, and **never use the original filename** (path traversal, XSS via filename, overwriting other users' files). Presigned URLs for big files is the third.

---

# Security

## How do you secure an Express API?

### Answer

```js
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';

const app = express();

app.disable('x-powered-by');                 // don't advertise the framework
app.set('trust proxy', 1);                   // required behind a proxy for req.ip

// 1. Security headers
app.use(helmet());

// 2. CORS — explicit allowlist
app.use(cors({
  origin: (origin, cb) => {
    const allowed = process.env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// 3. Rate limiting — global + stricter on auth
app.use('/api', rateLimit({ windowMs: 15 * 60_000, max: 1000, standardHeaders: true }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, max: 5, skipSuccessfulRequests: true }));

// 4. Body size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 5. NoSQL injection + HTTP parameter pollution
app.use(mongoSanitize());
app.use(hpp({ whitelist: ['sort', 'fields'] }));

// 6. Compression
app.use(compression());
```

### The full checklist

| Threat | Mitigation |
|---|---|
| XSS | Escape output, CSP via helmet, sanitise stored HTML |
| SQL/NoSQL injection | Parameterised queries, `mongoSanitize`, coerce types |
| CSRF | `SameSite` cookies + CSRF tokens for cookie-auth |
| Brute force | Rate limit, account lockout, CAPTCHA |
| DoS | Body limits, rate limits, timeouts, pagination caps |
| Mass assignment | Whitelist fields — never `User.create(req.body)` |
| Sensitive data leaks | `.select('-password')`, strip fields in `toJSON` |
| Insecure deps | `npm audit`, Dependabot, lockfile |
| Info disclosure | No stack traces in prod, disable `x-powered-by` |
| Broken access control | Check ownership on **every** resource access |

### The most-missed one: broken access control

```js
// ❌ Any authenticated user can read anyone's order
router.get('/orders/:id', requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.json(order);
});

// ✅ Scope the query to the owner
router.get('/orders/:id', requireAuth, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
  if (!order) throw new NotFoundError('Order');
  res.json(order);
});
```

**Interview Tip:** IDOR (Insecure Direct Object Reference) is #1 on the OWASP list and the easiest bug to ship. Always scope the query by owner rather than fetching then comparing — it's fewer lines and can't be forgotten.

---

# Project Structure

## How do you structure a production Express app?

### Answer

```
src/
├── app.js                  # express app (no listen) — importable for tests
├── server.js               # http server, graceful shutdown
├── config/
│   ├── index.js            # validated env config
│   └── database.js
├── routes/
│   ├── index.js            # mounts all routers
│   ├── auth.routes.js
│   └── user.routes.js
├── controllers/            # HTTP layer: parse req → call service → send res
│   └── user.controller.js
├── services/               # business logic — NO req/res here
│   └── user.service.js
├── models/                 # database schemas
│   └── user.model.js
├── middleware/
│   ├── auth.js
│   ├── validate.js
│   └── error.js
├── validators/             # zod schemas
├── utils/
│   ├── AppError.js
│   ├── asyncHandler.js
│   └── logger.js
└── tests/
```

### Example — the layers

```js
// config/index.js — fail fast on bad config
import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
export const config = envSchema.parse(process.env);   // crashes at boot, not at 3am

// controllers/user.controller.js — thin
export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id, req.user);
  res.json({ data: user });
});

// services/user.service.js — testable without HTTP
export const userService = {
  async getById(id, requester) {
    const user = await User.findById(id).lean();
    if (!user) throw new NotFoundError('User');
    if (user.id !== requester.id && requester.role !== 'admin') throw new ForbiddenError();
    return sanitise(user);
  },
};

// server.js
import app from './app.js';
const server = app.listen(config.PORT);

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

**Interview Tip:** The key architectural point: **services must not know about `req` and `res`.** That makes them unit-testable, reusable from a CLI/cron/queue worker, and portable if you later move to GraphQL or tRPC.

---

# Testing

## How do you test an Express app?

### Answer

```js
import request from 'supertest';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('POST /api/users', () => {
  beforeEach(async () => { await User.deleteMany({}); });

  test('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', password: 'Password123' })
      .expect('Content-Type', /json/)
      .expect(201);

    assert.ok(res.body.data.id);
    assert.equal(res.body.data.password, undefined);   // never leak the hash
  });

  test('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'nope', password: 'Password123' })
      .expect(400);

    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('rejects a duplicate email with 409', async () => {
    await User.create({ email: 'dup@example.com', password: 'x' });
    await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', password: 'Password123' })
      .expect(409);
  });

  test('requires auth on protected routes', async () => {
    await request(app).get('/api/users/me').expect(401);
  });

  test('blocks access to another user\'s resource', async () => {
    const { token } = await loginAs(userA);
    await request(app)
      .get(`/api/orders/${orderBelongingToUserB.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);              // 404 not 403 — don't leak existence
  });
});
```

**Interview Tip:** Export the `app` separately from `server.js` (which calls `listen`). Supertest binds to an ephemeral port itself, so importing an already-listening app causes port conflicts in parallel test runs.

---

# Rapid Fire

**What is `app.use` vs `app.get`?**
`use` matches all methods and treats the path as a prefix; `get` matches GET on an exact path pattern.

**What is `express.Router()`?**
A mini app with its own middleware and routes — the unit of modularity.

**What is `express.static`?**
Serves files from a directory with correct headers and caching.

**How do you serve a SPA from Express?**
`app.use(express.static('dist'))` then a catch-all `app.get('*', (req,res) => res.sendFile('dist/index.html'))` **after** your API routes.

**What is `res.json` vs `res.send`?**
`json` always serialises and sets `application/json`. `send` guesses the type from the argument.

**How do you enable CORS for one route?**
`app.get('/public', cors({ origin: '*' }), handler)`.

**What is `cookie-parser`?**
Parses the `Cookie` header into `req.cookies`, and `req.signedCookies` when given a secret.

**What are signed cookies?**
Cookies with an HMAC so tampering is detectable. Not encryption — the value is still readable.

**How do you handle sessions?**
`express-session` with a shared store (Redis) — never the default MemoryStore in production, it leaks and doesn't work across instances.

**What is `morgan`?**
HTTP request logging middleware. In production, prefer structured JSON logs (pino) for machine parsing.

**What is `compression`?**
Gzip/brotli middleware. Skip it if your reverse proxy already compresses.

**How do you set a request timeout?**
`server.setTimeout()`, or middleware using `res.setTimeout()`, plus timeouts on every outbound call.

**How do you handle long-running jobs?**
Return 202 immediately and push to a queue (BullMQ/SQS). Never hold an HTTP connection open for minutes.

**What is `trust proxy`?**
Tells Express to read `X-Forwarded-For`/`X-Forwarded-Proto` so `req.ip` and `req.protocol` are correct behind a proxy.

**How do you implement pagination?**
Offset (`skip`/`limit`) for simple cases; cursor-based for large or frequently-changing datasets.

**How do you version an API?**
URL path (`/api/v1`) is the pragmatic default. Header-based is purer but harder to debug and cache.

**What is the difference between PUT and PATCH?**
PUT replaces the whole resource (idempotent); PATCH applies a partial update.

**How do you implement WebSockets with Express?**
Attach `socket.io` or `ws` to the same HTTP server: `const io = new Server(server)`.

**What is `helmet` actually setting?**
CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and it removes `X-Powered-By`.

**What is `next('router')`?**
Skips the remaining middleware in the current router and passes control back to the parent.

**What changed in Express 5?**
Native async error handling, `path-to-regexp` v8 (stricter route patterns, no bare `*`), removal of deprecated APIs, promise support in some methods.

---

## 📌 Interview Checklist

- [ ] Explain the middleware chain and why order matters
- [ ] How do async errors behave in Express 4 vs 5?
- [ ] Write an auth + role middleware from scratch
- [ ] Design a paginated, filterable list endpoint
- [ ] Where does business logic live, and why not in the controller?
- [ ] Name five security middlewares and what each prevents
- [ ] What is IDOR and how do you prevent it?
- [ ] How do you handle a 500MB file upload?
- [ ] How do you test a protected route?
