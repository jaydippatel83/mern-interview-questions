# 🔴 Redis Interview Questions

> Data structures · Caching patterns · Persistence · Pub/Sub · Distributed locks · Rate limiting · Scaling

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Data Structures](#data-structures)
3. [Expiration & Eviction](#expiration--eviction)
4. [Caching Patterns](#caching-patterns)
5. [Persistence](#persistence)
6. [Pub/Sub & Streams](#pubsub--streams)
7. [Transactions & Lua](#transactions--lua)
8. [Distributed Locks](#distributed-locks)
9. [Rate Limiting](#rate-limiting)
10. [Sessions & Queues](#sessions--queues)
11. [Scaling](#scaling)
12. [Node.js Usage](#nodejs-usage)
13. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is Redis and when should you use it?

### Answer

An in-memory data structure store used as a cache, message broker, session store and database. Data lives in RAM, with optional persistence to disk.

### Why is it fast?

1. **In-memory** — no disk seeks (RAM is ~100,000× faster than a disk seek)
2. **Single-threaded command execution** — no locks, no context switching, no race conditions
3. **Optimised data structures** — purpose-built C implementations
4. **I/O multiplexing** — epoll handles thousands of connections on one thread
5. **Simple protocol** — RESP, minimal parsing overhead

Typical throughput: **100,000+ ops/second** with sub-millisecond latency.

### When should we use it?

| Use case | Why Redis |
|---|---|
| Caching | Sub-ms reads, TTL built in |
| Sessions | Shared across instances, auto-expiry |
| Rate limiting | Atomic counters with expiry |
| Leaderboards | Sorted sets — O(log n) ranking |
| Job queues | Lists / Streams with blocking pops |
| Real-time analytics | HyperLogLog, bitmaps |
| Distributed locks | Atomic SET NX |
| Pub/Sub | Fan-out messaging |

### When NOT to use it

- As the primary store for data you cannot lose (persistence is good, but not a database guarantee)
- For datasets much larger than RAM
- For complex queries, joins or ad-hoc reporting

**Interview Tip:** "Redis is single-threaded" is the key insight and the source of two facts: **every command is atomic** (no race conditions between clients), and **one slow command blocks everyone** (never run `KEYS *` on production). Redis 6+ added threaded I/O for network reads/writes, but command *execution* is still single-threaded.

---

# Data Structures

## What data structures does Redis support?

### Answer

```bash
# ===== STRINGS — the simplest type, up to 512MB =====
SET user:1:name "Jaydip"
GET user:1:name
SET session:abc "data" EX 3600          # with TTL
SET lock:job NX EX 30                   # only if not exists — the lock primitive
MSET k1 v1 k2 v2                        # multiple at once
INCR page:views                          # atomic counter
INCRBY balance 100
DECRBY stock 1
APPEND log "new line"
GETSET counter 0                         # get old value and reset atomically
SETRANGE / GETRANGE                      # substring operations
STRLEN key

# ===== HASHES — objects, field-level access =====
HSET user:1 name "Jaydip" email "j@x.com" age 25
HGET user:1 name
HGETALL user:1
HMGET user:1 name email
HINCRBY user:1 loginCount 1
HDEL user:1 age
HEXISTS user:1 email
HKEYS user:1 / HVALS user:1 / HLEN user:1
# ✅ Memory efficient for small objects, and you can update ONE field
#    without deserialising the whole thing (unlike a JSON string)

# ===== LISTS — ordered, duplicates allowed, linked list =====
LPUSH queue:jobs "job1"                  # push left
RPUSH queue:jobs "job2"                  # push right
LPOP queue:jobs                          # pop left
RPOP queue:jobs
BLPOP queue:jobs 0                       # BLOCKING pop — the worker pattern
BRPOPLPUSH src dst 0                     # reliable queue (atomic move)
LRANGE queue:jobs 0 -1                   # all elements
LLEN queue:jobs
LTRIM recent:views 0 99                  # keep only the newest 100
LINSERT / LSET / LREM

# ===== SETS — unique, unordered =====
SADD user:1:tags "nodejs" "react"
SMEMBERS user:1:tags
SISMEMBER user:1:tags "nodejs"           # O(1) membership check
SCARD user:1:tags
SREM user:1:tags "react"
SPOP user:1:tags                         # random removal
SRANDMEMBER user:1:tags 2
SINTER user:1:tags user:2:tags           # common interests
SUNION / SDIFF
SINTERSTORE dest key1 key2               # store the result

# ===== SORTED SETS (ZSET) — unique members with scores =====
ZADD leaderboard 1000 "player1" 2500 "player2"
ZINCRBY leaderboard 100 "player1"
ZSCORE leaderboard "player1"
ZRANK leaderboard "player1"              # 0-based rank ascending
ZREVRANK leaderboard "player1"           # descending
ZRANGE leaderboard 0 9 WITHSCORES        # bottom 10
ZREVRANGE leaderboard 0 9 WITHSCORES     # TOP 10 ⭐
ZRANGEBYSCORE leaderboard 1000 2000
ZCOUNT leaderboard 1000 2000
ZREMRANGEBYSCORE leaderboard 0 500       # remove low scores
ZREMRANGEBYRANK leaderboard 0 -101       # keep only the top 100

# ===== BITMAPS — 1 bit per user, extremely compact =====
SETBIT active:2026-07-25 12345 1         # user 12345 was active today
GETBIT active:2026-07-25 12345
BITCOUNT active:2026-07-25               # daily active users
BITOP AND result day1 day2               # users active on BOTH days
# 1 million users = 125 KB. That's the whole point.

# ===== HYPERLOGLOG — approximate unique counts =====
PFADD unique:visitors "user1" "user2"
PFCOUNT unique:visitors                  # ~0.81% standard error
PFMERGE weekly day1 day2 day3
# Counts BILLIONS of unique items in 12 KB, fixed

# ===== GEOSPATIAL =====
GEOADD locations 72.83 21.17 "surat"
GEODIST locations "surat" "mumbai" km
GEOSEARCH locations FROMLONLAT 72.8 21.1 BYRADIUS 50 km ASC

# ===== STREAMS — append-only log with consumer groups =====
XADD events * type "order" id "123"
XREAD COUNT 10 STREAMS events 0
XGROUP CREATE events workers $
XREADGROUP GROUP workers worker1 COUNT 1 STREAMS events >
XACK events workers 1234-0
```

### Choosing the right structure

| Need | Structure |
|---|---|
| Cache a value | String |
| Cache an object with partial updates | Hash |
| Queue | List (or Stream for reliability) |
| Unique membership | Set |
| Ranking / leaderboard / priority | Sorted Set |
| Daily active users | Bitmap |
| Approximate unique count at scale | HyperLogLog |
| Event log with replay + consumer groups | Stream |
| "Nearby me" | Geospatial |

**Interview Tip:** The **sorted set** is the structure interviewers probe most — leaderboards, delayed job queues (score = timestamp), rate limiters (sliding window), and priority queues all come from ZSET. Know `ZADD`, `ZREVRANGE`, `ZRANGEBYSCORE` and `ZREMRANGEBYSCORE` cold.

---

# Expiration & Eviction

## How does key expiry work?

### Answer

```bash
SET key value EX 60          # expire in 60 seconds
SET key value PX 60000       # milliseconds
SET key value EXAT 1735689600  # at a unix timestamp
EXPIRE key 60                # set TTL on an existing key
TTL key                      # seconds remaining (-1 = no TTL, -2 = doesn't exist)
PERSIST key                  # remove the TTL
```

### How Redis actually deletes expired keys

1. **Lazy expiration** — checked when the key is accessed
2. **Active expiration** — a background job samples 20 random keys with a TTL, 10 times per second; if more than 25% were expired, it repeats immediately

So an expired key may still occupy memory until one of these catches it.

## What are the eviction policies?

### Answer

When `maxmemory` is reached:

| Policy | Behaviour |
|---|---|
| `noeviction` | Return errors on writes (default) |
| `allkeys-lru` | Evict least recently used, any key ✅ **best for pure cache** |
| `allkeys-lfu` | Evict least *frequently* used — better for skewed access |
| `allkeys-random` | Random |
| `volatile-lru` | LRU among keys **with a TTL** |
| `volatile-lfu` | LFU among keys with a TTL |
| `volatile-ttl` | Evict the shortest remaining TTL first |
| `volatile-random` | Random among keys with a TTL |

```bash
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru
INFO memory
```

**Interview Tip:** The trap with `volatile-*` policies: if **no** keys have a TTL, Redis behaves like `noeviction` and starts returning OOM errors on writes. When Redis is a pure cache, use `allkeys-lru` so it can always make room.

**Common Mistakes:** Mixing cache data and durable data (sessions, queues) in one Redis instance with `allkeys-lru` — your job queue gets evicted. Use separate instances or separate databases with different policies.

---

# Caching Patterns

## What are the main caching patterns?

### Answer

```js
// ===== 1. CACHE-ASIDE (lazy loading) — the most common =====
async function getUser(id) {
  const key = `user:${id}`;

  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);        // HIT

  const user = await db.users.findById(id);     // MISS
  if (user) await redis.setex(key, 3600, JSON.stringify(user));
  return user;
}
// ✅ Only caches what's requested
// ❌ First request is always slow; risk of stale data

// ===== 2. WRITE-THROUGH — write to cache and DB together =====
async function updateUser(id, data) {
  const user = await db.users.update(id, data);
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
  return user;
}
// ✅ Cache is always fresh
// ❌ Slower writes; caches data that may never be read

// ===== 3. WRITE-BEHIND (write-back) — buffer writes =====
async function incrementViews(postId) {
  await redis.hincrby('post:views', postId, 1);   // instant
  // A background job flushes to the DB every 60s
}
// ✅ Very fast writes, absorbs spikes
// ❌ Data loss risk if Redis dies before flushing

// ===== 4. CACHE INVALIDATION on write =====
async function updateUser(id, data) {
  const user = await db.users.update(id, data);
  await redis.del(`user:${id}`);                  // delete, don't update
  // Deleting is safer than updating — avoids race conditions where a
  // concurrent write leaves a stale value in the cache
  return user;
}

// Invalidate related keys
await redis.del(`user:${id}`, `user:${id}:posts`, 'users:list');

// Tag-based invalidation with a set
await redis.sadd(`tag:user:${id}`, `user:${id}`, `user:${id}:posts`);
const keys = await redis.smembers(`tag:user:${id}`);
if (keys.length) await redis.del(...keys, `tag:user:${id}`);
```

## What is cache stampede and how do you prevent it?

### Answer

A popular key expires and 1,000 concurrent requests all miss the cache and hit the database simultaneously — often taking it down.

```js
// ===== SOLUTION 1: Lock (single-flight) =====
async function getWithLock(key, fetchFn, ttl = 3600) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);

  if (!acquired) {
    // Someone else is rebuilding — wait briefly and retry
    await new Promise((r) => setTimeout(r, 50));
    return getWithLock(key, fetchFn, ttl);
  }

  try {
    const data = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } finally {
    await redis.del(lockKey);
  }
}

// ===== SOLUTION 2: Probabilistic early expiry =====
// Rebuild BEFORE expiry, with increasing probability as TTL approaches 0
async function getWithEarlyRefresh(key, fetchFn, ttl = 3600, beta = 1) {
  const [value, remaining] = await redis.multi().get(key).ttl(key).exec();
  if (!value[1]) return refresh();

  const elapsed = ttl - remaining[1];
  const shouldRefresh = Math.random() < beta * (elapsed / ttl) ** 3;
  if (shouldRefresh) refresh().catch(() => {});   // refresh in background

  return JSON.parse(value[1]);
}

// ===== SOLUTION 3: Jittered TTL =====
// Prevents thousands of keys expiring at the exact same second
const ttl = 3600 + Math.floor(Math.random() * 600);
await redis.setex(key, ttl, value);

// ===== SOLUTION 4: Stale-while-revalidate =====
async function getSWR(key, fetchFn, { ttl = 300, staleTtl = 3600 } = {}) {
  const raw = await redis.get(key);
  if (raw) {
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      refresh(key, fetchFn, ttl, staleTtl).catch(() => {});  // background
    }
    return data;                    // serve stale immediately
  }
  return refresh(key, fetchFn, ttl, staleTtl);
}
```

### The other two cache problems

| Problem | What happens | Fix |
|---|---|---|
| **Stampede / dogpile** | Hot key expires, everyone hits the DB | Lock, early refresh, jitter |
| **Penetration** | Requests for keys that don't exist bypass the cache every time | Cache the negative result (`null` with a short TTL), bloom filter |
| **Avalanche** | Many keys expire at once (e.g. after a restart) | Jittered TTLs, warm the cache on startup |

```js
// Cache penetration fix — cache the "not found" too
const cached = await redis.get(key);
if (cached === 'NULL') return null;      // known-missing
if (cached) return JSON.parse(cached);

const user = await db.users.findById(id);
if (!user) {
  await redis.setex(key, 60, 'NULL');    // short TTL for negatives
  return null;
}
```

**Interview Tip:** Cache stampede is the highest-signal caching question. Give the lock solution first, then mention jittered TTLs as the cheap preventative measure. Both together is the production answer.

---

# Persistence

## How does Redis persist data?

### Answer

| | RDB (snapshot) | AOF (append-only file) |
|---|---|---|
| What | Point-in-time binary dump | Log of every write command |
| File size | Compact | Larger |
| Restart speed | **Fast** | Slower (replays commands) |
| Data loss window | Minutes (since the last snapshot) | ≤1 second with `everysec` |
| Fork cost | Yes, can spike memory | Rewrite forks periodically |
| Best for | Backups, disaster recovery | Durability |

```bash
# RDB
save 900 1        # snapshot if ≥1 key changed in 900s
save 300 10
save 60 10000
dbfilename dump.rdb

# AOF
appendonly yes
appendfsync everysec     # always | everysec ✅ | no
auto-aof-rewrite-percentage 100    # rewrite when the file doubles

# Both together — the recommended production setup
# AOF for durability, RDB for fast restarts and backups
```

```bash
BGSAVE          # background snapshot
BGREWRITEAOF    # compact the AOF
LASTSAVE        # timestamp of the last successful save
```

### Redis 7+ multi-part AOF

Redis 7 splits the AOF into a base RDB file plus incremental files, which makes rewrites much cheaper.

**Interview Tip:** `appendfsync always` gives near-zero data loss but roughly halves throughput. `everysec` is the standard tradeoff: at most one second of writes lost. Know that Redis is a **cache with persistence**, not a database with durability guarantees — if losing a second of data is unacceptable, it belongs in Postgres.

**Common Mistakes:** Forgetting the fork cost — `BGSAVE` forks the process, and copy-on-write can temporarily double memory usage on a write-heavy instance. That's why `maxmemory` should be ~50–60% of available RAM.

---

# Pub/Sub & Streams

## What is the difference between Pub/Sub and Streams?

### Answer

| | Pub/Sub | Streams |
|---|---|---|
| Persistence | **None** — fire and forget | Stored, replayable |
| Offline subscriber | Message lost | Message waiting |
| Consumer groups | ❌ | ✅ |
| Acknowledgement | ❌ | ✅ `XACK` |
| Message history | ❌ | ✅ |
| Use for | Live notifications, cache invalidation | Job queues, event sourcing, CDC |

### Pub/Sub

```js
// Publisher
await redis.publish('notifications', JSON.stringify({ userId: 1, text: 'Hi' }));

// Subscriber — needs a SEPARATE connection (a subscribed client can't run other commands)
const sub = redis.duplicate();
await sub.subscribe('notifications');
sub.on('message', (channel, message) => {
  io.to(`user:${JSON.parse(message).userId}`).emit('notification', message);
});

// Pattern subscription
await sub.psubscribe('user:*:events');
sub.on('pmessage', (pattern, channel, message) => { … });
```

### Streams — reliable queues

```js
// Producer
await redis.xadd('orders', '*', 'orderId', '123', 'total', '2499');

// Consumer group — each message delivered to ONE consumer in the group
await redis.xgroup('CREATE', 'orders', 'workers', '$', 'MKSTREAM');

while (true) {
  const messages = await redis.xreadgroup(
    'GROUP', 'workers', 'worker-1',
    'COUNT', 10, 'BLOCK', 5000,
    'STREAMS', 'orders', '>'
  );
  if (!messages) continue;

  for (const [stream, entries] of messages) {
    for (const [id, fields] of entries) {
      try {
        await processOrder(fields);
        await redis.xack('orders', 'workers', id);      // mark as done
      } catch (err) {
        // Not acked → stays in the Pending Entries List for retry
        logger.error({ err, id }, 'Processing failed');
      }
    }
  }
}

// Reclaim messages from a crashed consumer
const stuck = await redis.xautoclaim('orders', 'workers', 'worker-2', 60000, '0');

// Cap the stream so it doesn't grow forever
await redis.xadd('orders', 'MAXLEN', '~', '10000', '*', 'data', 'x');
```

**Interview Tip:** The critical Pub/Sub caveat: **messages are not persisted**. If a subscriber is disconnected for even a second, those messages are gone forever. For anything that must be processed, use Streams or a real queue.

---

# Transactions & Lua

## How do Redis transactions work?

### Answer

```bash
MULTI          # start queueing commands
  SET key1 val1
  INCR counter
EXEC           # execute ALL queued commands atomically
DISCARD        # cancel

WATCH key      # optimistic lock — abort EXEC if `key` changed
```

```js
// Optimistic locking with WATCH
async function transferPoints(from, to, amount) {
  await redis.watch(`user:${from}:points`);

  const balance = Number(await redis.get(`user:${from}:points`));
  if (balance < amount) {
    await redis.unwatch();
    throw new Error('Insufficient points');
  }

  const results = await redis
    .multi()
    .decrby(`user:${from}:points`, amount)
    .incrby(`user:${to}:points`, amount)
    .exec();

  if (results === null) {
    // Someone modified the watched key → retry
    return transferPoints(from, to, amount);
  }
}
```

### ⚠️ Redis transactions are NOT like SQL transactions

- **No rollback.** If one command fails at runtime (wrong type), the others still execute.
- Syntax errors abort the whole transaction at queue time.
- There's no isolation level — just "these commands run consecutively without interleaving".

## Lua scripts — true atomicity

```js
// Lua scripts run atomically and can contain logic
const script = `
  local current = tonumber(redis.call('GET', KEYS[1]) or 0)
  local amount  = tonumber(ARGV[1])

  if current < amount then
    return -1
  end

  redis.call('DECRBY', KEYS[1], amount)
  redis.call('INCRBY', KEYS[2], amount)
  return current - amount
`;

const remaining = await redis.eval(script, 2, 'user:1:points', 'user:2:points', 100);
if (remaining === -1) throw new Error('Insufficient points');

// Register once, call by SHA (less network traffic)
const sha = await redis.script('LOAD', script);
await redis.evalsha(sha, 2, key1, key2, 100);
```

**Interview Tip:** Lua is the correct answer for any "check then act" operation — decrement stock if available, rate limit, atomic lock release. `MULTI/EXEC` can't do conditional logic, `WATCH` requires retry loops, but Lua runs the whole thing atomically on the server. Keep scripts short — they block the single thread.

---

# Distributed Locks

## How do you implement a distributed lock in Redis?

### Answer

```js
// ===== BASIC LOCK =====
async function acquireLock(resource, ttlMs = 10_000) {
  const token = crypto.randomUUID();            // unique per acquisition
  const acquired = await redis.set(
    `lock:${resource}`,
    token,
    'NX',          // only if it doesn't exist
    'PX', ttlMs    // auto-expire — prevents deadlock if the holder crashes
  );
  return acquired ? token : null;
}

// ===== RELEASE — must be atomic and token-checked =====
const releaseScript = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

async function releaseLock(resource, token) {
  return redis.eval(releaseScript, 1, `lock:${resource}`, token);
}

// ⚠️ WHY the token check matters:
//   1. Process A acquires the lock with a 10s TTL
//   2. Process A stalls (GC pause) for 11s → the lock EXPIRES
//   3. Process B acquires the lock
//   4. Process A wakes up and calls DEL → deletes B's lock! 💥
//   The token check makes step 4 a no-op.

// ===== USAGE =====
async function withLock(resource, fn, { ttlMs = 10_000, retries = 3 } = {}) {
  for (let i = 0; i < retries; i++) {
    const token = await acquireLock(resource, ttlMs);
    if (token) {
      try {
        return await fn();
      } finally {
        await releaseLock(resource, token);
      }
    }
    await new Promise((r) => setTimeout(r, 100 * 2 ** i));
  }
  throw new Error(`Could not acquire lock on ${resource}`);
}

await withLock('order:123:payment', async () => {
  await chargeCustomer();
});
```

### Lock extension (watchdog)

```js
// For long jobs — extend the TTL while still working
const extendScript = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

const watchdog = setInterval(
  () => redis.eval(extendScript, 1, `lock:${resource}`, token, 10_000),
  3_000
);
// clearInterval(watchdog) in the finally block
```

### Redlock

For multi-node Redis, the Redlock algorithm acquires the lock on a majority of N independent masters. It's controversial — Martin Kleppmann's critique argues it's unsafe under clock drift and GC pauses.

**Interview Tip:** Be honest about the limits: *"A Redis lock is a good performance optimisation to avoid duplicate work, but it is not a correctness guarantee. For anything where a double-execution is unacceptable — charging a card, for instance — I'd back it with an idempotency key in the database, so even if the lock fails, the operation is safe to repeat."* That answer stands out.

---

# Rate Limiting

## How do you implement rate limiting with Redis?

### Answer

```js
// ===== 1. FIXED WINDOW — simplest, but allows 2× burst at boundaries =====
async function fixedWindow(userId, limit = 100, windowSec = 60) {
  const key = `rl:${userId}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
// ⚠️ 100 requests at 11:59:59 + 100 at 12:00:01 = 200 in 2 seconds

// ===== 2. SLIDING WINDOW LOG — accurate, more memory =====
const slidingWindowScript = `
  local key    = KEYS[1]
  local now    = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit  = tonumber(ARGV[3])

  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)   -- drop old entries
  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, now .. '-' .. math.random())
    redis.call('PEXPIRE', key, window)
    return {1, limit - count - 1}
  end
  return {0, 0}
`;

async function slidingWindow(userId, limit = 100, windowMs = 60_000) {
  const [allowed, remaining] = await redis.eval(
    slidingWindowScript, 1, `rl:${userId}`, Date.now(), windowMs, limit
  );
  return { allowed: allowed === 1, remaining };
}

// ===== 3. TOKEN BUCKET — allows controlled bursts =====
const tokenBucketScript = `
  local key      = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local rate     = tonumber(ARGV[2])     -- tokens per second
  local now      = tonumber(ARGV[3])
  local cost     = tonumber(ARGV[4])

  local bucket = redis.call('HMGET', key, 'tokens', 'ts')
  local tokens = tonumber(bucket[1]) or capacity
  local last   = tonumber(bucket[2]) or now

  tokens = math.min(capacity, tokens + (now - last) * rate)

  if tokens >= cost then
    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
    redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)
    return {1, math.floor(tokens)}
  end

  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)
  return {0, 0}
`;

// ===== EXPRESS MIDDLEWARE =====
const rateLimiter = (limit, windowMs) => async (req, res, next) => {
  const key = req.user?.id ?? req.ip;
  const { allowed, remaining } = await slidingWindow(key, limit, windowMs);

  res.set({
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': remaining,
  });

  if (!allowed) {
    res.set('Retry-After', Math.ceil(windowMs / 1000));
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
};

app.use('/api', rateLimiter(1000, 60_000));
app.use('/api/auth/login', rateLimiter(5, 900_000));
```

**Interview Tip:** Explain the fixed-window boundary burst problem, then offer the sliding window as the fix. Mentioning that the whole thing must be a Lua script (so the check and increment are atomic) is what separates a correct answer from a racy one.

---

# Sessions & Queues

## How do you use Redis for sessions and job queues?

### Answer

```js
// ===== SESSIONS with Express =====
import session from 'express-session';
import RedisStore from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redis, prefix: 'sess:', ttl: 86400 }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400_000 },
}));

// Manual session management
await redis.setex(`sess:${sessionId}`, 86400, JSON.stringify({ userId, role }));
await redis.sadd(`user:${userId}:sessions`, sessionId);   // track for "logout everywhere"

async function logoutAll(userId) {
  const sessions = await redis.smembers(`user:${userId}:sessions`);
  if (sessions.length) {
    await redis.del(...sessions.map((s) => `sess:${s}`), `user:${userId}:sessions`);
  }
}

// ===== JOB QUEUE with BullMQ =====
import { Queue, Worker, QueueEvents } from 'bullmq';

const emailQueue = new Queue('emails', { connection: redis });

await emailQueue.add(
  'welcome',
  { userId: 1, email: 'a@b.com' },
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
    delay: 5000,              // schedule for later
    priority: 1,
  }
);

// Repeatable (cron) job
await emailQueue.add('daily-digest', {}, {
  repeat: { pattern: '0 9 * * *' },   // every day at 9am
});

const worker = new Worker('emails', async (job) => {
  await job.updateProgress(50);
  await sendEmail(job.data);
  return { sent: true };
}, {
  connection: redis,
  concurrency: 5,
  limiter: { max: 100, duration: 60_000 },   // respect provider rate limits
});

worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Job done'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Job failed'));

// Graceful shutdown — finish in-flight jobs
process.on('SIGTERM', async () => {
  await worker.close();
  await emailQueue.close();
});
```

### Simple queue without a library

```js
// Producer
await redis.lpush('queue:emails', JSON.stringify(job));

// Worker — BRPOPLPUSH is reliable: the job moves to a processing list atomically
while (running) {
  const raw = await redis.brpoplpush('queue:emails', 'queue:emails:processing', 5);
  if (!raw) continue;

  try {
    await handle(JSON.parse(raw));
    await redis.lrem('queue:emails:processing', 1, raw);   // done
  } catch (err) {
    await redis.lrem('queue:emails:processing', 1, raw);
    await redis.lpush('queue:emails:failed', raw);          // dead letter
  }
}
```

**Interview Tip:** `BRPOPLPUSH` (or `LMOVE` in Redis 6.2+) is the reliable-queue primitive — the job is never in limbo. With a plain `BRPOP`, a worker that crashes after popping loses the job entirely.

---

# Scaling

## How do you scale Redis?

### Answer

| Approach | What it gives you |
|---|---|
| **Replication** | Read scaling + failover source |
| **Sentinel** | Automatic failover for a primary/replica setup |
| **Cluster** | Horizontal sharding across 16,384 hash slots |
| **Client-side sharding** | Manual partitioning (rarely needed now) |

```bash
# Replication
REPLICAOF primary-host 6379
INFO replication

# Sentinel — monitors and promotes a replica on failure
sentinel monitor mymaster 127.0.0.1 6379 2      # quorum of 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000

# Cluster — data split across nodes by CRC16(key) % 16384
CLUSTER INFO
CLUSTER NODES
CLUSTER KEYSLOT mykey
```

### Hash tags — keeping related keys on the same node

```bash
# ❌ These may land on different nodes → multi-key operations fail
MSET user:1:name "A" user:1:email "a@b.com"

# ✅ The {…} part determines the slot — both land together
MSET {user:1}:name "A" {user:1}:email "a@b.com"
```

### Cluster limitations

- Multi-key operations only work within one hash slot
- No cross-slot transactions or Lua scripts
- `SELECT` (multiple databases) is not supported
- Client must be cluster-aware to follow `MOVED`/`ASK` redirects

**Interview Tip:** Redis Cluster only makes sense when your data exceeds a single node's RAM or you need write throughput beyond one node. For read scaling, replicas are far simpler. Most applications never need Cluster — they need a bigger instance and better key design.

---

# Node.js Usage

```js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => err.message.includes('READONLY'),   // failover
});

redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));

// ===== PIPELINE — batch commands into one round trip =====
const results = await redis
  .pipeline()
  .get('key1')
  .hgetall('user:1')
  .zrevrange('leaderboard', 0, 9, 'WITHSCORES')
  .exec();
// 1 network round trip instead of 3 — huge win over a slow network

// Pipeline in a loop
const pipeline = redis.pipeline();
for (const id of userIds) pipeline.get(`user:${id}`);
const values = await pipeline.exec();

// ===== A REUSABLE CACHE WRAPPER =====
function createCache(redis, { prefix = 'cache:', defaultTtl = 3600 } = {}) {
  return {
    async get(key) {
      const raw = await redis.get(prefix + key);
      return raw ? JSON.parse(raw) : null;
    },

    async set(key, value, ttl = defaultTtl) {
      const jittered = ttl + Math.floor(Math.random() * ttl * 0.1);   // avoid avalanche
      return redis.setex(prefix + key, jittered, JSON.stringify(value));
    },

    async del(...keys) {
      return redis.del(...keys.map((k) => prefix + k));
    },

    // Cache-aside with single-flight protection
    async wrap(key, fn, ttl = defaultTtl) {
      const cached = await this.get(key);
      if (cached !== null) return cached;

      const lockKey = `${prefix}lock:${key}`;
      const token = await redis.set(lockKey, '1', 'NX', 'PX', 5000);

      if (!token) {
        await new Promise((r) => setTimeout(r, 50));
        return this.wrap(key, fn, ttl);
      }

      try {
        const value = await fn();
        if (value !== undefined) await this.set(key, value, ttl);
        return value;
      } finally {
        await redis.del(lockKey);
      }
    },

    // Invalidate by pattern — SCAN, never KEYS
    async invalidatePattern(pattern) {
      let cursor = '0';
      let deleted = 0;
      do {
        const [next, keys] = await redis.scan(
          cursor, 'MATCH', prefix + pattern, 'COUNT', 100
        );
        cursor = next;
        if (keys.length) {
          await redis.unlink(...keys);      // UNLINK = non-blocking DEL
          deleted += keys.length;
        }
      } while (cursor !== '0');
      return deleted;
    },
  };
}

const cache = createCache(redis);
const user = await cache.wrap(`user:${id}`, () => db.users.findById(id), 3600);
```

**Interview Tip:** Two production details worth stating: use **`SCAN` not `KEYS`** (KEYS blocks the single thread and can freeze the server for seconds on a large keyspace), and use **`UNLINK` not `DEL`** for large keys (UNLINK frees memory in a background thread).

---

# Rapid Fire

**Why is Redis single-threaded and still fast?**
No lock contention, no context switching, everything in RAM, and I/O multiplexing handles concurrency. Redis 6+ threads network I/O but not command execution.

**What is the max value size?**
512 MB per string. In practice keep values well under 1 MB — large values block the thread while being transferred.

**What is `KEYS` vs `SCAN`?**
`KEYS` blocks until it scans the entire keyspace — never use in production. `SCAN` is a cursor-based iterator that returns in small batches.

**What is `DEL` vs `UNLINK`?**
`DEL` frees memory synchronously (blocking for large collections). `UNLINK` removes the key immediately and frees memory in a background thread.

**What is the difference between `SET NX` and `SETNX`?**
Same effect, but `SET key val NX EX 10` sets the value and TTL atomically. Legacy `SETNX` + `EXPIRE` is two commands — a crash between them leaves a lock with no expiry.

**How many databases does Redis have?**
16 by default (`SELECT 0-15`). They share one process and memory limit, and Cluster doesn't support them. Prefer key prefixes or separate instances.

**What is `INFO`?**
Server stats — memory, clients, persistence, replication, keyspace, hit rate.

**How do you check the cache hit ratio?**
`INFO stats` → `keyspace_hits / (keyspace_hits + keyspace_misses)`.

**What is `MEMORY USAGE key`?**
Bytes consumed by a specific key — useful for finding the keys eating your memory.

**What is `OBJECT ENCODING`?**
The internal representation. Small hashes/lists/sets use compact encodings (`listpack`, `intset`) and switch to the general form above configured thresholds.

**What is `maxmemory-policy noeviction` doing in production?**
Causing write errors once memory fills. Fine for a queue/session store where you'd rather error than lose data; wrong for a pure cache.

**What is a hot key?**
A single key receiving a disproportionate share of traffic, saturating one node. Fix by sharding the key (`counter:1`…`counter:10`) or adding a local in-process cache.

**What is Redis Sentinel vs Cluster?**
Sentinel = automatic failover for a single primary. Cluster = sharding across multiple primaries, with its own failover.

**What is the difference between Redis and Memcached?**
Redis has rich data structures, persistence, replication, Lua, pub/sub and streams. Memcached is a simpler multi-threaded key-value cache. Redis wins almost every comparison now.

**How do you do a "get or set" atomically?**
`SET key value NX` for the simple case; a Lua script when you need logic.

**How do you store a JSON object?**
Serialise into a string (simple), a Hash (field-level updates), or use the RedisJSON module (path-level queries and updates).

**What is RedisJSON / RediSearch?**
Modules adding native JSON documents with path queries, and a full secondary indexing and query engine on top of Redis.

**How do you back up Redis?**
Copy the RDB file (after `BGSAVE`), or use managed snapshots. AOF gives finer-grained recovery.

**How do you monitor Redis?**
`INFO`, `SLOWLOG GET`, `LATENCY DOCTOR`, `MONITOR` (dev only — it echoes every command and hurts performance), plus Prometheus exporters.

**What is `SLOWLOG`?**
A log of commands exceeding `slowlog-log-slower-than` microseconds. First place to look when Redis feels slow.

**What is a keyspace notification?**
Events published when keys change or expire — `notify-keyspace-events Ex` lets you react to expirations (a delayed-job trick, though Streams are more reliable).

**Should Redis be your primary database?**
Generally no. Use it as a cache, session store and queue alongside a durable database. Redis persistence is good, but its guarantees are weaker than a real ACID store.

---

## 📌 Interview Checklist

- [ ] Why is single-threaded Redis fast, and what's the downside?
- [ ] Pick the right data structure for a leaderboard, a queue and a DAU count
- [ ] Explain cache-aside and cache invalidation strategy
- [ ] What is cache stampede and how do you prevent it?
- [ ] Write a correct distributed lock (and explain the token check)
- [ ] Implement sliding-window rate limiting in Lua
- [ ] RDB vs AOF — what does each lose in a crash?
- [ ] Pub/Sub vs Streams — when does each fail you?
- [ ] Why is `KEYS *` dangerous in production?
- [ ] What eviction policy would you set for a pure cache, and why?
