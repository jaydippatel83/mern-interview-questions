# 🏗️ System Design Interview Questions

> Scalability · Caching · Load balancing · Databases · Queues · Microservices · Case studies

---

## Table of Contents

1. [How to Approach a System Design Interview](#how-to-approach-a-system-design-interview)
2. [Core Concepts](#core-concepts)
3. [Scalability](#scalability)
4. [Load Balancing](#load-balancing)
5. [Caching](#caching)
6. [Databases at Scale](#databases-at-scale)
7. [CAP Theorem & Consistency](#cap-theorem--consistency)
8. [Message Queues](#message-queues)
9. [API Design](#api-design)
10. [Microservices](#microservices)
11. [Reliability](#reliability)
12. [Observability](#observability)
13. [Case Studies](#case-studies)
14. [Rapid Fire](#rapid-fire)

---

# How to Approach a System Design Interview

## The 6-step framework

### 1. Requirements (5 min) — never skip this

```
FUNCTIONAL — what does it do?
  "Users can shorten a URL and be redirected"
  "Users can see their link's click count"

NON-FUNCTIONAL — how well must it do it?
  Scale:        100M URLs/day, 10:1 read:write
  Latency:      redirect < 100ms p99
  Availability: 99.9% (redirects matter more than creation)
  Consistency:  eventual is fine for analytics, strong for the mapping
  Durability:   links must not disappear

OUT OF SCOPE — say it explicitly
  "I'll skip auth and the admin dashboard unless you want them"
```

### 2. Capacity estimation (5 min)

```
Writes:  100M/day ÷ 86,400s ≈ 1,160 writes/sec
Reads:   10× that            ≈ 11,600 reads/sec
Peak:    2–3× average        ≈ 35,000 reads/sec

Storage per URL:
  short code (7)  + long URL (100) + user id (8) + timestamp (8) + counters (8)
  ≈ 130 bytes → round to 500 bytes with indexes and overhead

  100M/day × 500 B = 50 GB/day
                   = 18 TB/year
                   = 90 TB over 5 years

Bandwidth:
  Writes: 1,160 × 500 B  ≈ 0.6 MB/s
  Reads:  11,600 × 500 B ≈ 6 MB/s

Cache (80/20 rule — 20% of links get 80% of traffic):
  Daily reads = 1B → cache the hot 20% = 200M × 500 B = 100 GB
  → a few Redis nodes
```

**Useful numbers to memorise:**
```
1 day        = 86,400 s ≈ 10⁵ s
1 million/day ≈ 12/sec
1 billion/day ≈ 12,000/sec

L1 cache            0.5 ns
Main memory        100 ns
SSD random read     16 µs      (150,000×  RAM)
Network same DC    500 µs
Disk seek           2 ms
Network CA→NL      150 ms

1 char = 1 byte,  1 int = 4 bytes,  timestamp = 8 bytes
```

### 3. High-level design (10 min)

Draw boxes and arrows. Client → LB → API → cache → DB → queue → workers.

### 4. Deep dive (15 min)

The interviewer picks one area. Be ready to go deep on: the data model, the key algorithm, and the biggest bottleneck.

### 5. Bottlenecks & scaling (5 min)

Single points of failure, hot spots, what breaks at 10×.

### 6. Wrap up (2 min)

Trade-offs you made, what you'd monitor, what you'd do with more time.

**Interview Tip:** The most common failure is jumping straight to boxes and arrows. Spend the first five minutes on requirements — interviewers are scoring whether you can scope an ambiguous problem, not whether you can name technologies.

---

# Core Concepts

## What is latency vs throughput vs availability?

### Answer

| Term | Definition | Measured in |
|---|---|---|
| **Latency** | Time for one request | ms (use p50/p95/p99, never the average) |
| **Throughput** | Requests handled per unit time | req/sec, QPS |
| **Availability** | % of time the system works | "nines" |
| **Durability** | Probability data survives | "nines" |

### Availability targets

| Availability | Downtime/year | Downtime/month |
|---|---|---|
| 99% (two nines) | 3.65 days | 7.2 hours |
| 99.9% (three) | 8.76 hours | 43 minutes |
| 99.99% (four) | 52 minutes | 4.3 minutes |
| 99.999% (five) | 5.26 minutes | 26 seconds |

Each nine costs roughly 10× more to achieve.

### Why percentiles, not averages

```
Latencies: 10, 10, 10, 10, 10, 10, 10, 10, 10, 5000 ms

Average = 510 ms   ← hides everything
p50     = 10 ms
p99     = 5000 ms  ← this is what 1% of users actually experience
```

At scale, p99 matters enormously: if a page makes 100 backend calls, **most page loads hit at least one p99 request**.

**Interview Tip:** Say "tail latency" and explain the fan-out amplification above. It's a strong signal you've operated real systems.

---

# Scalability

## Vertical vs horizontal scaling

### Answer

| | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| How | Bigger machine | More machines |
| Limit | Hardware ceiling | Practically unlimited |
| Cost curve | Exponential | Linear |
| Complexity | Low — no code changes | High — distribution, consistency |
| Failure | Single point of failure | Fault tolerant |
| Downtime to scale | Usually yes | No |

### Example

```
Vertical:  4 vCPU / 16 GB  →  64 vCPU / 512 GB
  ✅ Simple, no code changes
  ❌ 10× price for 4× capacity; still one machine that can die

Horizontal: 1 server → 10 servers behind a load balancer
  ✅ Cheap commodity hardware, fault tolerant
  ❌ Requires stateless services, distributed sessions, data partitioning
```

**The prerequisite for horizontal scaling: statelessness.** No local session storage, no in-memory data that other instances need, no local file writes.

```js
// ❌ Breaks horizontal scaling
const sessions = new Map();               // only on THIS instance
app.post('/upload', (req, res) => fs.writeFileSync('./uploads/x', data));

// ✅ Externalise all state
await redis.setex(`sess:${id}`, 3600, data);   // shared
await s3.putObject({ Bucket, Key, Body });     // shared
```

**Interview Tip:** The practical answer is "scale vertically until it hurts, then horizontally." Vertical scaling is genuinely underrated — a single modern server handles enormous load, and it avoids all the distributed-systems complexity.

---

# Load Balancing

## How does load balancing work?

### Answer

```
              ┌──────────────┐
Clients ────> │ Load Balancer │
              └───┬───┬───┬──┘
          ┌───────┘   │   └───────┐
          ▼           ▼           ▼
      ┌───────┐  ┌───────┐  ┌───────┐
      │Server1│  │Server2│  │Server3│
      └───────┘  └───────┘  └───────┘
```

### Layer 4 vs Layer 7

| | L4 (transport) | L7 (application) |
|---|---|---|
| Routes on | IP + port | URL, headers, cookies |
| Speed | Faster | Slower (parses HTTP) |
| Features | Basic | Path routing, SSL termination, compression, WAF |
| Examples | AWS NLB, HAProxy TCP | AWS ALB, Nginx, Envoy, Traefik |

### Algorithms

| Algorithm | Behaviour | Best for |
|---|---|---|
| Round robin | Sequential | Equal servers, equal requests |
| Weighted round robin | Proportional to capacity | Mixed instance sizes |
| Least connections | Fewest active connections | Long-lived connections |
| Least response time | Fastest server | Variable workloads |
| IP hash | Same client → same server | Sticky sessions |
| Consistent hashing | Minimal remapping when nodes change | Caching layers, sharding |

### Health checks

```nginx
upstream backend {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 backup;          # only used if others are down
    keepalive 32;
}
```

### Consistent hashing — why it matters

```
Naive:  server = hash(key) % N
  Add one server (N: 4 → 5) → ~80% of keys remap → cache stampede

Consistent hashing:
  Servers and keys placed on a ring; a key goes to the next server clockwise.
  Adding a server remaps only ~1/N of keys.
  Virtual nodes (100–200 per physical node) smooth out the distribution.
```

**Interview Tip:** Consistent hashing is asked in almost every distributed-systems interview. Know the ring, know virtual nodes, and know the use cases: distributed caches (Memcached), sharded databases (Cassandra, DynamoDB), and CDN routing.

---

# Caching

## Where can you cache and what are the strategies?

### Answer

```
Browser cache  →  CDN  →  Load balancer  →  App (in-memory)  →  Redis  →  DB query cache
   fastest ←──────────────────────────────────────────────────────────→ slowest
```

| Layer | TTL | Use for |
|---|---|---|
| Browser | minutes–year | Static assets (hashed filenames → `immutable`) |
| CDN | minutes–days | Images, JS/CSS, public API responses |
| Application (in-process) | seconds | Config, feature flags, hot lookups |
| Distributed (Redis) | minutes–hours | Sessions, query results, computed data |
| Database | — | Query plans, buffer pool |

### Strategies

| Pattern | Write path | Read path |
|---|---|---|
| **Cache-aside** | App writes DB, invalidates cache | Check cache → miss → DB → populate |
| **Read-through** | — | Cache library fetches from DB on miss |
| **Write-through** | Write cache + DB together | Always a hit |
| **Write-behind** | Write cache, async flush to DB | Fast writes, risk of loss |
| **Refresh-ahead** | Proactively refresh before expiry | No miss latency |

### The three cache failure modes

| Problem | Cause | Fix |
|---|---|---|
| **Stampede** | Hot key expires, everyone hits the DB | Lock/single-flight, early refresh |
| **Penetration** | Requests for non-existent keys always miss | Cache negatives, bloom filter |
| **Avalanche** | Many keys expire at once | Jittered TTLs, warm on startup |

```js
// Cache-aside with stampede protection and jitter
async function get(key, fetchFn, ttl = 300) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  const lock = await redis.set(`lock:${key}`, '1', 'NX', 'EX', 10);
  if (!lock) {
    await sleep(50);
    return get(key, fetchFn, ttl);          // wait for the winner
  }

  try {
    const data = await fetchFn();
    const jittered = ttl + Math.random() * ttl * 0.1;   // spread expiries
    await redis.setex(key, jittered, JSON.stringify(data));
    return data;
  } finally {
    await redis.del(`lock:${key}`);
  }
}
```

### Cache invalidation

```js
// TTL — simplest, eventually consistent
// Event-based — invalidate on write (delete, don't update)
await db.users.update(id, data);
await redis.del(`user:${id}`, `user:${id}:profile`);

// Versioned keys — no deletion needed
const version = await redis.incr(`user:${id}:ver`);
const key = `user:${id}:v${version}`;    // old keys expire naturally
```

**Interview Tip:** Phil Karlton's line — *"There are only two hard things in Computer Science: cache invalidation and naming things"* — is worth quoting, but follow it with a concrete strategy. The practical answer: short TTLs for tolerable staleness, event-based invalidation for anything user-visible, and versioned keys when invalidation is complex.

---

# Databases at Scale

## SQL vs NoSQL — how do you choose?

### Answer

| | SQL | NoSQL |
|---|---|---|
| Schema | Fixed, enforced | Flexible |
| Scaling | Vertical + read replicas; sharding is hard | Horizontal by design |
| Transactions | Full ACID | Varies (often per-document) |
| Joins | Native | Manual / denormalised |
| Consistency | Strong | Often eventual |
| Best for | Financial data, complex relations, reporting | High write volume, flexible schema, huge scale |

### The NoSQL families

| Type | Examples | Use for |
|---|---|---|
| Document | MongoDB, DynamoDB | Catalogs, user profiles, CMS |
| Key-value | Redis, DynamoDB | Caching, sessions |
| Wide-column | Cassandra, HBase | Time series, huge write volume |
| Graph | Neo4j | Social graphs, recommendations, fraud |
| Search | Elasticsearch | Full-text search, log analytics |
| Time series | InfluxDB, TimescaleDB | Metrics, IoT |

**Interview Tip:** The mature answer is **polyglot persistence**: *"Postgres as the system of record, Redis for cache and sessions, Elasticsearch for search, S3 for blobs, and a queue for async work."* Rarely one database for everything.

---

## Replication, sharding and partitioning

### Answer

**Replication** — copies of the same data.

```
              ┌──────────┐
Writes ──────>│ PRIMARY  │
              └────┬─────┘
       ┌───────────┴───────────┐
       ▼                       ▼
  ┌─────────┐            ┌─────────┐
  │ REPLICA │            │ REPLICA │  ← reads
  └─────────┘            └─────────┘
```

| | Synchronous | Asynchronous |
|---|---|---|
| Write latency | Higher | Lower |
| Data loss on failover | None | Possible (replication lag) |
| Consistency | Strong | Eventual |

⚠️ **The read-after-write problem:** a user updates their profile, is routed to a replica that hasn't caught up, and sees the old data. Fixes: read from the primary for a short window after a write, sticky routing, or version tokens.

**Sharding** — splitting data across independent databases.

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Range** | `A–M` → shard 1, `N–Z` → shard 2 | Range queries work | Hot spots |
| **Hash** | `hash(key) % N` | Even distribution | Resharding is painful |
| **Consistent hash** | Ring | Minimal remap when scaling | More complex |
| **Directory** | Lookup service | Flexible | Lookup is a SPOF |
| **Geographic** | By region | Low latency, data residency | Uneven load |

### Choosing a shard key

```
Requirements: high cardinality, even distribution, most queries include it

❌ timestamp        → all writes hit the newest shard
❌ status/country   → low cardinality, hot spots
✅ user_id (hashed) → even, and most queries are per-user
✅ tenant_id        → natural isolation for B2B SaaS
```

### The costs of sharding

- No cross-shard joins
- No cross-shard transactions (need 2PC or sagas)
- Resharding is a major migration
- Every query must route correctly

**Interview Tip:** Always say **"shard last."** The order is: add indexes → add a cache → add read replicas → denormalise → archive old data → *then* shard. Sharding permanently increases operational complexity.

---

# CAP Theorem & Consistency

## What is the CAP theorem?

### Answer

In a distributed system you can guarantee at most **two** of:

- **C**onsistency — every read sees the most recent write
- **A**vailability — every request gets a response
- **P**artition tolerance — the system works despite network failures

Since network partitions **will** happen, the real choice is **CP or AP**.

```
        Consistency
           /\
          /  \
   CP    /    \    CA (only in a single node —
        /      \       not achievable in practice)
       /________\
Partition      Availability
tolerance          AP
```

| Choice | Behaviour during a partition | Examples |
|---|---|---|
| **CP** | Refuse requests rather than serve stale data | MongoDB, HBase, Zookeeper, etcd |
| **AP** | Serve possibly-stale data, reconcile later | Cassandra, DynamoDB, CouchDB |

### PACELC — the more complete model

> **If** there is a **P**artition, choose **A** or **C**; **E**lse (normal operation), choose **L**atency or **C**onsistency.

This captures the everyday tradeoff CAP ignores: even with no partition, stronger consistency costs latency.

### Consistency models

| Model | Guarantee |
|---|---|
| **Strong / linearizable** | Reads always see the latest write |
| **Sequential** | All nodes see operations in the same order |
| **Causal** | Causally related operations are ordered |
| **Read-your-writes** | You see your own updates |
| **Monotonic reads** | You never see time go backwards |
| **Eventual** | Given no new writes, replicas converge |

### Where each fits

```
Bank balance         → strong consistency (CP)
Shopping cart        → eventual, merge conflicts (AP)
Social media likes   → eventual (nobody dies if the count lags 2s)
Inventory checkout   → strong at the moment of purchase
DNS                  → eventual, by design
```

**Interview Tip:** Don't just recite CAP — apply it. *"For the payment path I need CP: I'd rather return an error than double-charge. For the activity feed I'll take AP: showing a slightly stale feed is fine, and availability matters more."* Per-feature reasoning is what interviewers want.

---

# Message Queues

## Why use a message queue?

### Answer

```
Synchronous:                        Asynchronous:
  API ──> Email service               API ──> Queue ──> Worker ──> Email
   (blocked 2s, fails together)        (returns in 20ms, retries independently)
```

**Benefits:** decoupling, load levelling (absorb spikes), retries, independent scaling, and failure isolation.

**Costs:** eventual consistency, harder debugging, message ordering, duplicate handling, another system to operate.

### Queue vs Pub/Sub vs Stream

| | Queue | Pub/Sub | Stream |
|---|---|---|---|
| Delivery | One consumer per message | All subscribers | Consumer groups |
| Persistence | Until acked | Usually not | Retained, replayable |
| Examples | SQS, RabbitMQ, BullMQ | SNS, Redis Pub/Sub | Kafka, Kinesis, Redis Streams |
| Use for | Task processing | Fan-out notifications | Event sourcing, analytics |

### Delivery guarantees

| Guarantee | Meaning | Cost |
|---|---|---|
| At-most-once | May be lost, never duplicated | Fire and forget |
| **At-least-once** | Never lost, may duplicate | **The common default** |
| Exactly-once | Neither lost nor duplicated | Very expensive, often illusory |

**In practice: at-least-once delivery + idempotent consumers = effectively exactly-once.**

```js
// Idempotent consumer — the essential pattern
async function handleMessage(msg) {
  const processed = await redis.set(`processed:${msg.id}`, '1', 'NX', 'EX', 86400);
  if (!processed) return;              // already handled, skip silently

  await doWork(msg);
}

// Or use a database unique constraint
await db.processedEvents.insert({ eventId: msg.id });   // throws on duplicate
```

### Dead letter queues

```js
// After N failed attempts, move to a DLQ instead of retrying forever
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  // → 1s, 2s, 4s, 8s, 16s, then DLQ
}
// Alert on DLQ depth. A growing DLQ means a real bug, not a transient failure.
```

**Interview Tip:** When asked about exactly-once, the correct answer is: *"True exactly-once delivery is impossible across a network. What you do is at-least-once delivery plus idempotent processing, keyed by a message id or an idempotency key."*

---

# API Design

## REST vs GraphQL vs gRPC

### Answer

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Protocol | HTTP/1.1 | HTTP | HTTP/2 |
| Format | JSON | JSON | Protobuf (binary) |
| Schema | OpenAPI (optional) | Built in | .proto (required) |
| Over/under-fetching | Common | Solved | Explicit |
| Caching | HTTP caching works | Harder | Manual |
| Browser support | Native | Native | Needs a proxy |
| Streaming | SSE/WebSocket | Subscriptions | Native bidirectional |
| Best for | Public APIs, CRUD | Complex/nested client needs | Internal microservices |

### Real-time options

| | Polling | Long polling | SSE | WebSocket |
|---|---|---|---|---|
| Direction | Client pull | Client pull | Server → client | Bidirectional |
| Overhead | High | Medium | Low | Low |
| Reconnect | N/A | Manual | Automatic | Manual |
| Complexity | Trivial | Low | Low | Higher |
| Use for | Infrequent updates | Legacy | Notifications, feeds, live scores | Chat, games, collaborative editing |

**Interview Tip:** SSE is underrated and frequently the right answer. If data flows only server → client (notifications, live prices, progress bars), SSE gives you automatic reconnection over plain HTTP with none of the WebSocket operational complexity.

### API design essentials

```
Versioning:       /api/v1/…
Pagination:       cursor-based for large sets (offset degrades and skips rows)
Rate limiting:    per-user and per-IP, return 429 + Retry-After
Idempotency:      Idempotency-Key header on POST for payments
Errors:           consistent shape, stable machine-readable codes
Filtering:        ?status=active&sort=-createdAt&fields=id,name
```

---

# Microservices

## Monolith vs microservices

### Answer

| | Monolith | Microservices |
|---|---|---|
| Deployment | One unit | Independent per service |
| Scaling | Whole app | Per service |
| Tech stack | Uniform | Per service |
| Data | One database | Database per service |
| Transactions | ACID | Sagas / eventual consistency |
| Debugging | Straightforward | Distributed tracing needed |
| Team | Coordination overhead at scale | Autonomous teams |
| Operational cost | Low | High |

### When to split

✅ Multiple teams blocking each other on deploys
✅ Genuinely different scaling profiles (video encoding vs the API)
✅ Different technology needs (an ML service in Python)
✅ Clear, stable bounded contexts

❌ "Microservices are modern"
❌ A small team (you'll spend all your time on infrastructure)
❌ Unclear domain boundaries — you'll build a distributed monolith, the worst outcome

### Patterns

```
API Gateway       — single entry point: auth, rate limiting, routing, aggregation
Service Discovery — services find each other (Consul, Kubernetes DNS)
Circuit Breaker   — stop calling a failing service; fail fast
Bulkhead          — isolate resource pools so one failure can't drain everything
Saga              — distributed transaction via compensating actions
CQRS              — separate read and write models
Event Sourcing    — store events, derive state
Sidecar           — cross-cutting concerns beside the service (Envoy, service mesh)
Strangler Fig     — incrementally replace a monolith route by route
```

### Saga — distributed transactions without 2PC

```
Order Saga:
  1. Create order       → compensate: cancel order
  2. Reserve inventory  → compensate: release inventory
  3. Charge payment     → compensate: refund
  4. Schedule shipping  → compensate: cancel shipment

If step 3 fails, run compensations for steps 2 and 1 in reverse.
```

```js
// Orchestration-based saga
async function createOrderSaga(data) {
  const completed = [];
  try {
    const order = await orderService.create(data);
    completed.push(() => orderService.cancel(order.id));

    await inventoryService.reserve(data.items);
    completed.push(() => inventoryService.release(data.items));

    await paymentService.charge(data.payment);
    completed.push(() => paymentService.refund(data.payment));

    await shippingService.schedule(order.id);
    return order;
  } catch (err) {
    for (const compensate of completed.reverse()) {
      await compensate().catch((e) => logger.error({ e }, 'Compensation failed'));
    }
    throw err;
  }
}
```

**Interview Tip:** *"Start with a well-modularised monolith and extract services when you feel real pain."* Then name the pain: deployment coupling, divergent scaling needs, or team contention. Advocating microservices from day one for a startup is a red flag to most interviewers.

---

# Reliability

## How do you design for failure?

### Answer

**Assume everything fails: servers, networks, disks, dependencies, and your own code.**

### Patterns

```js
// 1. TIMEOUT — never wait forever
const res = await fetch(url, { signal: AbortSignal.timeout(3000) });

// 2. RETRY with exponential backoff + jitter
// Jitter is essential — without it, all clients retry simultaneously
const delay = Math.random() * Math.min(base * 2 ** attempt, maxDelay);

// 3. CIRCUIT BREAKER — stop hammering a dead service
// CLOSED → (failures ≥ threshold) → OPEN → (after timeout) → HALF_OPEN → CLOSED

// 4. BULKHEAD — isolate resources
const criticalPool = new Pool({ max: 15 });   // checkout
const reportPool   = new Pool({ max: 5 });    // analytics can't starve checkout

// 5. GRACEFUL DEGRADATION
async function getRecommendations(userId) {
  try {
    return await mlService.recommend(userId);
  } catch {
    return await getPopularProducts();        // fallback, not an error page
  }
}

// 6. LOAD SHEDDING — reject early when overloaded
if (currentLoad > threshold && request.priority === 'low') {
  return res.status(503).set('Retry-After', '30').end();
}

// 7. IDEMPOTENCY — safe retries
const existing = await redis.get(`idem:${key}`);
if (existing) return JSON.parse(existing);
```

### Redundancy and failover

```
Active-Passive:  standby takes over on failure (simple, wasted capacity)
Active-Active:   all nodes serve traffic (efficient, needs conflict handling)
Multi-AZ:        survives a datacenter failure
Multi-region:    survives a regional failure (expensive, complex)
```

### Deployment strategies

| Strategy | How | Rollback |
|---|---|---|
| Rolling | Replace instances gradually | Roll forward/back gradually |
| Blue-green | Two identical environments, switch traffic | Instant switch back |
| Canary | 5% of traffic → monitor → ramp up | Route back to stable |
| Feature flag | Deploy dark, enable per user | Toggle off, no deploy |

**Interview Tip:** Retry storms are the classic self-inflicted outage: a service slows down, every client retries, the extra load makes it worse, and it dies. Always mention **jittered exponential backoff + circuit breakers + a retry budget**.

---

# Observability

## What are the three pillars of observability?

### Answer

| Pillar | Answers | Tools |
|---|---|---|
| **Metrics** | "What is happening?" — aggregate numbers | Prometheus, CloudWatch, Datadog |
| **Logs** | "What happened in this request?" | ELK, Loki, CloudWatch Logs |
| **Traces** | "Where did the time go across services?" | Jaeger, Tempo, OpenTelemetry |

### The four golden signals (Google SRE)

```
1. LATENCY      — how long requests take (p50, p95, p99)
2. TRAFFIC      — requests per second
3. ERRORS       — failure rate (and error budget burn)
4. SATURATION   — how full the system is (CPU, memory, queue depth, connections)
```

For queues, also watch **age of the oldest message** — it detects a stuck consumer that error rate alone will miss.

### Correlation

```js
// A request id threaded through logs, traces and downstream calls
app.use((req, res, next) => {
  req.id = req.get('x-request-id') ?? crypto.randomUUID();
  res.set('x-request-id', req.id);
  asyncLocalStorage.run({ requestId: req.id }, next);
});

// Every log line automatically carries it
logger.info({ userId, orderId }, 'Order created');
// → {"time":"…","level":"info","requestId":"abc","userId":1,"orderId":"o1",…}
```

### Alerting

```
Alert on SYMPTOMS (user impact), not CAUSES:
  ✅ "p99 latency > 1s for 5 minutes"
  ✅ "error rate > 1%"
  ✅ "checkout success rate dropped 10%"
  ❌ "CPU > 80%"          ← may be perfectly fine

Every alert must be ACTIONABLE. Non-actionable alerts train people to ignore alerts.
```

**Interview Tip:** SLI / SLO / error budget is the vocabulary to use. *"We set an SLO of 99.9% availability. That's a 0.1% error budget — about 43 minutes a month. If we're burning it fast we freeze feature work and fix reliability."* That reframes reliability as a business decision.

---

# Case Studies

## Design a URL shortener (TinyURL / bit.ly)

### Requirements

```
Functional:      shorten a URL, redirect, optional custom alias, click analytics
Non-functional:  100M writes/day, 1B reads/day, redirect p99 < 100ms, 99.9% uptime
Constraints:     links are permanent (or have an optional expiry)
```

### Capacity

```
Writes: 100M/day  ≈ 1,160/sec  (peak ~3,500/sec)
Reads:  1B/day    ≈ 11,600/sec (peak ~35,000/sec)
Storage: 500 B × 100M × 365 × 5 = ~90 TB over 5 years
Cache:  hot 20% of daily reads = 100 GB
```

### Short code generation

```
Base62 [a-zA-Z0-9] — 62 characters
  6 chars = 62⁶ = 56 billion
  7 chars = 62⁷ = 3.5 trillion  ← use 7
```

| Approach | Pros | Cons |
|---|---|---|
| **Random + collision check** | Simple, unguessable | A DB read per generation |
| **Hash(URL) + truncate** | Deduplicates identical URLs | Collisions need handling |
| **Counter + base62** | No collisions, no read | Sequential = enumerable, needs a distributed counter |
| **Pre-generated key pool** ⭐ | O(1), no collisions, no counter contention | Extra service to run |

```js
// Recommended: a Key Generation Service hands out pre-generated codes in batches
// Each app instance takes a range of 1,000 codes → zero contention per request

// Or: counter + base62 with encryption to hide sequence
const counter = await redis.incrby('url:counter', 1);   // or a Snowflake id
const code = base62Encode(counter);
```

### Data model

```sql
CREATE TABLE urls (
  short_code  VARCHAR(7) PRIMARY KEY,
  long_url    TEXT NOT NULL,
  user_id     BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);
-- Shard by hash(short_code); clicks go to a separate analytics store
```

### Architecture

```
                       ┌─────┐
Client ──> CDN ──────> │ LB  │
                       └──┬──┘
                ┌─────────┴─────────┐
                ▼                   ▼
          ┌──────────┐        ┌──────────┐
          │ Read svc │        │Write svc │
          └────┬─────┘        └────┬─────┘
               │                   │
        ┌──────▼──────┐            │  ┌──────────────┐
        │ Redis cache │            └─>│ Key Gen Svc  │
        └──────┬──────┘               └──────────────┘
               │ miss                        │
        ┌──────▼───────────────────────────▼─────┐
        │        Sharded database                │
        └────────────────────────────────────────┘
               │ click events
        ┌──────▼──────┐     ┌──────────────┐
        │    Kafka    │────>│  Analytics   │
        └─────────────┘     └──────────────┘
```

### Key decisions

- **301 vs 302 redirect:** 302 (temporary) so the browser keeps hitting you and analytics stay accurate. 301 is faster for users but caches permanently and kills your click counts.
- **Analytics asynchronously** via a queue — never block the redirect.
- **Cache aggressively** — a 95%+ hit rate is achievable given the access skew.

---

## Design a rate limiter

### Requirements

```
Limit each user to N requests per window; distributed across app servers;
low latency (< 5ms); fail open (allow) if the limiter itself is down
```

### Algorithms

| Algorithm | Memory | Accuracy | Burst handling |
|---|---|---|---|
| Fixed window counter | Very low | Poor (2× burst at boundaries) | No |
| Sliding window log | High (stores timestamps) | Exact | No |
| **Sliding window counter** | Low | Good approximation | No |
| **Token bucket** ⭐ | Low | Good | **Yes, controlled** |
| Leaky bucket | Low | Good | Smooths output |

```lua
-- Token bucket in Redis (atomic)
local tokens = math.min(capacity, stored_tokens + elapsed * refill_rate)
if tokens >= 1 then
  redis.call('HMSET', key, 'tokens', tokens - 1, 'ts', now)
  return 1
end
return 0
```

### Where to put it

```
Client-side    — UX only, trivially bypassed
API Gateway ⭐ — protects everything, one place to configure
Middleware     — per-endpoint granularity, app-aware
```

**Key decisions:** fail **open** (a broken rate limiter shouldn't take down your API), return `429` with `Retry-After` and `X-RateLimit-*` headers, and apply different limits per endpoint (login is far stricter than a product listing).

---

## Design a news feed (Twitter / Instagram)

### The core problem: fan-out

| | Push (fan-out on write) | Pull (fan-out on read) |
|---|---|---|
| When you post | Write to all followers' feeds | Just store the post |
| When you read | Read your precomputed feed | Query everyone you follow, merge |
| Read latency | **Very fast** | Slow |
| Write cost | O(followers) — brutal for celebrities | O(1) |
| Storage | High (duplicated) | Low |
| Best for | Most users | Users following many accounts |

### The hybrid — what real systems do

```
Normal users (< 10k followers):  PUSH — fan out to follower feeds on write
Celebrities (> 10k followers):   PULL — followers merge celebrity posts at read time

Read path:
  precomputed_feed  +  recent posts from the few celebrities you follow
  → merge, rank, return
```

```js
async function getFeed(userId, limit = 50) {
  // 1. Precomputed feed from normal follows (Redis sorted set by timestamp)
  const pushed = await redis.zrevrange(`feed:${userId}`, 0, limit);

  // 2. Pull celebrity posts on demand
  const celebs = await getFollowedCelebrities(userId);
  const celebPosts = await Promise.all(celebs.map((c) => getRecentPosts(c, limit)));

  // 3. Merge and rank
  return rank([...pushed, ...celebPosts.flat()]).slice(0, limit);
}
```

### Fan-out at write

```js
// Never do this synchronously — queue it
await queue.add('fanout', { postId, authorId });

// Worker
const followers = await getFollowers(authorId);
for (const batch of chunk(followers, 1000)) {
  const pipeline = redis.pipeline();
  for (const f of batch) {
    pipeline.zadd(`feed:${f}`, timestamp, postId);
    pipeline.zremrangebyrank(`feed:${f}`, 0, -1001);   // cap at 1000
  }
  await pipeline.exec();
}
```

**Interview Tip:** The celebrity problem is the whole interview. A user with 100M followers would require 100M writes for one post. Naming the hybrid push/pull solution is what they're waiting for.

---

## Design a chat application (WhatsApp / Slack)

### Requirements

```
1:1 and group messaging, online presence, delivery receipts,
message history, push notifications when offline, end-to-end ordering per conversation
```

### Architecture

```
                    ┌──────────────┐
Client ─WebSocket──>│  Gateway     │  (stateful — holds connections)
                    └──────┬───────┘
                           │ which gateway holds user X?
                    ┌──────▼───────┐
                    │ Redis (presence + routing table) │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌───────────┐  ┌───────────┐  ┌────────────┐
     │ Chat svc  │  │ Presence  │  │ Push notif │
     └─────┬─────┘  └───────────┘  └────────────┘
           ▼
     ┌────────────┐
     │ Cassandra  │  (messages — huge write volume, time-ordered)
     └────────────┘
```

### Key decisions

**Message ordering:** don't rely on server timestamps (clock skew). Use a per-conversation monotonic sequence number, or Snowflake IDs.

**Delivery states:** `sent` → `delivered` → `read`, each acknowledged by the client.

**Storage:** Cassandra with a partition key of `conversation_id` and a clustering key of `message_id DESC` — writes are append-only and reads are "last N messages", which is exactly what wide-column stores are best at.

**Offline delivery:** if the recipient has no active connection, store the message and send a push notification (APNs/FCM).

**Group messages:** for small groups, fan out to each member. For large groups (> 500), a pull model like the news feed.

**Scaling WebSockets:** connections are stateful, so you need a routing table (user → gateway) in Redis, plus Pub/Sub between gateways to route a message to whichever server holds the recipient.

---

## Design a video streaming service (YouTube / Netflix)

### Upload and processing pipeline

```
Upload → S3 (raw) → Queue → Transcoding workers
                                    ├─> 240p, 480p, 720p, 1080p, 4K
                                    ├─> HLS/DASH segments (~4s chunks)
                                    ├─> thumbnails
                                    └─> subtitles
                              → CDN → viewers
```

### Key decisions

**Adaptive bitrate streaming (HLS/DASH):** the video is split into short segments at multiple bitrates. The player measures bandwidth and switches quality per segment. That's why quality changes mid-video instead of buffering.

**CDN is essential** — video is enormous bandwidth. Netflix goes further with Open Connect appliances placed inside ISP networks.

**Transcoding is parallelised** by splitting the video into chunks and processing them across many workers.

**Metadata in a relational DB**, video files in object storage, view counts in a write-optimised store, recommendations from a separate ML pipeline.

**Interview Tip:** For view counts, don't increment a database row per view. Buffer in Redis and flush periodically, or stream through Kafka and aggregate — a viral video would otherwise create a hot row that no database can handle.

---

## Design a distributed cache

### Requirements

```
Key-value store, sub-ms latency, hold TBs across nodes, survive node failures
```

### Key decisions

**Partitioning:** consistent hashing with virtual nodes — adding or removing a node remaps only 1/N of keys instead of nearly all of them.

**Replication:** each key on N nodes (typically 3). Read from any, write to a quorum.

**Eviction:** LRU is standard; LFU is better when access is heavily skewed.

**Consistency:** caches are usually AP — a stale read is acceptable; unavailability is not.

**Hot keys:** the biggest real problem. One key can saturate a single node. Mitigate with client-side caching, key splitting (`counter:1`…`counter:10`), or replicating hot keys to multiple nodes.

---

# Rapid Fire

**What is a CDN?**
Geographically distributed edge servers caching content close to users. Reduces latency, offloads origin traffic, absorbs DDoS.

**What is a reverse proxy?**
A server in front of your backends handling TLS termination, load balancing, caching, compression and rate limiting (Nginx, Envoy).

**What is a forward proxy?**
Sits in front of *clients* — corporate filtering, anonymity, caching outbound requests.

**What is an API gateway?**
Single entry point for microservices: routing, auth, rate limiting, request aggregation, protocol translation.

**What is service mesh?**
Infrastructure layer handling service-to-service communication via sidecars (Istio, Linkerd) — mTLS, retries, traces, traffic shifting without app changes.

**What is a bloom filter?**
A probabilistic structure for set membership. No false negatives, some false positives. Used to avoid expensive lookups for keys that definitely don't exist.

**What is consistent hashing?**
Mapping keys and nodes onto a ring so adding/removing a node remaps only ~1/N of keys.

**What is a quorum?**
Requiring `W + R > N` (write replicas + read replicas > total) to guarantee reads see the latest write.

**What is a vector clock?**
Tracks causality across nodes to detect concurrent conflicting updates.

**What is a WAL?**
Write-ahead log — durability and replication foundation; changes are logged before being applied.

**What is CQRS?**
Separating read and write models so each can be optimised and scaled independently.

**What is event sourcing?**
Storing the sequence of events rather than current state; state is derived by replaying them. Gives a full audit trail and time travel.

**What is a two-phase commit?**
A distributed transaction protocol (prepare, then commit). Blocking and fragile — sagas are usually preferred.

**What is the thundering herd?**
Many clients simultaneously hitting the same resource (cache expiry, service restart). Fixed with jitter, locks and staggered startup.

**What is backpressure?**
Signalling upstream to slow down when a consumer can't keep up — bounded queues, `429` responses, TCP flow control.

**What is a heartbeat?**
Periodic liveness signal. Missing heartbeats trigger failover.

**What is leader election?**
Choosing one node to coordinate (Raft, Paxos, or a lock in etcd/Zookeeper).

**What is idempotency and why does it matter?**
The same operation applied twice has the same effect as once. Essential because networks force retries.

**What is a hot partition?**
One shard receiving disproportionate traffic. Caused by a poor partition key.

**What is blue-green vs canary deployment?**
Blue-green switches all traffic between two environments. Canary shifts a small percentage first and watches metrics.

**What is chaos engineering?**
Deliberately injecting failures in production to verify resilience (Netflix's Chaos Monkey).

**How would you handle 10× traffic tomorrow?**
Cache aggressively, add read replicas, scale stateless tiers horizontally, move heavy work to queues, add a CDN, then shard if still needed. And load test to find the real bottleneck rather than guessing.

**What is the difference between horizontal partitioning and vertical partitioning?**
Horizontal splits rows across databases (sharding). Vertical splits columns/tables by feature.

**What is data denormalisation and when is it justified?**
Duplicating data to avoid joins. Justified when read performance matters more than write simplicity and you can maintain consistency reliably.

---

## 📌 Interview Checklist

- [ ] Can you run the 6-step framework without prompting?
- [ ] Estimate QPS and storage from "100M users" in under two minutes
- [ ] Explain CAP and apply it per-feature, not abstractly
- [ ] Explain consistent hashing and why it beats modulo
- [ ] Name three cache failure modes and their fixes
- [ ] Explain the celebrity problem in a news feed
- [ ] Why is exactly-once delivery a myth, and what do you do instead?
- [ ] When would you NOT use microservices?
- [ ] Name the four golden signals
- [ ] Design a URL shortener end-to-end in 30 minutes
