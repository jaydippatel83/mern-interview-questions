/**
 * ============================================================
 *  NODE.JS CODING QUESTIONS — Backend Machine Coding Round
 * ============================================================
 *  Runnable patterns you're likely to be asked to implement.
 *  Run:  node coding.js
 * ============================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { Transform, Readable, pipeline } = require('node:stream');
const { promisify } = require('node:util');

/* ==================================================================
 *  1. HTTP SERVER WITHOUT EXPRESS — routing, body parsing, JSON
 * ================================================================== */
function createServer() {
  const routes = new Map();

  const addRoute = (method, pattern, handler) => {
    // '/users/:id' → /^\/users\/([^/]+)$/
    const paramNames = [];
    const regex = new RegExp(
      '^' +
        pattern.replace(/:([\w]+)/g, (_, name) => {
          paramNames.push(name);
          return '([^/]+)';
        }) +
        '/?$'
    );
    routes.set(`${method}:${pattern}`, { method, regex, paramNames, handler });
  };

  const parseBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      const MAX = 1024 * 1024; // 1MB limit — prevents memory exhaustion

      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX) {
          reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }));
        }
      });

      req.on('error', reject);
    });

  const server = http.createServer(async (req, res) => {
    // Helpers on res
    res.json = (data, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams);

    for (const route of routes.values()) {
      if (route.method !== req.method) continue;
      const match = url.pathname.match(route.regex);
      if (!match) continue;

      const params = Object.fromEntries(
        route.paramNames.map((name, i) => [name, decodeURIComponent(match[i + 1])])
      );

      try {
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method)
          ? await parseBody(req)
          : {};
        return await route.handler({ req, res, params, query, body });
      } catch (err) {
        return res.json({ error: err.message }, err.statusCode ?? 500);
      }
    }

    res.json({ error: 'Not found' }, 404);
  });

  return {
    get: (p, h) => addRoute('GET', p, h),
    post: (p, h) => addRoute('POST', p, h),
    put: (p, h) => addRoute('PUT', p, h),
    delete: (p, h) => addRoute('DELETE', p, h),
    listen: (port, cb) => server.listen(port, cb),
    close: (cb) => server.close(cb),
    server,
  };
}

/* ==================================================================
 *  2. RATE LIMITER — token bucket + sliding window
 * ================================================================== */
class TokenBucketRateLimiter {
  #buckets = new Map();

  constructor({ capacity = 10, refillPerSecond = 1 } = {}) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
  }

  consume(key, tokens = 1) {
    const now = Date.now();
    let bucket = this.#buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.#buckets.set(key, bucket);
    }

    // Refill based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + elapsedSeconds * this.refillPerSecond
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    const retryAfter = Math.ceil((tokens - bucket.tokens) / this.refillPerSecond);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Call periodically so idle keys don't leak memory
  cleanup(maxIdleMs = 3600_000) {
    const cutoff = Date.now() - maxIdleMs;
    for (const [key, bucket] of this.#buckets) {
      if (bucket.lastRefill < cutoff) this.#buckets.delete(key);
    }
  }
}

class SlidingWindowRateLimiter {
  #windows = new Map();

  constructor({ limit = 100, windowMs = 60_000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    const timestamps = (this.#windows.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: timestamps[0] + this.windowMs,
      };
    }

    timestamps.push(now);
    this.#windows.set(key, timestamps);
    return { allowed: true, remaining: this.limit - timestamps.length };
  }
}

/* ==================================================================
 *  3. LRU CACHE WITH TTL
 * ================================================================== */
class LRUCache {
  #map = new Map();

  constructor({ maxSize = 100, ttlMs = 0 } = {}) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.#map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (this.ttlMs && Date.now() > entry.expiresAt) {
      this.#map.delete(key);
      this.misses++;
      return undefined;
    }

    // Re-insert to mark as most recently used (Map preserves insertion order)
    this.#map.delete(key);
    this.#map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key, value) {
    if (this.#map.has(key)) this.#map.delete(key);
    else if (this.#map.size >= this.maxSize) {
      this.#map.delete(this.#map.keys().next().value); // evict LRU
    }

    this.#map.set(key, {
      value,
      expiresAt: this.ttlMs ? Date.now() + this.ttlMs : Infinity,
    });
    return this;
  }

  has(key) { return this.get(key) !== undefined; }
  delete(key) { return this.#map.delete(key); }
  clear() { this.#map.clear(); }
  get size() { return this.#map.size; }
  get hitRate() {
    const total = this.hits + this.misses;
    return total ? this.hits / total : 0;
  }
}

/* ==================================================================
 *  4. JOB QUEUE with concurrency, retries and priorities
 * ================================================================== */
class JobQueue extends EventEmitter {
  #queue = [];
  #running = 0;
  #results = new Map();

  constructor({ concurrency = 3, maxRetries = 3, retryDelayMs = 1000 } = {}) {
    super();
    this.concurrency = concurrency;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  add(name, fn, { priority = 0, maxRetries = this.maxRetries } = {}) {
    const job = {
      id: crypto.randomUUID(),
      name,
      fn,
      priority,
      attempts: 0,
      maxRetries,
    };

    return new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
      this.#queue.push(job);
      this.#queue.sort((a, b) => b.priority - a.priority); // higher priority first
      this.emit('added', { id: job.id, name });
      this.#process();
    });
  }

  async #process() {
    while (this.#running < this.concurrency && this.#queue.length) {
      const job = this.#queue.shift();
      this.#running++;
      this.#run(job);
    }
  }

  async #run(job) {
    job.attempts++;
    this.emit('started', { id: job.id, name: job.name, attempt: job.attempts });

    try {
      const result = await job.fn();
      this.#results.set(job.id, { status: 'completed', result });
      this.emit('completed', { id: job.id, name: job.name, result });
      job.resolve(result);
    } catch (err) {
      if (job.attempts <= job.maxRetries) {
        const delay = this.retryDelayMs * 2 ** (job.attempts - 1); // exponential backoff
        this.emit('retrying', { id: job.id, name: job.name, attempt: job.attempts, delay });
        setTimeout(() => {
          this.#queue.unshift(job);
          this.#process();
        }, delay);
      } else {
        this.#results.set(job.id, { status: 'failed', error: err });
        this.emit('failed', { id: job.id, name: job.name, error: err });
        job.reject(err);
      }
    } finally {
      this.#running--;
      this.#process();
    }
  }

  get stats() {
    return { queued: this.#queue.length, running: this.#running };
  }
}

/* ==================================================================
 *  5. CIRCUIT BREAKER — protect against cascading failures
 * ================================================================== */
class CircuitBreaker extends EventEmitter {
  #state = 'CLOSED';
  #failures = 0;
  #successes = 0;
  #nextAttempt = 0;

  constructor(fn, {
    failureThreshold = 5,
    successThreshold = 2,
    resetTimeoutMs = 30_000,
    timeoutMs = 5_000,
  } = {}) {
    super();
    this.fn = fn;
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.timeoutMs = timeoutMs;
  }

  async call(...args) {
    if (this.#state === 'OPEN') {
      if (Date.now() < this.#nextAttempt) {
        const err = new Error('Circuit breaker is OPEN');
        err.code = 'CIRCUIT_OPEN';
        throw err;
      }
      this.#transition('HALF_OPEN');
    }

    try {
      const result = await Promise.race([
        this.fn(...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), this.timeoutMs)
        ),
      ]);
      this.#onSuccess();
      return result;
    } catch (err) {
      this.#onFailure();
      throw err;
    }
  }

  #onSuccess() {
    this.#failures = 0;
    if (this.#state === 'HALF_OPEN') {
      this.#successes++;
      if (this.#successes >= this.successThreshold) this.#transition('CLOSED');
    }
  }

  #onFailure() {
    this.#successes = 0;
    this.#failures++;
    if (this.#state === 'HALF_OPEN' || this.#failures >= this.failureThreshold) {
      this.#transition('OPEN');
      this.#nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }

  #transition(state) {
    if (this.#state === state) return;
    const from = this.#state;
    this.#state = state;
    if (state === 'CLOSED') { this.#failures = 0; this.#successes = 0; }
    this.emit('stateChange', { from, to: state });
  }

  get state() { return this.#state; }
}

/* ==================================================================
 *  6. STREAM TRANSFORMS — CSV parsing, line splitting, batching
 * ================================================================== */
function createLineSplitter() {
  let remainder = '';
  return new Transform({
    readableObjectMode: true,
    transform(chunk, encoding, callback) {
      const lines = (remainder + chunk.toString()).split(/\r?\n/);
      remainder = lines.pop(); // last piece may be incomplete
      for (const line of lines) this.push(line);
      callback();
    },
    flush(callback) {
      if (remainder) this.push(remainder);
      callback();
    },
  });
}

function createCsvParser({ delimiter = ',' } = {}) {
  let headers = null;
  return new Transform({
    objectMode: true,
    transform(line, encoding, callback) {
      if (!line.trim()) return callback();
      const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (!headers) {
        headers = cells;
        return callback();
      }
      callback(null, Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? null])));
    },
  });
}

function createBatcher(size = 100) {
  let batch = [];
  return new Transform({
    objectMode: true,
    transform(item, encoding, callback) {
      batch.push(item);
      if (batch.length >= size) {
        this.push(batch);
        batch = [];
      }
      callback();
    },
    flush(callback) {
      if (batch.length) this.push(batch);
      callback();
    },
  });
}

/* ==================================================================
 *  7. RETRY WITH EXPONENTIAL BACKOFF + JITTER
 * ================================================================== */
async function retry(fn, {
  retries = 3,
  baseDelayMs = 200,
  maxDelayMs = 10_000,
  factor = 2,
  jitter = true,
  shouldRetry = (err) => !err.statusCode || err.statusCode >= 500 || err.statusCode === 429,
  onRetry = () => {},
} = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === retries || !shouldRetry(err)) break;

      let delay = Math.min(baseDelayMs * factor ** attempt, maxDelayMs);
      if (jitter) delay = Math.random() * delay; // full jitter avoids thundering herd

      onRetry({ error: err, attempt: attempt + 1, delay: Math.round(delay) });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/* ==================================================================
 *  8. GRACEFUL SHUTDOWN MANAGER
 * ================================================================== */
class GracefulShutdown {
  #handlers = [];
  #shuttingDown = false;

  constructor({ timeoutMs = 10_000, logger = console } = {}) {
    this.timeoutMs = timeoutMs;
    this.logger = logger;

    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.on(signal, () => this.shutdown(signal, 0));
    }
    process.on('uncaughtException', (err) => {
      this.logger.error('Uncaught exception', err);
      this.shutdown('uncaughtException', 1);
    });
    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection', reason);
      this.shutdown('unhandledRejection', 1);
    });
  }

  register(name, handler) {
    this.#handlers.push({ name, handler });
    return this;
  }

  async shutdown(reason, exitCode = 0) {
    if (this.#shuttingDown) return;
    this.#shuttingDown = true;
    this.logger.info(`Shutting down (${reason})…`);

    const forceExit = setTimeout(() => {
      this.logger.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, this.timeoutMs);
    forceExit.unref();

    // Run in reverse registration order (LIFO) — like a stack of resources
    for (const { name, handler } of [...this.#handlers].reverse()) {
      try {
        this.logger.info(`  closing ${name}…`);
        await handler();
      } catch (err) {
        this.logger.error(`  failed to close ${name}`, err);
      }
    }

    clearTimeout(forceExit);
    this.logger.info('Shutdown complete');
    process.exit(exitCode);
  }
}

/* ==================================================================
 *  9. IN-MEMORY EVENT BUS with wildcards and async handlers
 * ================================================================== */
class EventBus {
  #handlers = new Map();

  on(pattern, handler) {
    if (!this.#handlers.has(pattern)) this.#handlers.set(pattern, new Set());
    this.#handlers.get(pattern).add(handler);
    return () => this.off(pattern, handler);
  }

  off(pattern, handler) {
    this.#handlers.get(pattern)?.delete(handler);
    return this;
  }

  #matches(pattern, event) {
    if (pattern === event || pattern === '*') return true;
    // 'order.*' matches 'order.created'
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$');
    return regex.test(event);
  }

  async emit(event, payload) {
    const matched = [];
    for (const [pattern, handlers] of this.#handlers) {
      if (this.#matches(pattern, event)) matched.push(...handlers);
    }

    // Run all handlers, collect failures without stopping the rest
    const results = await Promise.allSettled(
      matched.map((h) => Promise.resolve(h(payload, event)))
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) {
      console.error(`${failures.length} handler(s) failed for "${event}"`);
    }

    return { handled: matched.length, failed: failures.length };
  }
}

/* ==================================================================
 *  10. CONNECTION POOL — generic resource pooling
 * ================================================================== */
class Pool {
  #available = [];
  #inUse = new Set();
  #waiting = [];

  constructor({ create, destroy, validate = () => true, min = 2, max = 10 } = {}) {
    this.create = create;
    this.destroy = destroy;
    this.validate = validate;
    this.min = min;
    this.max = max;
  }

  async init() {
    for (let i = 0; i < this.min; i++) this.#available.push(await this.create());
  }

  get size() { return this.#available.length + this.#inUse.size; }

  async acquire(timeoutMs = 5000) {
    // 1. Reuse an available, valid resource
    while (this.#available.length) {
      const resource = this.#available.pop();
      if (await this.validate(resource)) {
        this.#inUse.add(resource);
        return resource;
      }
      await this.destroy(resource); // stale — throw it away
    }

    // 2. Create a new one if under the cap
    if (this.size < this.max) {
      const resource = await this.create();
      this.#inUse.add(resource);
      return resource;
    }

    // 3. Wait for a release
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#waiting = this.#waiting.filter((w) => w.resolve !== resolve);
        reject(new Error('Pool acquire timed out'));
      }, timeoutMs);

      this.#waiting.push({
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject,
      });
    });
  }

  release(resource) {
    this.#inUse.delete(resource);
    const waiter = this.#waiting.shift();
    if (waiter) {
      this.#inUse.add(resource);
      waiter.resolve(resource);
    } else {
      this.#available.push(resource);
    }
  }

  async use(fn, timeoutMs) {
    const resource = await this.acquire(timeoutMs);
    try {
      return await fn(resource);
    } finally {
      this.release(resource); // ALWAYS release, even on error
    }
  }

  async drain() {
    for (const r of [...this.#available, ...this.#inUse]) await this.destroy(r);
    this.#available = [];
    this.#inUse.clear();
  }
}

/* ==================================================================
 *  11. PASSWORD HASHING & TOKEN GENERATION (no dependencies)
 * ================================================================== */
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = await scrypt(password, salt, 64);
  // Timing-safe comparison — never use ===
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived);
}

const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Minimal JWT (HS256) — signing and verification
function signJWT(payload, secret, { expiresInSeconds = 900 } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const data = `${encode(header)}.${encode(body)}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  return `${data}.${signature}`;
}

function verifyJWT(token, secret) {
  const [headerB64, payloadB64, signature] = token.split('.');
  if (!headerB64 || !payloadB64 || !signature) throw new Error('Malformed token');

  // Pin the algorithm — never trust the header's alg (the `alg: none` attack)
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  if (header.alg !== 'HS256') throw new Error('Unsupported algorithm');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

/* ==================================================================
 *  12. FILE WALKER — recursive directory traversal
 * ================================================================== */
async function* walkDirectory(dir, { ignore = ['node_modules', '.git'] } = {}) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath, { ignore });
    } else {
      yield fullPath;
    }
  }
}

async function directorySize(dir) {
  let total = 0;
  let files = 0;
  for await (const file of walkDirectory(dir)) {
    const stat = await fs.promises.stat(file);
    total += stat.size;
    files++;
  }
  return { bytes: total, files, mb: (total / 1e6).toFixed(2) };
}

/* ==================================================================
 *  13. REQUEST DEDUPLICATION (in-flight coalescing)
 * ================================================================== */
function dedupe(fn, keyFn = (...args) => JSON.stringify(args)) {
  const inFlight = new Map();

  return (...args) => {
    const key = keyFn(...args);
    if (inFlight.has(key)) return inFlight.get(key);

    const promise = Promise.resolve(fn(...args)).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}

/* ==================================================================
 *  14. SIMPLE LOGGER — structured JSON with levels and context
 * ================================================================== */
const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

function createLogger({ level = 'info', base = {} } = {}) {
  const threshold = LEVELS[level];

  const log = (levelName, objOrMsg, maybeMsg) => {
    if (LEVELS[levelName] < threshold) return;

    const isObj = typeof objOrMsg === 'object' && objOrMsg !== null;
    const entry = {
      time: new Date().toISOString(),
      level: levelName,
      ...base,
      ...(isObj ? objOrMsg : {}),
      msg: isObj ? maybeMsg : objOrMsg,
    };

    // Serialise Error objects properly — JSON.stringify(err) gives {}
    if (entry.err instanceof Error) {
      entry.err = { name: entry.err.name, message: entry.err.message, stack: entry.err.stack };
    }

    process.stdout.write(JSON.stringify(entry) + '\n');
  };

  const logger = {};
  for (const name of Object.keys(LEVELS)) {
    logger[name] = (obj, msg) => log(name, obj, msg);
  }
  logger.child = (extra) => createLogger({ level, base: { ...base, ...extra } });
  return logger;
}

/* ==================================================================
 *  DEMOS
 * ================================================================== */
async function main() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  console.log('=== RATE LIMITER (token bucket, capacity 3) ===');
  const limiter = new TokenBucketRateLimiter({ capacity: 3, refillPerSecond: 2 });
  for (let i = 1; i <= 5; i++) {
    const r = limiter.consume('user:1');
    console.log(`  request ${i}: ${r.allowed ? '✅ allowed' : `❌ blocked (retry in ${r.retryAfter}s)`}, remaining=${r.remaining}`);
  }
  await sleep(1100);
  console.log(`  after 1.1s refill: ${limiter.consume('user:1').allowed ? '✅ allowed' : '❌ blocked'}`);

  console.log('\n=== LRU CACHE (max 3, ttl 200ms) ===');
  const cache = new LRUCache({ maxSize: 3, ttlMs: 200 });
  cache.set('a', 1).set('b', 2).set('c', 3);
  cache.get('a');            // 'a' becomes most recent
  cache.set('d', 4);         // evicts 'b'
  console.log('  a:', cache.get('a'), '| b:', cache.get('b'), '| d:', cache.get('d'));
  await sleep(250);
  console.log('  after TTL expiry, a:', cache.get('a'));
  console.log('  hit rate:', (cache.hitRate * 100).toFixed(0) + '%');

  console.log('\n=== JOB QUEUE (concurrency 2, with retries) ===');
  const queue = new JobQueue({ concurrency: 2, maxRetries: 2, retryDelayMs: 50 });
  queue.on('retrying', ({ name, attempt, delay }) =>
    console.log(`  ⟳ retrying ${name} (attempt ${attempt}) in ${delay}ms`)
  );

  let flakyAttempts = 0;
  const jobs = [
    queue.add('fast-job', async () => { await sleep(30); return 'fast done'; }),
    queue.add('slow-job', async () => { await sleep(80); return 'slow done'; }),
    queue.add('priority-job', async () => 'priority done', { priority: 10 }),
    queue.add('flaky-job', async () => {
      if (++flakyAttempts < 3) throw new Error('temporary failure');
      return `flaky succeeded on attempt ${flakyAttempts}`;
    }),
  ];
  console.log('  results:', await Promise.all(jobs));

  console.log('\n=== CIRCUIT BREAKER (threshold 2) ===');
  let serviceUp = false;
  const breaker = new CircuitBreaker(
    async () => {
      if (!serviceUp) throw new Error('service unavailable');
      return 'service response';
    },
    { failureThreshold: 2, successThreshold: 1, resetTimeoutMs: 150, timeoutMs: 1000 }
  );
  breaker.on('stateChange', ({ from, to }) => console.log(`  state: ${from} → ${to}`));

  for (let i = 1; i <= 3; i++) {
    try { await breaker.call(); } catch (e) { console.log(`  call ${i}: ${e.message}`); }
  }
  serviceUp = true;
  await sleep(200);
  console.log('  after reset timeout:', await breaker.call());

  console.log('\n=== RETRY WITH BACKOFF ===');
  let attempts = 0;
  const result = await retry(
    async () => {
      if (++attempts < 3) throw Object.assign(new Error('503 upstream'), { statusCode: 503 });
      return `succeeded after ${attempts} attempts`;
    },
    { retries: 4, baseDelayMs: 20, onRetry: ({ attempt, delay }) =>
        console.log(`  ⟳ attempt ${attempt}, waiting ${delay}ms`) }
  );
  console.log(' ', result);

  console.log('\n=== STREAM CSV PARSING ===');
  const csv = 'name,age,city\nJaydip,25,Surat\nAmit,30,Mumbai\nPriya,28,Pune\n';
  const rows = [];
  await promisify(pipeline)(
    Readable.from([csv]),
    createLineSplitter(),
    createCsvParser(),
    createBatcher(2),
    new Transform({
      objectMode: true,
      transform(batch, enc, cb) { rows.push(batch); cb(); },
    })
  );
  console.log('  batches:', JSON.stringify(rows));

  console.log('\n=== EVENT BUS (wildcards) ===');
  const bus = new EventBus();
  bus.on('order.*', (p, e) => console.log(`  [order.*]  ${e}:`, p));
  bus.on('order.created', (p) => console.log('  [exact]    order.created:', p));
  bus.on('*', (p, e) => console.log(`  [*]        ${e}`));
  await bus.emit('order.created', { id: 'ORD-1' });

  console.log('\n=== CONNECTION POOL ===');
  let created = 0;
  const pool = new Pool({
    create: async () => ({ id: ++created }),
    destroy: async () => {},
    min: 1,
    max: 2,
  });
  await pool.init();
  const used = await Promise.all([
    pool.use(async (c) => { await sleep(30); return `conn ${c.id}`; }),
    pool.use(async (c) => { await sleep(30); return `conn ${c.id}`; }),
    pool.use(async (c) => `conn ${c.id}`),   // waits for a release
  ]);
  console.log('  connections used:', used, '| total created:', created);

  console.log('\n=== PASSWORD HASHING ===');
  const stored = await hashPassword('MySecret123!');
  console.log('  stored format:', stored.slice(0, 40) + '…');
  console.log('  correct password:', await verifyPassword('MySecret123!', stored));
  console.log('  wrong password:  ', await verifyPassword('WrongPassword', stored));

  console.log('\n=== JWT ===');
  const token = signJWT({ sub: 'user_123', role: 'admin' }, 'super-secret-key');
  console.log('  token:', token.slice(0, 50) + '…');
  console.log('  verified payload:', verifyJWT(token, 'super-secret-key'));
  try {
    verifyJWT(token, 'wrong-secret');
  } catch (e) {
    console.log('  wrong secret →', e.message);
  }

  console.log('\n=== REQUEST DEDUPLICATION ===');
  let calls = 0;
  const fetchUser = dedupe(async (id) => { calls++; await sleep(30); return { id }; });
  await Promise.all([fetchUser(1), fetchUser(1), fetchUser(1), fetchUser(2)]);
  console.log(`  4 calls (3 identical + 1 unique) → ${calls} actual executions`);

  console.log('\n=== STRUCTURED LOGGER ===');
  const logger = createLogger({ level: 'debug', base: { service: 'api' } });
  logger.info({ userId: 'u1', route: '/users' }, 'request handled');
  const requestLogger = logger.child({ requestId: 'req-abc' });
  requestLogger.warn({ ms: 1200 }, 'slow query');
  requestLogger.error({ err: new Error('db timeout') }, 'query failed');

  console.log('\n=== HTTP SERVER WITHOUT EXPRESS ===');
  const app = createServer();
  const users = new Map([['1', { id: '1', name: 'Jaydip' }]]);

  app.get('/users', ({ res, query }) => res.json({ users: [...users.values()], query }));
  app.get('/users/:id', ({ res, params }) => {
    const user = users.get(params.id);
    user ? res.json(user) : res.json({ error: 'Not found' }, 404);
  });
  app.post('/users', ({ res, body }) => {
    if (!body.name) return res.json({ error: 'name is required' }, 400);
    const user = { id: String(users.size + 1), name: body.name };
    users.set(user.id, user);
    res.json(user, 201);
  });

  const listening = app.listen(0);
  await new Promise((resolve) => listening.once('listening', resolve));
  const { port } = listening.address();
  const base = `http://127.0.0.1:${port}`;

  console.log('  GET  /users/1  →', await (await fetch(`${base}/users/1`)).json());
  console.log('  GET  /users/99 →', await (await fetch(`${base}/users/99`)).json());
  console.log('  POST /users    →', await (await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Amit' }),
  })).json());
  console.log('  POST /users (no name) →', await (await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })).json());
  console.log('  GET  /unknown  →', await (await fetch(`${base}/unknown`)).json());

  await new Promise((resolve) => app.close(resolve));

  console.log('\n=== GRACEFUL SHUTDOWN (registered, not triggered) ===');
  const shutdown = new GracefulShutdown({ timeoutMs: 5000, logger: { info: () => {}, error: () => {} } });
  shutdown
    .register('http server', async () => {})
    .register('database', async () => {})
    .register('redis', async () => {});
  console.log('  3 shutdown handlers registered (LIFO order on SIGTERM) ✅');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  createServer,
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter,
  LRUCache,
  JobQueue,
  CircuitBreaker,
  createLineSplitter,
  createCsvParser,
  createBatcher,
  retry,
  GracefulShutdown,
  EventBus,
  Pool,
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  signJWT,
  verifyJWT,
  walkDirectory,
  directorySize,
  dedupe,
  createLogger,
};
