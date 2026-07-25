# 🗄️ SQL Interview Questions

> Joins · Aggregations · Subqueries · Window functions · Indexes · Normalization · Transactions

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Joins](#joins)
3. [Aggregations & Grouping](#aggregations--grouping)
4. [Subqueries & CTEs](#subqueries--ctes)
5. [Window Functions](#window-functions)
6. [Indexes](#indexes)
7. [Normalization](#normalization)
8. [Transactions & ACID](#transactions--acid)
9. [Query Optimisation](#query-optimisation)
10. [Common SQL Problems](#common-sql-problems)
11. [Rapid Fire](#rapid-fire)

---

# Sample schema used throughout

```sql
CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  city        VARCHAR(100),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(100),
  price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock       INT DEFAULT 0
);

CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status       VARCHAR(20) DEFAULT 'pending',
  total        DECIMAL(10,2),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  DECIMAL(10,2) NOT NULL
);

CREATE TABLE employees (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100),
  salary      DECIMAL(10,2),
  dept_id     INT,
  manager_id  INT REFERENCES employees(id)
);
```

---

# Fundamentals

## What is the logical order of execution of a SQL query?

### Answer

You **write** it in one order, the database **executes** it in another:

```sql
-- Written order
SELECT   column, AGG(x)
FROM     table
JOIN     other ON ...
WHERE    condition
GROUP BY column
HAVING   AGG(x) > 10
ORDER BY column
LIMIT    10;
```

```
Execution order:
1. FROM      — read the source tables
2. JOIN      — combine them
3. WHERE     — filter ROWS (no aggregates allowed here)
4. GROUP BY  — form groups
5. HAVING    — filter GROUPS (aggregates allowed)
6. SELECT    — compute the output columns, apply aliases
7. DISTINCT  — remove duplicates
8. ORDER BY  — sort (aliases from SELECT ARE usable here)
9. LIMIT     — take N rows
```

### Why does this matter?

It explains three things people constantly get wrong:

```sql
-- ❌ Aliases can't be used in WHERE — SELECT hasn't run yet
SELECT price * quantity AS line_total
FROM order_items
WHERE line_total > 1000;               -- ERROR

-- ✅ Repeat the expression, or use a subquery/CTE
WHERE price * quantity > 1000;

-- ✅ Aliases DO work in ORDER BY — it runs after SELECT
ORDER BY line_total DESC;

-- ❌ Aggregates can't be in WHERE
WHERE COUNT(*) > 5;                    -- ERROR
-- ✅ Use HAVING
HAVING COUNT(*) > 5;
```

**Interview Tip:** This single diagram answers a whole family of interview questions — WHERE vs HAVING, why aliases fail, why `LIMIT` doesn't speed up an aggregate. Draw it.

---

## What is the difference between `WHERE` and `HAVING`?

### Answer

| | `WHERE` | `HAVING` |
|---|---|---|
| Filters | Individual rows | Groups |
| Runs | Before `GROUP BY` | After `GROUP BY` |
| Aggregates | ❌ Not allowed | ✅ Allowed |
| Can use indexes | ✅ | Rarely |

### Example

```sql
SELECT c.city, COUNT(*) AS order_count, SUM(o.total) AS revenue
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2026-01-01'      -- filter ROWS first (fast, uses index)
  AND o.status = 'completed'
GROUP BY c.city
HAVING SUM(o.total) > 100000            -- then filter GROUPS
ORDER BY revenue DESC;
```

**Interview Tip:** Always push filters into `WHERE` when you can — filtering before grouping means fewer rows to aggregate. Putting a non-aggregate condition in `HAVING` is correct but slower.

---

# Joins

## Explain all the SQL join types.

### Answer

```
     A          B              Result
  ┌─────┐  ┌─────┐
  │  ●  │  │  ●  │
  │  ┌──┼──┐  │  │
  │  │  ●  │  │  │
  └──┼─────┼──┘  │
     └─────┴─────┘
```

| Join | Returns |
|---|---|
| `INNER JOIN` | Only matching rows from both |
| `LEFT JOIN` | All from left + matches from right (NULLs if none) |
| `RIGHT JOIN` | All from right + matches from left |
| `FULL OUTER JOIN` | All from both, NULLs where no match |
| `CROSS JOIN` | Cartesian product (every combination) |
| `SELF JOIN` | A table joined to itself |

### Example

```sql
-- INNER — customers who have placed at least one order
SELECT c.name, o.id, o.total
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;

-- LEFT — ALL customers, with orders if they have any
SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;
-- ⚠️ COUNT(o.id) not COUNT(*) — COUNT(*) counts the NULL row as 1

-- ANTI-JOIN — customers with NO orders
SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
-- Alternative: WHERE NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = c.id)

-- SELF JOIN — employees with their managers
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;

-- MULTI-TABLE
SELECT c.name, p.name AS product, oi.quantity, oi.unit_price * oi.quantity AS line_total
FROM orders o
JOIN customers c   ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p    ON p.id = oi.product_id
WHERE o.status = 'completed';

-- CROSS JOIN — generate all size/colour combinations
SELECT s.size, c.color
FROM sizes s CROSS JOIN colors c;
```

### The classic trap: filtering a LEFT JOIN

```sql
-- ❌ This silently becomes an INNER JOIN
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'completed';        -- NULL rows fail this → they're dropped

-- ✅ Put the condition in the ON clause
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed';
```

**Interview Tip:** The "WHERE turns a LEFT JOIN into an INNER JOIN" trap is asked constantly and catches experienced people. The rule: conditions on the *left* table go in `WHERE`; conditions on the *right* table of a LEFT JOIN go in `ON`.

---

# Aggregations & Grouping

## What are the aggregate functions and how does GROUP BY work?

### Answer

```sql
SELECT
  category,
  COUNT(*)              AS total_rows,      -- counts all rows
  COUNT(price)          AS non_null_prices, -- ignores NULLs
  COUNT(DISTINCT brand) AS unique_brands,
  SUM(price * stock)    AS inventory_value,
  AVG(price)            AS avg_price,       -- ignores NULLs!
  MIN(price)            AS cheapest,
  MAX(price)            AS priciest,
  STRING_AGG(name, ', ' ORDER BY name) AS product_list   -- Postgres
  -- GROUP_CONCAT(name)  in MySQL
FROM products
GROUP BY category
HAVING COUNT(*) > 5
ORDER BY inventory_value DESC;
```

### NULLs and aggregates

```sql
-- Values: 10, 20, NULL
COUNT(*)      -- 3
COUNT(col)    -- 2   (NULLs skipped)
SUM(col)      -- 30
AVG(col)      -- 15  (30/2, NOT 30/3) ⚠️
AVG(COALESCE(col, 0))  -- 10 (30/3) — if you want NULL treated as zero
```

### Conditional aggregation — a very useful pattern

```sql
-- Pivot statuses into columns in one pass
SELECT
  customer_id,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,   -- Postgres
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) AS revenue,
  -- portable version:
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_portable
FROM orders
GROUP BY customer_id;
```

### GROUPING SETS, ROLLUP, CUBE

```sql
-- Subtotals and a grand total in one query
SELECT category, brand, SUM(price) AS total
FROM products
GROUP BY ROLLUP (category, brand);
-- Produces: per (category,brand), per category, and a grand total row

GROUP BY CUBE (category, brand);      -- every combination
GROUP BY GROUPING SETS ((category), (brand), ());   -- explicit control
```

**Interview Tip:** `AVG` ignoring NULLs is a classic data-quality bug. If a rating column has NULLs for unrated items, `AVG(rating)` is the average of *rated* items, not all items. Interviewers love this one.

---

# Subqueries & CTEs

## What are subqueries and CTEs?

### Answer

```sql
-- 1. Scalar subquery — returns one value
SELECT name, price,
       (SELECT AVG(price) FROM products) AS avg_price,
       price - (SELECT AVG(price) FROM products) AS diff
FROM products;

-- 2. IN subquery
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE total > 10000);

-- 3. EXISTS — usually faster, stops at the first match
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.total > 10000);

-- 4. Correlated subquery — runs once PER ROW ⚠️ slow
SELECT c.name,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
FROM customers c;

-- 5. Derived table (subquery in FROM)
SELECT city, avg_total
FROM (
  SELECT c.city, AVG(o.total) AS avg_total
  FROM orders o JOIN customers c ON c.id = o.customer_id
  GROUP BY c.city
) AS city_stats
WHERE avg_total > 5000;

-- 6. CTE — the same thing, but readable
WITH city_stats AS (
  SELECT c.city, AVG(o.total) AS avg_total, COUNT(*) AS order_count
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  GROUP BY c.city
),
top_cities AS (
  SELECT * FROM city_stats WHERE avg_total > 5000
)
SELECT * FROM top_cities ORDER BY avg_total DESC;
```

### Recursive CTE — hierarchies

```sql
-- Full org chart under a manager
WITH RECURSIVE org_chart AS (
  -- Anchor: the starting point
  SELECT id, name, manager_id, 1 AS level, name::text AS path
  FROM employees
  WHERE id = 1

  UNION ALL

  -- Recursive part: joins back to the CTE
  SELECT e.id, e.name, e.manager_id, oc.level + 1, oc.path || ' > ' || e.name
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
  WHERE oc.level < 10                    -- always bound the recursion
)
SELECT level, path FROM org_chart ORDER BY path;

-- Generate a date series (useful for filling gaps in reports)
WITH RECURSIVE dates AS (
  SELECT DATE '2026-01-01' AS d
  UNION ALL
  SELECT d + INTERVAL '1 day' FROM dates WHERE d < DATE '2026-01-31'
)
SELECT * FROM dates;
```

### `IN` vs `EXISTS` vs `JOIN`

| | Best when |
|---|---|
| `EXISTS` | Checking existence; short-circuits; handles NULLs safely |
| `IN` | Small, static list of values |
| `JOIN` | You need columns from the other table |
| `NOT IN` | ⚠️ **Avoid** if the subquery can return NULL |

```sql
-- ❌ Returns ZERO rows if ANY customer_id is NULL
SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);
-- because  x NOT IN (1, 2, NULL)  evaluates to UNKNOWN, never TRUE

-- ✅ Safe
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

**Interview Tip:** The `NOT IN` + NULL trap is a top-tier SQL interview question. Explain the three-valued logic: `NULL` comparisons produce `UNKNOWN`, and `NOT UNKNOWN` is still `UNKNOWN`, which filters out every row.

---

# Window Functions

## What are window functions and how do they differ from GROUP BY?

### Answer

Window functions compute across a set of rows **without collapsing them**. `GROUP BY` reduces many rows to one; a window function keeps every row and adds a computed column.

```sql
function() OVER (
  PARTITION BY col      -- split into groups (like GROUP BY, but non-collapsing)
  ORDER BY col          -- ordering within the partition
  ROWS BETWEEN ... AND ...   -- frame
)
```

### Example

```sql
SELECT
  name, category, price,

  -- Ranking
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS row_num,
  RANK()       OVER (PARTITION BY category ORDER BY price DESC) AS rank,      -- gaps: 1,2,2,4
  DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC) AS dense_rank,-- no gaps: 1,2,2,3
  NTILE(4)     OVER (ORDER BY price) AS quartile,
  PERCENT_RANK() OVER (ORDER BY price) AS pct_rank,

  -- Aggregates without collapsing
  AVG(price)   OVER (PARTITION BY category) AS category_avg,
  SUM(price)   OVER (PARTITION BY category) AS category_total,
  COUNT(*)     OVER (PARTITION BY category) AS category_count,
  price - AVG(price) OVER (PARTITION BY category) AS diff_from_avg,

  -- Offsets
  LAG(price, 1)  OVER (ORDER BY created_at) AS prev_price,
  LEAD(price, 1) OVER (ORDER BY created_at) AS next_price,
  FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price DESC) AS most_expensive,
  LAST_VALUE(name)  OVER (PARTITION BY category ORDER BY price DESC
                          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS cheapest,

  -- Running total
  SUM(price) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,

  -- Moving average over 7 rows
  AVG(price) OVER (ORDER BY created_at ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7
FROM products;
```

### RANK vs DENSE_RANK vs ROW_NUMBER

```
Salaries: 100, 90, 90, 80

ROW_NUMBER:  1, 2, 3, 4     -- always unique
RANK:        1, 2, 2, 4     -- ties share, then SKIP
DENSE_RANK:  1, 2, 2, 3     -- ties share, no gap
```

### Classic problems solved with windows

```sql
-- Top 3 products per category
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
) t
WHERE rn <= 3;

-- Month-over-month growth
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
  ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
        / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS growth_pct
FROM monthly_revenue;

-- Gaps and islands: consecutive login streaks
WITH grouped AS (
  SELECT user_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM logins
)
SELECT user_id, MIN(login_date) AS streak_start, MIN(login_date) AS streak_end, COUNT(*) AS streak_length
FROM grouped
GROUP BY user_id, grp
HAVING COUNT(*) >= 3;

-- Deduplicate — keep the newest row per email
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
    FROM users
  ) t WHERE rn > 1
);
```

**Interview Tip:** "Top N per group" is *the* window-function interview question. The `ROW_NUMBER() + WHERE rn <= N` pattern is the answer, and knowing why it needs a subquery (window functions can't be used in `WHERE`) is the follow-up.

---

# Indexes

## How do database indexes work?

### Answer

Usually a **B+ tree**: a balanced tree where leaf nodes hold the indexed values and pointers to rows. Lookups go from O(n) to O(log n).

```sql
-- Single column
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Composite — LEFTMOST PREFIX rule applies
CREATE INDEX idx_orders_cust_date ON orders(customer_id, created_at DESC);
-- Usable for: (customer_id), (customer_id, created_at)
-- NOT usable for: (created_at) alone

-- Unique
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Partial — smaller and faster
CREATE INDEX idx_active_orders ON orders(created_at)
  WHERE status = 'active';

-- Covering index (INCLUDE) — enables index-only scans
CREATE INDEX idx_orders_covering ON orders(customer_id) INCLUDE (total, status);

-- Expression index
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
-- Now this uses the index:
SELECT * FROM users WHERE LOWER(email) = 'a@b.com';

-- Full text (Postgres)
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description));
```

### What kills index usage

```sql
-- ❌ Function on the indexed column
WHERE YEAR(created_at) = 2026;
-- ✅ Range instead
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';

-- ❌ Leading wildcard
WHERE name LIKE '%phone';
-- ✅ Trailing wildcard can use the index
WHERE name LIKE 'phone%';

-- ❌ Implicit type conversion
WHERE user_id = '123';       -- user_id is INT
-- ✅
WHERE user_id = 123;

-- ❌ OR across different columns often prevents index use
WHERE email = 'x' OR phone = 'y';
-- ✅ UNION of two indexed queries
SELECT * FROM users WHERE email = 'x'
UNION
SELECT * FROM users WHERE phone = 'y';

-- ❌ Low selectivity — an index on a boolean rarely helps
WHERE is_active = true;      -- if 90% of rows are active, a seq scan is cheaper
```

### The cost of indexes

| Benefit | Cost |
|---|---|
| Faster SELECT | Slower INSERT/UPDATE/DELETE |
| Faster JOIN | Disk space |
| Enforces UNIQUE | Memory (they must be cached) |
| Enables sorted reads | Maintenance overhead |

**Interview Tip:** State the tradeoff explicitly: *"Every index speeds up reads and slows down writes. On a write-heavy table I index only what queries actually need, verified against the slow query log."*

---

# Normalization

## Explain the normal forms.

### Answer

| Form | Rule |
|---|---|
| **1NF** | Atomic values, no repeating groups, each row unique |
| **2NF** | 1NF + no partial dependency on part of a composite key |
| **3NF** | 2NF + no transitive dependency (non-key → non-key) |
| **BCNF** | 3NF + every determinant is a candidate key |
| **4NF** | BCNF + no multi-valued dependencies |

### Example

```sql
-- ❌ UNNORMALIZED
| order_id | customer_name | customer_city | products              | total |
| 1        | Jaydip        | Surat         | "Laptop, Mouse"       | 55000 |

-- ✅ 1NF — atomic values, one product per row
| order_id | customer_name | customer_city | product | price |
| 1        | Jaydip        | Surat         | Laptop  | 50000 |
| 1        | Jaydip        | Surat         | Mouse   | 5000  |

-- ✅ 2NF — customer details don't depend on (order_id, product)
orders:      | order_id | customer_id |
order_items: | order_id | product     | price |
customers:   | customer_id | name | city |

-- ✅ 3NF — remove transitive dependency (city → state → country)
customers: | customer_id | name | city_id |
cities:    | city_id | city_name | state_id |
states:    | state_id | state_name | country |
```

### When to denormalise

```sql
-- Normalised: computing an order total requires a JOIN + SUM every time
SELECT o.id, SUM(oi.quantity * oi.unit_price)
FROM orders o JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;

-- Denormalised: store the total, update it on write
ALTER TABLE orders ADD COLUMN total DECIMAL(10,2);
-- ✅ Reads are instant
-- ⚠️ You now own keeping it correct (triggers, application logic, or a materialised view)
```

**Interview Tip:** *"Normalise until it hurts, denormalise until it works."* Real systems are normalised for correctness and selectively denormalised for read performance — and the denormalised value must be maintained transactionally or via a materialised view.

---

# Transactions & ACID

## What are ACID properties?

### Answer

| Property | Meaning |
|---|---|
| **Atomicity** | All operations succeed or none do |
| **Consistency** | Constraints hold before and after |
| **Isolation** | Concurrent transactions don't interfere |
| **Durability** | Committed data survives a crash |

### Example

```sql
BEGIN;

  UPDATE accounts SET balance = balance - 1000 WHERE id = 1;

  -- Check the invariant BEFORE committing
  DO $$
  BEGIN
    IF (SELECT balance FROM accounts WHERE id = 1) < 0 THEN
      RAISE EXCEPTION 'Insufficient funds';
    END IF;
  END $$;

  UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
  INSERT INTO transfers (from_id, to_id, amount) VALUES (1, 2, 1000);

COMMIT;
-- ROLLBACK; on any failure

-- Savepoints — partial rollback
BEGIN;
  INSERT INTO orders (...) VALUES (...);
  SAVEPOINT after_order;
  INSERT INTO order_items (...) VALUES (...);   -- fails
  ROLLBACK TO after_order;                      -- keeps the order, drops the item
COMMIT;
```

## What are isolation levels and the anomalies they prevent?

### Answer

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| READ UNCOMMITTED | ✅ possible | ✅ possible | ✅ possible |
| READ COMMITTED | ❌ prevented | ✅ possible | ✅ possible |
| REPEATABLE READ | ❌ | ❌ | ✅ possible* |
| SERIALIZABLE | ❌ | ❌ | ❌ |

\* PostgreSQL's REPEATABLE READ also prevents phantoms via MVCC snapshots.

### The anomalies

```sql
-- DIRTY READ — reading uncommitted data
-- T1: UPDATE accounts SET balance = 500 WHERE id = 1;   (not committed)
-- T2: SELECT balance FROM accounts WHERE id = 1;        → 500
-- T1: ROLLBACK;                                          → T2 read a value that never existed

-- NON-REPEATABLE READ — same query, different result in one transaction
-- T1: SELECT balance FROM accounts WHERE id = 1;   → 1000
-- T2: UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;
-- T1: SELECT balance FROM accounts WHERE id = 1;   → 500  ⚠️

-- PHANTOM READ — same range query returns NEW rows
-- T1: SELECT COUNT(*) FROM orders WHERE total > 100;   → 10
-- T2: INSERT INTO orders (total) VALUES (500); COMMIT;
-- T1: SELECT COUNT(*) FROM orders WHERE total > 100;   → 11  ⚠️
```

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Default: READ COMMITTED in PostgreSQL and Oracle
--          REPEATABLE READ in MySQL/InnoDB
```

## Pessimistic vs optimistic locking

```sql
-- PESSIMISTIC — lock the row, others wait
BEGIN;
  SELECT * FROM products WHERE id = 1 FOR UPDATE;        -- exclusive lock
  UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;

SELECT ... FOR UPDATE NOWAIT;         -- fail immediately if locked
SELECT ... FOR UPDATE SKIP LOCKED;    -- skip locked rows — the queue pattern
SELECT ... FOR SHARE;                 -- shared lock, blocks writers only

-- OPTIMISTIC — no lock; detect conflict via a version column
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 5;
-- If 0 rows affected, someone else updated it → retry in the application
```

### The job-queue pattern

```sql
-- Multiple workers pulling jobs without stepping on each other
BEGIN;
  SELECT * FROM jobs
  WHERE status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;      -- ← the magic

  UPDATE jobs SET status = 'processing', worker_id = $1 WHERE id = $2;
COMMIT;
```

**Interview Tip:** `FOR UPDATE SKIP LOCKED` is how you build a reliable queue on plain SQL without Redis or RabbitMQ. It's a great, concrete answer to "how would you handle concurrent workers?"

**Common Mistakes:** Read-then-write without locking — the classic overselling bug: two requests both read `stock = 1` and both decrement it.

---

# Query Optimisation

## How do you find and fix slow queries?

### Answer

```sql
-- 1. EXPLAIN — see the plan
EXPLAIN ANALYZE
SELECT c.name, COUNT(o.id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Surat'
GROUP BY c.id, c.name;
```

```
Output to read:
  Seq Scan on customers      ← ❌ full table scan, needs an index
  Index Scan using idx_...   ← ✅
  Nested Loop                ← fine for small sets, terrible for large
  Hash Join                  ← good for large unsorted sets
  Merge Join                 ← good when both inputs are sorted
  rows=1000 (actual rows=1)  ← ⚠️ bad estimate → run ANALYZE
  Sort Method: external merge Disk  ← ⚠️ spilling to disk, raise work_mem
```

### The optimisation checklist

```sql
-- 1. Index the columns in WHERE, JOIN and ORDER BY
CREATE INDEX idx_customers_city ON customers(city);

-- 2. SELECT only the columns you need
SELECT id, name FROM users;      -- not SELECT *

-- 3. Avoid N+1 queries
-- ❌ 1 query for orders + N queries for customers
-- ✅ one JOIN, or one IN query

-- 4. Use EXISTS instead of IN for large subqueries

-- 5. Avoid OFFSET for deep pagination
SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 100000;   -- ❌ scans 100,020 rows
SELECT * FROM posts WHERE id > 100000 ORDER BY id LIMIT 20; -- ✅ keyset pagination

-- 6. Batch writes
INSERT INTO t (a, b) VALUES (1,2), (3,4), (5,6);   -- one round trip

-- 7. Keep statistics fresh
ANALYZE orders;

-- 8. Materialised views for expensive repeated aggregations
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT DATE_TRUNC('month', created_at) AS month, SUM(total) AS revenue
FROM orders GROUP BY 1;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;

-- 9. Partition huge tables
CREATE TABLE orders (...) PARTITION BY RANGE (created_at);
CREATE TABLE orders_2026_01 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**Interview Tip:** Always start with `EXPLAIN ANALYZE`, not guesses. And know the difference: `EXPLAIN` shows the *estimated* plan; `EXPLAIN ANALYZE` actually *runs* the query and shows real timings and row counts. A big gap between estimated and actual rows means stale statistics.

---

# Common SQL Problems

Classic interview questions with solutions.

```sql
-- 1. SECOND HIGHEST SALARY
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Nth highest, handling ties
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
OFFSET 1 LIMIT 1;

-- With window function (best)
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) t WHERE rnk = 2;

-- 2. FIND DUPLICATES
SELECT email, COUNT(*) AS cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. DELETE DUPLICATES, KEEP THE OLDEST
DELETE FROM users a
USING users b
WHERE a.email = b.email AND a.id > b.id;

-- 4. EMPLOYEES EARNING MORE THAN THEIR MANAGER
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;

-- 5. DEPARTMENTS WITH NO EMPLOYEES
SELECT d.* FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;

-- 6. TOP N PER GROUP
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
  FROM employees
) t WHERE rn <= 3;

-- 7. RUNNING TOTAL
SELECT created_at, total,
       SUM(total) OVER (ORDER BY created_at) AS running_total
FROM orders;

-- 8. MONTH-OVER-MONTH GROWTH
WITH monthly AS (
  SELECT DATE_TRUNC('month', created_at) AS month, SUM(total) AS revenue
  FROM orders GROUP BY 1
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS growth_pct
FROM monthly;

-- 9. PIVOT — statuses as columns
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'pending')   AS pending
FROM orders
GROUP BY 1 ORDER BY 1;

-- 10. CUSTOMERS WHO BOUGHT ALL PRODUCTS IN A CATEGORY (relational division)
SELECT o.customer_id
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE p.category = 'electronics'
GROUP BY o.customer_id
HAVING COUNT(DISTINCT p.id) = (SELECT COUNT(*) FROM products WHERE category = 'electronics');

-- 11. CONSECUTIVE DAYS (gaps and islands)
WITH numbered AS (
  SELECT user_id, activity_date,
         activity_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date))::int AS grp
  FROM activity
)
SELECT user_id, COUNT(*) AS streak, MIN(activity_date) AS start_date
FROM numbered GROUP BY user_id, grp HAVING COUNT(*) >= 3;

-- 12. MEDIAN
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median FROM employees;

-- 13. FILL MISSING DATES
WITH RECURSIVE d AS (
  SELECT DATE '2026-01-01' AS day
  UNION ALL SELECT day + 1 FROM d WHERE day < DATE '2026-01-31'
)
SELECT d.day, COALESCE(SUM(o.total), 0) AS revenue
FROM d LEFT JOIN orders o ON DATE(o.created_at) = d.day
GROUP BY d.day ORDER BY d.day;

-- 14. UPSERT
INSERT INTO products (id, name, stock) VALUES (1, 'Laptop', 10)
ON CONFLICT (id) DO UPDATE
SET stock = products.stock + EXCLUDED.stock, updated_at = NOW();

-- 15. CUSTOMER LIFETIME VALUE + SEGMENTATION
SELECT
  c.id, c.name,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total), 0) AS lifetime_value,
  MAX(o.created_at) AS last_order,
  CASE
    WHEN MAX(o.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(o.created_at) > NOW() - INTERVAL '90 days' THEN 'at_risk'
    WHEN MAX(o.created_at) IS NULL THEN 'never_purchased'
    ELSE 'churned'
  END AS segment
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed'
GROUP BY c.id, c.name
ORDER BY lifetime_value DESC;
```

---

# Rapid Fire

**What is the difference between `DELETE`, `TRUNCATE` and `DROP`?**
`DELETE` removes rows (logged, rollback-able, fires triggers, keeps the table). `TRUNCATE` removes all rows fast (minimal logging, resets identity, usually can't be rolled back in MySQL). `DROP` removes the table entirely.

**What is the difference between `UNION` and `UNION ALL`?**
`UNION` removes duplicates (requires a sort — slower). `UNION ALL` keeps everything and is much faster. Use `ALL` unless you specifically need dedup.

**What is a primary key vs unique key?**
Primary: one per table, `NOT NULL`, clustered by default in many engines. Unique: multiple allowed, permits one NULL (per standard).

**What is a foreign key?**
A column referencing another table's key, enforcing referential integrity. Options: `ON DELETE CASCADE | SET NULL | RESTRICT | NO ACTION`.

**What is a composite key?**
A primary key made of multiple columns.

**What is a surrogate key vs natural key?**
Surrogate = artificial (`SERIAL`/UUID). Natural = meaningful business value (email, ISBN). Surrogates are usually preferred because business values change.

**What is a view?**
A stored query treated as a table. It doesn't store data (unless materialised) and simplifies complex queries and permissions.

**What is a materialised view?**
A view whose results are physically stored and refreshed on demand — a cached aggregate.

**What is a stored procedure?**
Precompiled SQL stored in the database. Reduces round trips, but couples logic to the DB and is hard to version-control.

**What is a trigger?**
Code that runs automatically on INSERT/UPDATE/DELETE. Useful for audit trails; dangerous when it hides business logic.

**What is a cursor?**
A pointer for row-by-row processing. Almost always slower than set-based SQL — avoid unless necessary.

**What is a self-join?**
Joining a table to itself, using aliases — for hierarchies and comparing rows within a table.

**What is `COALESCE` vs `NULLIF` vs `ISNULL`?**
`COALESCE(a,b,c)` returns the first non-NULL. `NULLIF(a,b)` returns NULL if a = b (great for avoiding divide-by-zero). `ISNULL` is SQL Server's two-argument version.

**What is `CASE`?**
Inline conditional: `CASE WHEN x THEN y ELSE z END`. Works in SELECT, WHERE, ORDER BY and inside aggregates.

**What is the difference between `CHAR` and `VARCHAR`?**
`CHAR(n)` is fixed-length and space-padded; `VARCHAR(n)` is variable-length. In PostgreSQL there's no performance benefit to `CHAR`.

**What is an index scan vs index seek vs table scan?**
Seek = jump directly to matching rows (best). Index scan = read the whole index. Table scan = read every row (worst).

**What is a clustered vs non-clustered index?**
Clustered determines the physical row order (one per table). Non-clustered is a separate structure pointing at rows. PostgreSQL has no true clustered index — it has `CLUSTER` as a one-off operation.

**What is a deadlock and how do you avoid it?**
Two transactions each holding a lock the other needs. Avoid by always acquiring locks in the same order, keeping transactions short, and using lower isolation where safe.

**What is database sharding vs partitioning?**
Partitioning splits a table within one database. Sharding splits data across separate database servers.

**What is replication?**
Copying data to other servers for redundancy and read scaling. Synchronous (consistent, slower) or asynchronous (fast, may lag).

**What is the N+1 query problem?**
Fetching a list, then querying per item. Fix with a JOIN, an `IN` query, or ORM eager loading.

**What is SQL injection and how do you prevent it?**
Injecting SQL through unsanitised input. Prevent with parameterised queries — always, without exception.

**What is an execution plan?**
The steps the optimiser chose to run your query. Read it with `EXPLAIN` / `EXPLAIN ANALYZE`.

**What is `DISTINCT ON` (PostgreSQL)?**
Returns the first row per group without a subquery: `SELECT DISTINCT ON (customer_id) * FROM orders ORDER BY customer_id, created_at DESC`.

**What is `LATERAL JOIN`?**
A join where the right side can reference columns from the left — ideal for "top N per row" queries.

---

## 📌 Interview Checklist

- [ ] Draw the logical execution order of a SELECT
- [ ] `WHERE` vs `HAVING`, and why aliases fail in `WHERE`
- [ ] Explain every join type, plus the LEFT JOIN + WHERE trap
- [ ] Why does `NOT IN` break with NULLs?
- [ ] `RANK` vs `DENSE_RANK` vs `ROW_NUMBER`
- [ ] Solve "top 3 per group" and "second highest salary"
- [ ] Explain isolation levels and the three anomalies
- [ ] What is `FOR UPDATE SKIP LOCKED` used for?
- [ ] Name five things that prevent an index from being used
- [ ] Read an `EXPLAIN ANALYZE` output and spot the problem
