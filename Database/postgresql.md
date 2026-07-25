# 🐘 PostgreSQL Interview Questions

> Data types · JSONB · MVCC · Indexes · Extensions · Partitioning · Replication · Tuning

> General SQL (joins, window functions, normalization) is in [sql.md](sql.md). This file covers what makes **PostgreSQL** specifically.

---

## Table of Contents

1. [Why PostgreSQL](#why-postgresql)
2. [Data Types](#data-types)
3. [JSON & JSONB](#json--jsonb)
4. [MVCC & VACUUM](#mvcc--vacuum)
5. [Index Types](#index-types)
6. [Full Text Search](#full-text-search)
7. [Constraints & Advanced DDL](#constraints--advanced-ddl)
8. [Partitioning](#partitioning)
9. [Extensions](#extensions)
10. [Replication & High Availability](#replication--high-availability)
11. [Performance Tuning](#performance-tuning)
12. [Node.js Integration](#nodejs-integration)
13. [Rapid Fire](#rapid-fire)

---

# Why PostgreSQL

## What makes PostgreSQL different from MySQL?

### Answer

| | PostgreSQL | MySQL |
|---|---|---|
| Type system | Very rich (arrays, JSONB, ranges, custom types, enums) | Basic |
| JSON | **JSONB** — binary, indexable, operator-rich | JSON — mostly text-based |
| Concurrency | MVCC, no read locks | MVCC in InnoDB |
| Index types | B-tree, GIN, GiST, BRIN, Hash, SP-GiST | Mostly B-tree, some full-text |
| Full-text search | Built in, good | Basic |
| Window functions / CTEs | Full support, recursive | Supported since 8.0 |
| Extensions | Huge ecosystem (PostGIS, pgvector, TimescaleDB) | Limited |
| Standards compliance | Very high | Looser |
| `ALTER TABLE` | Mostly non-blocking | Historically blocking |
| Replication | Streaming, logical | Very mature, simple |
| Ease of setup | Slightly more involved | Simpler |

### When should we use it?

- ✅ **PostgreSQL** — complex queries, analytics, geospatial, JSON documents alongside relational data, strict correctness, anything you might grow into
- ✅ **MySQL** — simple read-heavy CRUD, existing team expertise, some managed-hosting ecosystems

**Interview Tip:** The strongest modern argument: *"PostgreSQL can do relational, document (JSONB), full-text search, geospatial (PostGIS), time-series (TimescaleDB) and vector search (pgvector) in one database. For most products that means one system to operate instead of four."*

---

# Data Types

## What data types does PostgreSQL offer that others don't?

### Answer

```sql
CREATE TABLE demo (
  id          BIGSERIAL PRIMARY KEY,           -- or: GENERATED ALWAYS AS IDENTITY
  uuid        UUID DEFAULT gen_random_uuid(),

  -- Text
  name        TEXT,                            -- no length penalty vs VARCHAR
  code        VARCHAR(10),
  ch          CHAR(2),

  -- Numbers
  price       NUMERIC(10,2),                   -- EXACT — use for money
  ratio       DOUBLE PRECISION,                -- floating point, inexact
  count       INTEGER,
  big         BIGINT,

  -- Boolean (real one, not TINYINT)
  active      BOOLEAN DEFAULT true,

  -- Date & time
  created_at  TIMESTAMPTZ DEFAULT NOW(),       -- ✅ ALWAYS use TIMESTAMPTZ
  birth_date  DATE,
  duration    INTERVAL,

  -- Arrays — native, first class
  tags        TEXT[],
  scores      INTEGER[],

  -- JSON
  metadata    JSONB,

  -- Enum
  status      order_status,

  -- Ranges
  valid_period TSTZRANGE,
  price_range  NUMRANGE,

  -- Network types
  ip          INET,
  mac         MACADDR,

  -- Geometric / geospatial (with PostGIS)
  location    POINT,

  -- Full text
  search_vec  TSVECTOR
);

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
```

### Arrays in practice

```sql
INSERT INTO demo (tags) VALUES (ARRAY['nodejs', 'react', 'postgres']);
INSERT INTO demo (tags) VALUES ('{nodejs,react}');   -- literal syntax

SELECT * FROM demo WHERE 'nodejs' = ANY(tags);          -- contains
SELECT * FROM demo WHERE tags @> ARRAY['nodejs'];       -- contains (index-friendly)
SELECT * FROM demo WHERE tags && ARRAY['react','vue'];  -- overlaps
SELECT array_length(tags, 1) FROM demo;
SELECT unnest(tags) FROM demo;                          -- array → rows

UPDATE demo SET tags = array_append(tags, 'typescript');
UPDATE demo SET tags = array_remove(tags, 'react');

CREATE INDEX idx_tags ON demo USING GIN(tags);          -- makes @> and && fast
```

### Ranges

```sql
-- Prevent double-booking with an exclusion constraint
CREATE TABLE bookings (
  room_id INT,
  period  TSTZRANGE,
  EXCLUDE USING GIST (room_id WITH =, period WITH &&)   -- no overlapping periods
);

SELECT * FROM bookings WHERE period @> NOW();           -- currently active
SELECT * FROM bookings WHERE period && TSTZRANGE(a, b); -- overlaps
```

**Interview Tip:** Two things to always say: use `NUMERIC` for money (never `FLOAT` — `0.1 + 0.2 != 0.3`), and use `TIMESTAMPTZ` not `TIMESTAMP` (the latter has no timezone and silently misinterprets data across regions).

**Common Mistakes:** `VARCHAR(255)` out of MySQL habit — in PostgreSQL `TEXT` is equally fast and the length limit adds nothing but a future migration.

---

# JSON & JSONB

## What is the difference between `JSON` and `JSONB`?

### Answer

| | `JSON` | `JSONB` |
|---|---|---|
| Storage | Exact text copy | Decomposed binary |
| Insert speed | Faster | Slower (parsing overhead) |
| Query speed | Slower (reparse each time) | **Much faster** |
| Indexing | ❌ | ✅ GIN |
| Preserves key order & whitespace | Yes | No |
| Duplicate keys | Kept | Last one wins |
| Operators | Limited | Full set (`@>`, `?`, `@?`, `@@`) |

**Use JSONB** for essentially everything. Use `JSON` only if you must preserve the exact original text.

### Example

```sql
CREATE TABLE products (
  id       SERIAL PRIMARY KEY,
  name     TEXT,
  attrs    JSONB
);

INSERT INTO products (name, attrs) VALUES
('Laptop', '{"brand":"Dell","specs":{"ram":16,"cpu":"i7"},"tags":["work","premium"],"price":75000}');

-- ===== ACCESS OPERATORS =====
SELECT attrs -> 'brand'            FROM products;  -- "Dell"    (JSONB)
SELECT attrs ->> 'brand'           FROM products;  -- Dell      (TEXT)
SELECT attrs -> 'specs' ->> 'ram'  FROM products;  -- 16        (TEXT)
SELECT attrs #> '{specs,cpu}'      FROM products;  -- "i7"      (JSONB, path)
SELECT attrs #>> '{specs,cpu}'     FROM products;  -- i7        (TEXT, path)

-- ===== CONTAINMENT & EXISTENCE =====
SELECT * FROM products WHERE attrs @> '{"brand":"Dell"}';           -- contains
SELECT * FROM products WHERE attrs @> '{"specs":{"ram":16}}';       -- nested
SELECT * FROM products WHERE attrs ? 'warranty';                    -- key exists
SELECT * FROM products WHERE attrs ?| ARRAY['warranty','support'];  -- any key
SELECT * FROM products WHERE attrs ?& ARRAY['brand','price'];       -- all keys

-- ===== CASTING FOR COMPARISON =====
SELECT * FROM products WHERE (attrs ->> 'price')::numeric > 50000;
SELECT * FROM products WHERE (attrs -> 'specs' ->> 'ram')::int >= 16;

-- ===== JSONPATH (Postgres 12+) =====
SELECT * FROM products WHERE attrs @? '$.specs.ram ? (@ > 8)';
SELECT jsonb_path_query(attrs, '$.tags[*]') FROM products;

-- ===== MODIFYING =====
UPDATE products SET attrs = attrs || '{"inStock": true}';           -- merge
UPDATE products SET attrs = jsonb_set(attrs, '{specs,ram}', '32');  -- set nested
UPDATE products SET attrs = attrs - 'price';                        -- remove key
UPDATE products SET attrs = attrs #- '{specs,cpu}';                 -- remove nested
UPDATE products SET attrs = jsonb_insert(attrs, '{tags,0}', '"new"');

-- ===== EXPANDING =====
SELECT jsonb_array_elements(attrs -> 'tags') FROM products;         -- array → rows
SELECT * FROM jsonb_each(attrs);                                    -- key/value rows
SELECT jsonb_object_keys(attrs) FROM products;

-- ===== BUILDING =====
SELECT jsonb_build_object('id', id, 'name', name) FROM products;
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM products;

-- Return a fully nested JSON API response in ONE query
SELECT jsonb_build_object(
  'id', o.id,
  'total', o.total,
  'customer', jsonb_build_object('name', c.name, 'email', c.email),
  'items', (
    SELECT jsonb_agg(jsonb_build_object('product', p.name, 'qty', oi.quantity))
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = o.id
  )
) AS order_json
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.id = 1;
```

### Indexing JSONB

```sql
-- GIN — supports @>, ?, ?|, ?&  (larger index, slower writes)
CREATE INDEX idx_attrs ON products USING GIN(attrs);

-- jsonb_path_ops — smaller and faster, but ONLY supports @>
CREATE INDEX idx_attrs_path ON products USING GIN(attrs jsonb_path_ops);

-- B-tree on a specific extracted field — best when you always query one key
CREATE INDEX idx_brand ON products((attrs ->> 'brand'));
CREATE INDEX idx_price ON products(((attrs ->> 'price')::numeric));
```

**Interview Tip:** The right framing: *"JSONB is for genuinely schema-less attributes — product specs that differ per category, third-party API payloads, feature flags. Anything you filter, join or aggregate on regularly should be a real column. JSONB is a tool, not a way to avoid schema design."*

---

# MVCC & VACUUM

## What is MVCC and why does PostgreSQL need VACUUM?

### Answer

**Multi-Version Concurrency Control**: instead of locking rows, PostgreSQL keeps multiple versions. Each row has `xmin` (creating transaction) and `xmax` (deleting transaction), and each transaction sees a consistent snapshot.

**Consequence: readers never block writers, and writers never block readers.**

### The cost

An `UPDATE` doesn't modify the row in place — it writes a **new version** and marks the old one dead. A `DELETE` just marks it dead. Those dead tuples accumulate as **bloat** until `VACUUM` reclaims them.

### Example

```sql
-- Inspect the hidden system columns
SELECT xmin, xmax, ctid, * FROM users LIMIT 1;

-- Check bloat
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Manual vacuum
VACUUM users;                    -- reclaim space for reuse (non-blocking)
VACUUM ANALYZE users;            -- + refresh planner statistics
VACUUM FULL users;               -- ⚠️ rewrites the table, takes an ACCESS EXCLUSIVE LOCK
                                 --    returns space to the OS — never run on a live table

-- Tune autovacuum per table for hot tables
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0.05,   -- vacuum at 5% dead instead of 20%
  autovacuum_analyze_scale_factor = 0.02
);
```

### Transaction ID wraparound

PostgreSQL transaction IDs are 32-bit and wrap around after ~4 billion. If `VACUUM` doesn't freeze old rows in time, the database **shuts down to prevent data loss**.

```sql
SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;
-- Watch this. autovacuum_freeze_max_age default is 200 million.
```

**Interview Tip:** This is *the* PostgreSQL-specific operational question. Say: *"MVCC gives lock-free reads, but the price is dead tuples. Autovacuum normally handles it, but on high-update tables with long-running transactions, bloat grows and queries slow down. And `VACUUM FULL` takes an exclusive lock, so in production you use `pg_repack` instead."*

**Common Mistakes:** Long-running transactions (an idle transaction left open) prevent vacuum from cleaning anything newer than its snapshot. `idle_in_transaction_session_timeout` is the fix.

---

# Index Types

## What index types does PostgreSQL have and when do you use each?

### Answer

| Type | Use for | Operators |
|---|---|---|
| **B-tree** (default) | Equality and range on scalars | `= < > <= >= BETWEEN IN` |
| **GIN** | Composite values — arrays, JSONB, full text | `@> ? && @@` |
| **GiST** | Geometric, ranges, nearest-neighbour | `<-> && @>` |
| **BRIN** | Huge, naturally-ordered tables (time series) | Range queries |
| **Hash** | Equality only | `=` |
| **SP-GiST** | Non-balanced structures (quadtrees, IP prefixes) | Various |

### Example

```sql
-- B-tree
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_cust_date ON orders(customer_id, created_at DESC);

-- GIN for JSONB / arrays / full text
CREATE INDEX idx_attrs ON products USING GIN(attrs);
CREATE INDEX idx_tags ON products USING GIN(tags);
CREATE INDEX idx_search ON products USING GIN(to_tsvector('english', name));

-- GIN for trigram similarity (fuzzy search / LIKE '%x%')
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_name_trgm ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%lapt%';        -- now indexed!
SELECT * FROM products WHERE similarity(name, 'laptp') > 0.3;   -- typo-tolerant

-- GiST for ranges and geometry
CREATE INDEX idx_period ON bookings USING GIST(period);
CREATE INDEX idx_location ON places USING GIST(geom);

-- BRIN — tiny index for huge append-only tables
CREATE INDEX idx_events_brin ON events USING BRIN(created_at);
-- A 100GB table might need only a few MB of BRIN index

-- Partial index — index only what you query
CREATE INDEX idx_pending ON orders(created_at) WHERE status = 'pending';

-- Covering index — index-only scans
CREATE INDEX idx_cover ON orders(customer_id) INCLUDE (total, status);

-- Expression index
CREATE INDEX idx_lower_email ON users(LOWER(email));

-- Build WITHOUT locking the table (essential in production)
CREATE INDEX CONCURRENTLY idx_name ON large_table(col);
DROP INDEX CONCURRENTLY idx_old;
```

### Finding unused and missing indexes

```sql
-- Unused indexes — wasting write performance and disk
SELECT
  schemaname, relname, indexrelname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan < 50
ORDER BY pg_relation_size(indexrelid) DESC;

-- Tables with heavy sequential scans — likely missing an index
SELECT relname, seq_scan, seq_tup_read, idx_scan,
       seq_tup_read / NULLIF(seq_scan, 0) AS avg_rows_per_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC LIMIT 20;

-- Index sizes
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC;
```

**Interview Tip:** `CREATE INDEX CONCURRENTLY` is the production answer — a normal `CREATE INDEX` takes a lock that blocks all writes for the duration, which on a large table means an outage. Also mention `pg_trgm` for making `LIKE '%text%'` indexable — most people believe that's impossible.

---

# Full Text Search

## How does PostgreSQL full text search work?

### Answer

```sql
-- tsvector = normalised, stemmed, position-tagged document
SELECT to_tsvector('english', 'The quick brown foxes are jumping');
-- 'brown':3 'fox':4 'jump':6 'quick':2       (stopwords removed, words stemmed)

-- tsquery = the search
SELECT to_tsquery('english', 'fox & jumping');
SELECT plainto_tsquery('english', 'jumping foxes');      -- user input → AND
SELECT websearch_to_tsquery('english', '"brown fox" -cat'); -- Google-style syntax

-- Match with @@
SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ websearch_to_tsquery('english', 'postgres tuning');
```

### Production setup — generated column + GIN index

```sql
ALTER TABLE articles ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')),  'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')),'B') ||
    setweight(to_tsvector('english', coalesce(body, '')),   'C')
  ) STORED;

CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Ranked search with highlighted snippets
SELECT
  id, title,
  ts_rank(search_vector, query) AS rank,
  ts_headline('english', body, query,
              'StartSel=<mark>, StopSel=</mark>, MaxWords=30') AS snippet
FROM articles, websearch_to_tsquery('english', 'database performance') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

### Fuzzy / typo-tolerant search

```sql
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_title_trgm ON articles USING GIN(title gin_trgm_ops);

SELECT title, similarity(title, 'postgersql') AS sim
FROM articles
WHERE title % 'postgersql'          -- % = similar, uses the trigram index
ORDER BY sim DESC;
```

**Interview Tip:** Position it honestly: *"Postgres FTS is excellent up to a few million documents and saves you running Elasticsearch. Beyond that, or when you need advanced relevance tuning, faceting and analyzers, you move to a dedicated search engine."*

---

# Constraints & Advanced DDL

```sql
CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  total       NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  discount    NUMERIC(10,2) DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Multi-column check
  CONSTRAINT discount_not_exceeding_total CHECK (discount <= total),
  CONSTRAINT valid_status CHECK (status IN ('pending','paid','shipped','delivered','cancelled'))
);

-- Deferred constraint — checked at COMMIT, not per statement
ALTER TABLE orders ADD CONSTRAINT fk_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  DEFERRABLE INITIALLY DEFERRED;

-- Partial unique index — only one active subscription per user
CREATE UNIQUE INDEX idx_one_active_sub ON subscriptions(user_id)
  WHERE status = 'active';

-- Exclusion constraint — no overlapping bookings for the same room
CREATE EXTENSION btree_gist;
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING GIST (room_id WITH =, period WITH &&);

-- Generated column
ALTER TABLE order_items ADD COLUMN line_total NUMERIC(10,2)
  GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- Row Level Security — multi-tenant isolation enforced by the DATABASE
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::int);
-- Application sets:  SET app.tenant_id = '42';
-- Now no query can ever read another tenant's rows, even with a bug
```

### Safe migrations on live tables

```sql
-- ✅ Safe (instant, no rewrite in modern Postgres)
ALTER TABLE t ADD COLUMN c TEXT;
ALTER TABLE t ADD COLUMN c INT DEFAULT 0;      -- PG 11+ no rewrite
ALTER TABLE t DROP COLUMN c;
CREATE INDEX CONCURRENTLY ...;

-- ⚠️ Rewrites the table / takes a long lock
ALTER TABLE t ALTER COLUMN c TYPE bigint;      -- full rewrite
ALTER TABLE t ADD COLUMN c TEXT NOT NULL;      -- without a default → scan

-- ✅ Safe pattern for adding a NOT NULL constraint
ALTER TABLE t ADD CONSTRAINT c_not_null CHECK (c IS NOT NULL) NOT VALID;
ALTER TABLE t VALIDATE CONSTRAINT c_not_null;  -- scans without an exclusive lock

-- Always guard migrations
SET lock_timeout = '3s';
SET statement_timeout = '30s';
```

**Interview Tip:** Row Level Security is the standout answer for multi-tenant SaaS — tenant isolation enforced by the database means a forgotten `WHERE tenant_id = ?` in application code can't leak data.

---

# Partitioning

## How does table partitioning work?

### Answer

Split one logical table into physical child tables. The planner prunes irrelevant partitions automatically.

```sql
-- Range partitioning by date — the most common
CREATE TABLE events (
  id         BIGSERIAL,
  user_id    INT,
  event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, created_at)        -- the partition key MUST be in the PK
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- List partitioning
CREATE TABLE orders (...) PARTITION BY LIST (region);
CREATE TABLE orders_india PARTITION OF orders FOR VALUES IN ('IN');
CREATE TABLE orders_us    PARTITION OF orders FOR VALUES IN ('US','CA');

-- Hash partitioning — even distribution
CREATE TABLE users (...) PARTITION BY HASH (id);
CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

### Why it's worth it

```sql
-- Partition pruning — only reads January's partition
EXPLAIN SELECT * FROM events WHERE created_at >= '2026-01-15' AND created_at < '2026-01-20';

-- Dropping old data becomes INSTANT instead of a massive DELETE
DROP TABLE events_2025_01;                       -- milliseconds
-- vs DELETE FROM events WHERE created_at < ...  -- hours + massive bloat

-- Detach instead of drop, to archive
ALTER TABLE events DETACH PARTITION events_2025_01 CONCURRENTLY;
```

**Interview Tip:** The killer benefit isn't query speed — it's **data lifecycle management**. Dropping a partition is instant and creates zero bloat; deleting millions of rows takes hours and leaves the table needing a vacuum. That's the reason time-series tables get partitioned.

---

# Extensions

```sql
-- The ones worth knowing
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- query performance stats ⭐
CREATE EXTENSION IF NOT EXISTS pg_trgm;             -- fuzzy search, indexable LIKE '%x%'
CREATE EXTENSION IF NOT EXISTS uuid-ossp;           -- UUID generation (or use gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS postgis;             -- geospatial
CREATE EXTENSION IF NOT EXISTS vector;              -- pgvector — AI embeddings ⭐
CREATE EXTENSION IF NOT EXISTS timescaledb;         -- time series
CREATE EXTENSION IF NOT EXISTS hstore;              -- key-value (JSONB is usually better)
CREATE EXTENSION IF NOT EXISTS btree_gist;          -- exclusion constraints
CREATE EXTENSION IF NOT EXISTS pgcrypto;            -- hashing and encryption
```

### `pg_stat_statements` — the most useful one

```sql
SELECT
  LEFT(query, 80) AS query,
  calls,
  ROUND(total_exec_time::numeric, 1) AS total_ms,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  rows,
  ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 1) AS cache_hit_pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
-- Sort by total_exec_time, not mean — a 5ms query run 1M times matters more
-- than a 2s query run twice
```

### pgvector — semantic search

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
  id        SERIAL PRIMARY KEY,
  content   TEXT,
  embedding VECTOR(1536)          -- OpenAI embedding dimension
);

CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Nearest neighbour search
SELECT content, 1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1        -- <=> cosine, <-> L2, <#> inner product
LIMIT 5;
```

**Interview Tip:** `pg_stat_statements` is the answer to "how do you find slow queries in production?" And knowing pgvector shows you're current — it's why many teams skip a dedicated vector database entirely.

---

# Replication & High Availability

## How does PostgreSQL replication work?

### Answer

```
        ┌──────────┐
Writes ─>│ PRIMARY  │
        └────┬─────┘
             │ WAL stream
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐     ┌─────────┐
│ STANDBY │     │ STANDBY │   ← read-only replicas
└─────────┘     └─────────┘
```

| Type | How it works | Use for |
|---|---|---|
| **Streaming (physical)** | Ships WAL records; byte-identical replica | HA, read replicas |
| **Logical** | Decodes WAL into row changes; replicate selected tables | Cross-version upgrades, CDC, selective replication |
| **Synchronous** | Primary waits for standby confirmation | Zero data loss, higher latency |
| **Asynchronous** | Primary doesn't wait (default) | Performance, small lag risk |

```sql
-- Monitor replication lag
SELECT
  client_addr, state, sync_state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
  replay_lag
FROM pg_stat_replication;

-- On the standby
SELECT now() - pg_last_xact_replay_timestamp() AS replication_delay;

-- Logical replication
CREATE PUBLICATION my_pub FOR TABLE orders, customers;
-- on the subscriber:
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary dbname=app'
  PUBLICATION my_pub;
```

### Connection pooling

```
App (100 connections) → PgBouncer → PostgreSQL (20 connections)
```

PostgreSQL forks a **process per connection** (~10MB each), so hundreds of direct connections will exhaust memory. PgBouncer multiplexes them.

| Pool mode | Behaviour |
|---|---|
| `session` | Connection held for the whole client session |
| `transaction` | Released after each transaction ✅ most efficient |
| `statement` | Released after each statement (no transactions allowed) |

**Interview Tip:** Connection pooling is essential for serverless (Lambda, Vercel) where each invocation can open a new connection. Mention PgBouncer, or the managed equivalents (Supabase pooler, Neon, RDS Proxy). And note: `transaction` mode breaks prepared statements and session-level `SET`.

---

# Performance Tuning

## How do you tune PostgreSQL?

### Answer

```sql
-- Memory
shared_buffers       = 25% of RAM        -- PostgreSQL's own cache
effective_cache_size = 50-75% of RAM     -- a HINT to the planner about OS cache
work_mem             = 4MB-64MB          -- PER SORT/HASH operation, per connection ⚠️
maintenance_work_mem = 512MB-2GB         -- VACUUM, CREATE INDEX

-- Write behaviour
wal_buffers          = 16MB
checkpoint_timeout   = 15min
max_wal_size         = 4GB
synchronous_commit   = on                -- 'off' is much faster but risks the last few ms

-- Planner
random_page_cost     = 1.1               -- for SSDs (default 4.0 assumes spinning disks)
effective_io_concurrency = 200           -- SSD

-- Connections
max_connections      = 100               -- use PgBouncer instead of raising this

-- Autovacuum
autovacuum_max_workers = 4
autovacuum_vacuum_scale_factor = 0.1
```

⚠️ `work_mem` is **per operation, per connection**. With `max_connections = 100` and a query doing 3 sorts, worst case is `100 × 3 × work_mem`. That's how people accidentally OOM a server.

### Diagnostics

```sql
-- Cache hit ratio — should be > 99%
SELECT
  ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_pct
FROM pg_stat_database;

-- Currently running queries
SELECT pid, now() - query_start AS duration, state, LEFT(query, 100)
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Blocking chains
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;

-- Kill a runaway query
SELECT pg_cancel_backend(pid);      -- polite
SELECT pg_terminate_backend(pid);   -- force

-- Table and index sizes
SELECT
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) AS total,
  pg_size_pretty(pg_relation_size(relid)) AS table_only,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS indexes
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;

-- Timeouts — set these, always
SET statement_timeout = '30s';
SET lock_timeout = '5s';
SET idle_in_transaction_session_timeout = '60s';   -- prevents vacuum starvation
```

**Interview Tip:** `idle_in_transaction_session_timeout` is a great detail. An application that opens a transaction and forgets to commit holds back vacuum for the whole database, causing bloat everywhere. Setting this timeout prevents an entire class of production incidents.

---

# Node.js Integration

```js
import pg from 'pg';

// Connection pool — never create a client per request
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => logger.error({ err }, 'Idle client error'));

// ✅ Parameterised query — the ONLY safe way
const { rows } = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true]
);

// ❌ NEVER
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);

// Transaction helper — always releases the client
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();     // ⚠️ forgetting this leaks the pool until it deadlocks
  }
}

await withTransaction(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, 1]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, 2]);
});

// Bulk insert — one round trip
const values = users.flatMap((u) => [u.name, u.email]);
const placeholders = users.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
await pool.query(`INSERT INTO users (name, email) VALUES ${placeholders}`, values);

// LISTEN/NOTIFY — pub/sub without Redis
const client = await pool.connect();
await client.query('LISTEN order_created');
client.on('notification', (msg) => {
  console.log('Payload:', JSON.parse(msg.payload));
});
// From SQL:  NOTIFY order_created, '{"id": 1}';
```

### Prisma / Drizzle

```js
// Prisma
const users = await prisma.user.findMany({
  where: { active: true, orders: { some: { total: { gt: 1000 } } } },
  include: { orders: { take: 5, orderBy: { createdAt: 'desc' } } },
  take: 20,
});

await prisma.$transaction(async (tx) => {
  await tx.account.update({ where: { id: 1 }, data: { balance: { decrement: 100 } } });
  await tx.account.update({ where: { id: 2 }, data: { balance: { increment: 100 } } });
});

// Drizzle — closer to SQL, better for complex queries
const result = await db
  .select({ name: users.name, total: sql`sum(${orders.total})` })
  .from(users)
  .leftJoin(orders, eq(orders.userId, users.id))
  .groupBy(users.id)
  .having(sql`sum(${orders.total}) > 1000`);
```

**Interview Tip:** Mention that Prisma historically generated separate queries instead of joins for `include` (fixed with the relation-join mode), and that ORMs can hide N+1 problems. Always be prepared to drop to raw SQL for reporting queries.

---

# Rapid Fire

**What is WAL?**
Write-Ahead Log — changes are written to the log before the data files. It provides durability, crash recovery, replication and point-in-time restore.

**What is a checkpoint?**
Flushing dirty buffers to disk and recording a recovery start point in the WAL.

**What is `pg_dump` vs `pg_basebackup`?**
`pg_dump` is a logical export (SQL/custom format, per-database, version-portable). `pg_basebackup` is a physical copy of the whole cluster, used to seed replicas.

**What is PITR?**
Point-in-time recovery — a base backup plus WAL archives lets you restore to any moment.

**What is `SERIAL` vs `IDENTITY` vs `UUID`?**
`SERIAL` is legacy sugar for a sequence. `GENERATED ALWAYS AS IDENTITY` is the SQL-standard replacement. UUIDs avoid coordination but are larger and randomly ordered (worse index locality — consider UUIDv7).

**What is `TIMESTAMPTZ` vs `TIMESTAMP`?**
`TIMESTAMPTZ` stores UTC and converts on input/output using the session timezone. `TIMESTAMP` has no timezone at all. Always use `TIMESTAMPTZ`.

**What is `RETURNING`?**
Returns rows affected by INSERT/UPDATE/DELETE in the same statement: `INSERT ... RETURNING id, created_at`.

**What is `ON CONFLICT`?**
PostgreSQL's upsert: `ON CONFLICT (col) DO UPDATE SET ...` or `DO NOTHING`.

**What is a `LATERAL` join?**
A join whose right side can reference the left side's columns — for "top N per row" queries.

**What is `DISTINCT ON`?**
A PostgreSQL extension returning the first row per group: `SELECT DISTINCT ON (user_id) * FROM orders ORDER BY user_id, created_at DESC`.

**What is `generate_series`?**
Generates a set of rows — numbers or dates. Essential for filling report gaps.

**What is a sequence and how does it behave in transactions?**
A counter object. `nextval()` is **not** transactional — a rolled-back transaction still consumes the number, so id gaps are normal.

**What is `pg_stat_activity`?**
A live view of every connection: state, current query, wait events, transaction start time.

**What is a `TOAST` table?**
The Oversized-Attribute Storage Technique — values over ~2KB are compressed and stored out-of-line automatically.

**What is a tablespace?**
A filesystem location for storing database objects — used to put hot tables on faster disks.

**What is `SECURITY DEFINER`?**
A function that runs with the privileges of its creator rather than the caller. Powerful and easy to misuse — always set a safe `search_path`.

**What is `EXPLAIN (ANALYZE, BUFFERS)`?**
Runs the query and reports actual timings plus buffer hits/reads — the best way to see whether a query is I/O bound.

**What is a hash join vs merge join vs nested loop?**
Nested loop: good for small outer sets with an indexed inner. Hash join: builds a hash table, good for large unsorted sets. Merge join: both inputs sorted, good for large sorted data.

**What is `work_mem` and why is it dangerous?**
Memory per sort/hash operation, per connection. Setting it high multiplied by many connections and operations can exhaust RAM.

**What is autovacuum and when does it trigger?**
Background vacuum. Triggers when dead tuples exceed `autovacuum_vacuum_threshold + scale_factor × table_rows` (default 50 + 20%).

**How do you upgrade PostgreSQL with minimal downtime?**
`pg_upgrade` with hard links (minutes of downtime), or logical replication to a new-version cluster and a fast cutover (seconds).

---

## 📌 Interview Checklist

- [ ] `JSON` vs `JSONB` and when to use JSONB at all
- [ ] Explain MVCC, dead tuples and why VACUUM exists
- [ ] Name four index types and a use case for each
- [ ] How do you make `LIKE '%text%'` use an index?
- [ ] Why is `CREATE INDEX CONCURRENTLY` important in production?
- [ ] What does `work_mem` actually control, and how can it OOM a server?
- [ ] How do you find your slowest queries?
- [ ] Why partition a table — and what's the real benefit?
- [ ] Why do you need PgBouncer?
- [ ] `TIMESTAMPTZ` vs `TIMESTAMP` — which and why?
