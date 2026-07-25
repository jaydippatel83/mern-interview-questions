# 🟢 Node.js Interview Questions

> Event loop · Streams · Modules · Clustering · Buffers · Error handling · Performance · Security

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Event Loop](#event-loop)
3. [Modules](#modules)
4. [Async Patterns](#async-patterns)
5. [Streams & Buffers](#streams--buffers)
6. [File System](#file-system)
7. [Events & EventEmitter](#events--eventemitter)
8. [Child Processes, Cluster & Worker Threads](#child-processes-cluster--worker-threads)
9. [Error Handling](#error-handling)
10. [Performance](#performance)
11. [Security](#security)
12. [Testing & Debugging](#testing--debugging)
13. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is Node.js and how does it work?

### Answer

A JavaScript runtime built on V8 that runs outside the browser. It adds an **event loop** (libuv), a **thread pool**, and APIs for file system, network, processes and crypto.

```
┌─────────────────────────────────────┐
│  Your JavaScript                    │
├─────────────────────────────────────┤
│  Node.js APIs (fs, http, crypto)    │
├──────────────┬──────────────────────┤
│  V8 engine   │  libuv               │
│  (executes)  │  (event loop, thread │
│              │   pool, async I/O)   │
├──────────────┴──────────────────────┤
│  Operating System                   │
└─────────────────────────────────────┘
```

### Why do we use it?

**Single-threaded, non-blocking, event-driven.** One thread handles thousands of concurrent connections because I/O doesn't block — the thread registers a callback and moves on.

### When should we use it?

- ✅ **Good fit:** APIs, real-time apps (chat, notifications), streaming, microservices, BFF layers, tooling — anything I/O-bound.
- ❌ **Poor fit:** heavy CPU work (video encoding, ML training, image processing at scale) — it blocks the single thread. Use worker threads, a queue, or a different language.

### Example

```js
// Blocking — the entire process waits
const data = fs.readFileSync('big.txt');   // nothing else runs
console.log('after');

// Non-blocking — the thread continues immediately
fs.readFile('big.txt', (err, data) => console.log('file done'));
console.log('after');    // prints FIRST
```

**Interview Tip:** "Node is single-threaded" is only half true. Your **JavaScript** runs on one thread, but libuv maintains a thread pool (default 4, `UV_THREADPOOL_SIZE`) for file I/O, DNS, `crypto.pbkdf2`, and compression. Network I/O uses the OS's async mechanisms (epoll/kqueue/IOCP) and doesn't use the pool at all.

**Common Mistakes:** Saying Node is "faster than Java/Python." It's efficient for I/O concurrency, not raw computation.

---

## What is the difference between Node.js and the browser?

### Answer

| | Browser | Node.js |
|---|---|---|
| Global object | `window` | `global` / `globalThis` |
| DOM | ✅ | ❌ |
| File system | ❌ (sandboxed) | ✅ |
| Modules | ESM | CommonJS + ESM |
| APIs | fetch, localStorage, DOM | fs, http, os, process, crypto |
| Environment | Many versions, uncontrolled | You pick the version |
| Security model | Sandboxed, CORS | Full system access |

**Interview Tip:** Modern Node has adopted many browser APIs: `fetch`, `AbortController`, `URL`, `URLSearchParams`, `TextEncoder`, `structuredClone`, `Web Streams`, and a built-in test runner. Knowing that shows you follow the runtime, not just tutorials.

---

# Event Loop

## Explain the Node.js event loop phases.

### Answer

libuv runs the loop through six phases, in order, repeatedly:

```
   ┌───────────────────────────┐
┌─>│         timers            │  setTimeout, setInterval callbacks
│  ├───────────────────────────┤
│  │    pending callbacks      │  deferred I/O callbacks (e.g. TCP errors)
│  ├───────────────────────────┤
│  │     idle, prepare         │  internal
│  ├───────────────────────────┤      ┌───────────────┐
│  │          poll             │<─────┤  incoming I/O │
│  │  (retrieve I/O events,    │      └───────────────┘
│  │   execute their callbacks)│
│  ├───────────────────────────┤
│  │          check            │  setImmediate callbacks
│  ├───────────────────────────┤
└──┤      close callbacks      │  socket.on('close'), etc.
   └───────────────────────────┘

Between EVERY phase (and between each callback):
  1. process.nextTick queue   — drained first, completely
  2. Promise microtask queue  — drained next, completely
```

### Example

```js
console.log('1: sync');

setTimeout(() => console.log('2: timeout 0'), 0);
setImmediate(() => console.log('3: immediate'));

process.nextTick(() => console.log('4: nextTick'));
Promise.resolve().then(() => console.log('5: promise'));

fs.readFile(__filename, () => {
  console.log('6: I/O callback');
  setTimeout(() => console.log('7: timeout inside I/O'), 0);
  setImmediate(() => console.log('8: immediate inside I/O'));
});

console.log('9: sync end');

/* Output:
1: sync
9: sync end
4: nextTick        ← nextTick beats promises
5: promise
2: timeout 0       ← order of 2 and 3 at top level is NON-DETERMINISTIC
3: immediate
6: I/O callback
8: immediate inside I/O   ← inside an I/O callback, immediate ALWAYS beats timeout
7: timeout inside I/O
*/
```

### Why is `setTimeout(0)` vs `setImmediate` non-deterministic at the top level?

It depends on how long the process took to start. If the loop enters the timers phase after 1ms has elapsed, the timer fires first; if not, it goes to `check` first. **Inside an I/O callback** it's deterministic — you're already past the poll phase, so `check` (immediate) comes before the next timers phase.

**Interview Tip:** `process.nextTick` has higher priority than promises and is **not** part of the loop phases — it drains after the current operation completes. Recursive `nextTick` calls can starve the event loop entirely; recursive `setImmediate` cannot.

**Common Mistakes:** Saying `setTimeout(fn, 0)` runs "immediately" — the minimum is 1ms and it waits for the timers phase.

---

## What is the difference between `process.nextTick`, `setImmediate`, `setTimeout` and `queueMicrotask`?

### Answer

| API | Runs | Priority |
|---|---|---|
| `process.nextTick` | After the current operation, before promises | **Highest** |
| `queueMicrotask` / promises | Microtask queue | High |
| `setTimeout(fn, 0)` | Timers phase (≥1ms) | Normal |
| `setImmediate` | Check phase, after poll | Normal |

### Example

```js
// nextTick can starve the loop
function starve() { process.nextTick(starve); }
// starve();  ← the loop never proceeds, I/O never runs

// setImmediate yields between iterations — safe
function safe() { setImmediate(safe); }

// Legitimate nextTick use: emit an event AFTER the caller attaches listeners
class Job extends EventEmitter {
  constructor() {
    super();
    // ❌ this.emit('ready') — no listener attached yet, event is lost
    process.nextTick(() => this.emit('ready'));   // ✅ caller has attached by now
  }
}
const job = new Job();
job.on('ready', () => console.log('caught it'));
```

**Interview Tip:** Node's own docs say to prefer `setImmediate` over `process.nextTick` for most cases, because it's easier to reason about and can't starve the loop.

---

# Modules

## What is the difference between CommonJS and ES Modules in Node?

### Answer

| | CommonJS | ES Modules |
|---|---|---|
| Syntax | `require` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Asynchronous |
| Resolution | Runtime | Static (hoisted) |
| Bindings | Value copies | **Live bindings** |
| Top-level await | ❌ | ✅ |
| `__dirname`, `__filename` | ✅ | ❌ (use `import.meta.url`) |
| Tree-shaking | ❌ | ✅ |
| File extension | `.js`, `.cjs` | `.mjs`, or `"type": "module"` |
| Import CJS | ✅ | ✅ (default export only) |
| Import ESM | `await import()` only | ✅ |

### Example

```js
// CommonJS
const fs = require('node:fs');
module.exports = { a, b };
exports.c = c;                       // ⚠️ never reassign `exports` itself

// ESM
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
export const a = 1;
export default function () {}

// ESM equivalents of __dirname / __filename
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Node 20.11+:
const dir = import.meta.dirname;

// Top-level await — ESM only
const config = await loadConfig();

// Dynamic import works in both
const { default: chalk } = await import('chalk');
```

```jsonc
// package.json — dual package
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

**Interview Tip:** The `require` cache is why a CommonJS module is a singleton — `require('./db')` in ten files returns the same object. That's the standard pattern for database connections.

**Common Mistakes:** `exports = {...}` (breaks the reference — use `module.exports`); forgetting the file extension in ESM imports (`./utils.js`, not `./utils`).

---

## How does `require` work internally?

### Answer

Five steps:

1. **Resolve** — turn the specifier into an absolute path (core module → `node_modules` walk up → relative path)
2. **Load** — read the file, determine the type (`.js`, `.json`, `.node`)
3. **Wrap** — wrap the source in a function
4. **Evaluate** — execute it
5. **Cache** — store in `require.cache` keyed by resolved path

### The module wrapper

```js
(function (exports, require, module, __filename, __dirname) {
  // your code lives here
});
```

That's why those five variables exist without being declared, and why top-level `this` equals `module.exports`.

### Example

```js
// Caching means side effects run once
require('./setup');   // executes
require('./setup');   // returns the cached exports, does NOT re-execute

// Clearing the cache (testing / hot reload)
delete require.cache[require.resolve('./config')];

// Circular dependencies return a PARTIAL export
// a.js
exports.loaded = false;
const b = require('./b');    // b requires a back → gets a partially-filled object
exports.loaded = true;
```

**Interview Tip:** Circular dependencies don't crash — you get whatever was exported *so far*. That's why the bug shows up as `undefined is not a function` rather than an import error. ESM handles cycles better via hoisting and the TDZ.

---

# Async Patterns

## How do you handle asynchronous operations in Node?

### Answer

```js
// 1. Callbacks — error-first convention
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) return handleError(err);
  console.log(data);
});

// 2. Promises
import { readFile } from 'node:fs/promises';
readFile('file.txt', 'utf8').then(console.log).catch(handleError);

// 3. async/await — the standard today
try {
  const data = await readFile('file.txt', 'utf8');
} catch (err) {
  handleError(err);
}

// 4. Promisify a legacy callback API
import { promisify } from 'node:util';
const sleep = promisify(setTimeout);

// 5. Parallel vs sequential
const [users, posts] = await Promise.all([getUsers(), getPosts()]);      // fast
const results = await Promise.allSettled([a(), b()]);                    // never rejects

// 6. Concurrency limit — don't open 10,000 connections at once
async function pool(items, worker, limit = 10) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const index = i++;
        results[index] = await worker(items[index], index);
      }
    })
  );
  return results;
}

// 7. AsyncLocalStorage — request context without passing it everywhere
import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage();

app.use((req, res, next) => {
  als.run({ requestId: crypto.randomUUID(), userId: req.user?.id }, next);
});

function log(message) {
  const ctx = als.getStore();
  console.log(JSON.stringify({ ...ctx, message }));   // correlated automatically
}
```

**Interview Tip:** `AsyncLocalStorage` is the Node answer to thread-local storage — request IDs and tracing context flow through every async hop without threading a `ctx` parameter through 20 functions. Very few candidates mention it.

---

# Streams & Buffers

## What are streams and why do we use them?

### Answer

Interfaces for reading/writing data **in chunks** rather than loading it all into memory.

### Four types

| Type | Description | Example |
|---|---|---|
| **Readable** | Source of data | `fs.createReadStream`, HTTP request |
| **Writable** | Destination | `fs.createWriteStream`, HTTP response |
| **Duplex** | Both | TCP socket |
| **Transform** | Duplex that modifies | `zlib.createGzip`, crypto ciphers |

### Example

```js
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { Transform } from 'node:stream';

// ❌ Loads a 2GB file entirely into RAM — process dies
const data = await readFile('huge.csv');
await writeFile('out.csv', transform(data));

// ✅ Constant memory, no matter the file size
await pipeline(
  createReadStream('huge.csv'),
  createGzip(),
  createWriteStream('huge.csv.gz')
);

// Custom transform stream
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  },
});

// Streaming an HTTP response — user sees data immediately
app.get('/export', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=export.csv');

  const cursor = db.collection('orders').find().stream();
  await pipeline(cursor, toCSV(), res);
});

// Async iteration over a readable stream
for await (const chunk of createReadStream('file.txt', { encoding: 'utf8' })) {
  process(chunk);
}
```

### Backpressure

```js
// The core problem streams solve: a fast producer overwhelming a slow consumer
readable.on('data', (chunk) => {
  const ok = writable.write(chunk);
  if (!ok) {
    readable.pause();                       // stop reading
    writable.once('drain', () => readable.resume());   // resume when flushed
  }
});

// pipeline() handles ALL of this for you — always prefer it
await pipeline(readable, writable);
```

**Interview Tip:** Always say **`pipeline`**, not `.pipe()`. `.pipe()` does not forward errors or clean up destroyed streams, which leaks file descriptors. `pipeline` handles both.

**Common Mistakes:** Reading a large file with `readFile` in a request handler — one big upload can OOM the process.

---

## What is a Buffer?

### Answer

A fixed-length chunk of raw binary data outside the V8 heap. It's Node's way of handling bytes — files, network packets, images, crypto.

### Example

```js
// Creating
Buffer.from('hello');                       // from a string
Buffer.from([72, 101, 108]);                // from bytes
Buffer.alloc(10);                           // 10 zeroed bytes ✅ safe
Buffer.allocUnsafe(10);                     // faster, but contains OLD MEMORY ⚠️

// Encoding conversions
const buf = Buffer.from('Hello');
buf.toString('utf8');       // 'Hello'
buf.toString('base64');     // 'SGVsbG8='
buf.toString('hex');        // '48656c6c6f'
Buffer.from('SGVsbG8=', 'base64').toString();   // 'Hello'

// Operations
Buffer.concat([buf1, buf2]);
buf.length;                 // BYTE length, not character count
Buffer.byteLength('héllo'); // 6 — 'é' is 2 bytes in UTF-8

// Timing-safe comparison for secrets
import { timingSafeEqual } from 'node:crypto';
timingSafeEqual(Buffer.from(a), Buffer.from(b));   // resists timing attacks
```

**Interview Tip:** `Buffer.allocUnsafe` is faster because it skips zero-filling, but the memory may contain fragments of previously freed data — a real information-leak vector. Only use it when you immediately overwrite the whole buffer.

---

# File System

## How do you work with files in Node?

### Answer

```js
import { readFile, writeFile, appendFile, mkdir, readdir, stat, rm, rename } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';

// Reading & writing
const content = await readFile('file.txt', 'utf8');
await writeFile('out.txt', 'data', 'utf8');
await appendFile('log.txt', 'line\n');

// Directories
await mkdir('a/b/c', { recursive: true });
const entries = await readdir('.', { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
await rm('temp', { recursive: true, force: true });

// Path handling — ALWAYS use path, never string concatenation
path.join('a', 'b', 'c.txt');            // 'a/b/c.txt' (correct separator per OS)
path.resolve('file.txt');                // absolute from cwd
path.extname('a/b.tar.gz');              // '.gz'
path.basename('/a/b/c.txt', '.txt');     // 'c'
path.dirname('/a/b/c.txt');              // '/a/b'

// Path traversal protection — critical for user-supplied filenames
function safePath(userInput) {
  const base = path.resolve('./uploads');
  const target = path.resolve(base, userInput);
  if (!target.startsWith(base + path.sep)) throw new Error('Invalid path');
  return target;
}
// blocks '../../etc/passwd'

// Check existence — prefer just trying the operation
try {
  await stat(file);
} catch (err) {
  if (err.code === 'ENOENT') { /* not found */ }
  else throw err;
}
```

**Interview Tip:** Never do `if (exists) { read }` — that's a TOCTOU (time-of-check-to-time-of-use) race. Just attempt the operation and handle `ENOENT`.

---

# Events & EventEmitter

## What is the EventEmitter and how do you use it?

### Answer

Node's implementation of the observer pattern — the backbone of streams, HTTP servers and sockets.

### Example

```js
import { EventEmitter, once } from 'node:events';

class OrderService extends EventEmitter {
  async createOrder(data) {
    const order = await db.orders.insert(data);
    this.emit('order:created', order);      // decoupled side effects
    return order;
  }
}

const service = new OrderService();

service.on('order:created', (order) => sendEmail(order));
service.on('order:created', (order) => updateAnalytics(order));
service.once('ready', () => console.log('runs only once'));

// Removing listeners
const handler = (o) => {};
service.on('x', handler);
service.off('x', handler);
service.removeAllListeners('x');

// Error events are SPECIAL — an unhandled 'error' event CRASHES the process
service.on('error', (err) => logger.error(err));   // always attach one

// Max listeners warning (default 10) — usually indicates a leak
service.setMaxListeners(20);

// Promise-based waiting
const [result] = await once(service, 'ready');

// Async iteration over events
for await (const [order] of on(service, 'order:created')) {
  await process(order);
}
```

**Interview Tip:** Listeners are called **synchronously**, in registration order. If one throws, later listeners don't run. That's why you wrap async work: `emitter.on('x', (d) => { handle(d).catch(log); })`.

**Common Mistakes:** No `error` listener — a single emitted error takes down the whole process with an uncaught exception.

---

# Child Processes, Cluster & Worker Threads

## How do you use multiple CPU cores in Node?

### Answer

| Approach | Use for | Memory | Communication |
|---|---|---|---|
| **cluster** | Scaling an HTTP server across cores | Separate per process | IPC |
| **worker_threads** | CPU-heavy work in one process | **Shared** (SharedArrayBuffer) | `postMessage` |
| **child_process** | Running external programs/scripts | Separate | stdio / IPC |
| **PM2 / container replicas** | Production process management | Separate | Load balancer |

### Example — cluster

```js
import cluster from 'node:cluster';
import os from 'node:os';
import http from 'node:http';

if (cluster.isPrimary) {
  const cpus = os.availableParallelism();     // better than os.cpus().length
  console.log(`Forking ${cpus} workers`);

  for (let i = 0; i < cpus; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} died (${signal || code}), restarting`);
    cluster.fork();                            // self-healing
  });
} else {
  http.createServer((req, res) => {
    res.end(`Handled by worker ${process.pid}`);
  }).listen(3000);
}
```

### Example — worker threads

```js
// main.js
import { Worker } from 'node:worker_threads';

function runHeavyTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./heavy-worker.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with ${code}`));
    });
  });
}

// heavy-worker.js
import { parentPort, workerData } from 'node:worker_threads';
const result = expensiveComputation(workerData);   // doesn't block the main thread
parentPort.postMessage(result);
```

### Example — child_process

```js
import { spawn, exec, execFile, fork } from 'node:child_process';

// spawn — streams output, best for long-running or large output
const ffmpeg = spawn('ffmpeg', ['-i', 'in.mp4', 'out.webm']);
ffmpeg.stdout.on('data', (d) => console.log(d.toString()));
ffmpeg.on('close', (code) => console.log('exited', code));

// execFile — SAFE, no shell, arguments passed as an array
execFile('git', ['log', '--oneline'], (err, stdout) => console.log(stdout));

// exec — spawns a SHELL ⚠️ command injection risk with user input
exec(`ls ${userInput}`);     // ❌ userInput = "; rm -rf /" is game over

// fork — a Node child with a built-in IPC channel
const child = fork('./worker.js');
child.send({ task: 'process' });
child.on('message', (msg) => console.log(msg));
```

**Interview Tip:** Cluster gives you **concurrency** for I/O-bound servers; worker threads give you **parallelism** for CPU-bound work. In containerised deployments, most teams skip cluster and run N container replicas instead — the orchestrator handles restarts and scaling better.

**Common Mistakes:** `exec` with user input (shell injection). Always use `execFile`/`spawn` with an argument array.

---

# Error Handling

## How do you handle errors properly in Node?

### Answer

```js
// 1. Custom error classes with operational vs programmer distinction
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;   // expected vs a bug
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource) { super(`${resource} not found`, 404); }
}
class ValidationError extends AppError {
  constructor(errors) { super('Validation failed', 400); this.errors = errors; }
}

// 2. Async errors — always try/catch or .catch()
async function getUser(id) {
  try {
    const user = await db.users.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new AppError('Database error', 500, false);   // wrap unexpected errors
  }
}

// 3. Error cause chaining (Node 16.9+)
throw new Error('Failed to load config', { cause: originalError });

// 4. Global handlers — LAST RESORT, log and exit
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  // The process is in an unknown state — flush logs and exit
  gracefulShutdown(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  gracefulShutdown(1);
});

// 5. Graceful shutdown — CRITICAL for zero-downtime deploys
const server = app.listen(3000);

async function gracefulShutdown(code = 0) {
  logger.info('Shutting down…');

  server.close(async () => {              // stop accepting NEW connections
    try {
      await db.close();                   // finish in-flight work
      await redis.quit();
      process.exit(code);
    } catch (err) {
      process.exit(1);
    }
  });

  // Force-exit if it hangs
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown(0));   // Docker/K8s sends this
process.on('SIGINT', () => gracefulShutdown(0));    // Ctrl+C
```

**Interview Tip:** The **operational vs programmer error** distinction is the senior-level answer. Operational errors (invalid input, network timeout, 404) are expected — handle and respond. Programmer errors (undefined is not a function) mean your state is corrupt — log and restart the process. Never try to "recover" from the second kind.

**Common Mistakes:** Continuing to serve traffic after `uncaughtException`; no `SIGTERM` handler, so Kubernetes kills the pod mid-request on every deploy.

---

# Performance

## How do you optimise and monitor a Node.js application?

### Answer

```js
// 1. Find the bottleneck first
node --prof app.js && node --prof-process isolate-*.log   // V8 profiler
node --inspect app.js                                      // Chrome DevTools
// clinic.js: clinic doctor -- node app.js

// 2. Never block the event loop
// ❌ Blocks everything
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
// ✅ Uses the thread pool
const hash = await promisify(crypto.pbkdf2)(password, salt, 100000, 64, 'sha512');

// ❌ Synchronous JSON of a huge object blocks
JSON.stringify(hugeArray);
// ✅ Stream it, or move to a worker

// 3. Monitor event loop lag — the single best health metric
import { monitorEventLoopDelay } from 'node:perf_hooks';
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
setInterval(() => {
  const p99 = histogram.percentile(99) / 1e6;   // ms
  if (p99 > 100) logger.warn({ p99 }, 'Event loop lag high');
}, 10_000);

// 4. Caching
const cache = new Map();
async function getUser(id) {
  if (cache.has(id)) return cache.get(id);
  const user = await db.users.findById(id);
  cache.set(id, user);
  return user;
}
// Production: Redis with a TTL, and an LRU bound in-process

// 5. Connection pooling — never open a connection per request
const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 });

// 6. Compression + proper cache headers
app.use(compression());
res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

// 7. Stream large responses instead of buffering
await pipeline(dbCursor, transformStream, res);

// 8. Tune the thread pool for heavy fs/crypto work
process.env.UV_THREADPOOL_SIZE = 8;   // must be set BEFORE any I/O
```

### Checklist

- [ ] Event loop lag monitored (p99 < 100ms)
- [ ] No sync APIs in the request path (`readFileSync`, `pbkdf2Sync`)
- [ ] Database connection pooling
- [ ] Indexes on every query field (check with EXPLAIN)
- [ ] Caching layer (Redis) for hot reads
- [ ] Compression enabled
- [ ] Large payloads streamed
- [ ] Heavy CPU work in worker threads or a queue
- [ ] Memory leaks checked (heap snapshots)
- [ ] Clustering / multiple replicas

**Interview Tip:** Event loop lag is the metric to name. High lag means requests are queuing behind synchronous work, and it's invisible in normal CPU/memory dashboards.

---

## How do you find a memory leak in Node?

### Answer

```js
// 1. Watch the trend
setInterval(() => {
  const { heapUsed, heapTotal, rss, external } = process.memoryUsage();
  logger.info({
    heapUsedMB: (heapUsed / 1e6).toFixed(1),
    rssMB: (rss / 1e6).toFixed(1),
  });
}, 60_000);
// A leak looks like a staircase that never returns to baseline after GC

// 2. Take heap snapshots and compare
import { writeHeapSnapshot } from 'node:v8';
writeHeapSnapshot('./snapshot-1.heapsnapshot');
// … run the workload …
writeHeapSnapshot('./snapshot-2.heapsnapshot');
// Load both in Chrome DevTools → Memory → Comparison view

// 3. Run with more heap detail
node --max-old-space-size=4096 --expose-gc app.js
```

### Common causes

| Cause | Fix |
|---|---|
| Unbounded cache / Map | LRU with a max size, or a TTL |
| Event listeners never removed | `off()` in cleanup; watch the max-listeners warning |
| Timers not cleared | `clearInterval` on shutdown |
| Closures over large objects | Null the reference; scope tightly |
| Global arrays that only grow | Bound them |
| Streams not destroyed on error | Use `pipeline` |

**Interview Tip:** `WeakMap`/`WeakRef` for caches keyed by objects lets the GC reclaim entries automatically — a clean fix for metadata caches.

---

# Security

## How do you secure a Node.js application?

### Answer

```js
// 1. Security headers
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));

// 2. Rate limiting
import rateLimit from 'express-rate-limit';
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
  standardHeaders: true,
}));

// 3. Input validation — validate EVERYTHING from the client
import { z } from 'zod';
const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
});
const result = schema.safeParse(req.body);
if (!result.success) return res.status(400).json({ errors: result.error.flatten() });

// 4. SQL injection — parameterised queries only
db.query('SELECT * FROM users WHERE email = $1', [email]);      // ✅
db.query(`SELECT * FROM users WHERE email = '${email}'`);       // ❌

// 5. NoSQL injection — a real MongoDB risk
// Attacker sends: { "password": { "$ne": null } }
User.findOne({ email, password });                    // ❌ operator injection
User.findOne({ email: String(email) });               // ✅ coerce
app.use(mongoSanitize());                             // ✅ strip $ and .

// 6. Password hashing
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash(password, 12);
const ok = await bcrypt.compare(password, hash);
// argon2 is the modern preference

// 7. Secrets in environment variables, never in code
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is required');

// 8. CORS — never reflect any origin with credentials
app.use(cors({
  origin: ['https://app.example.com'],     // explicit allowlist
  credentials: true,
}));

// 9. Body size limits — prevent memory exhaustion
app.use(express.json({ limit: '100kb' }));

// 10. Dependency auditing
// npm audit --production && npx snyk test
```

### OWASP Top 10 in a Node context

| Risk | Mitigation |
|---|---|
| Injection (SQL/NoSQL/command) | Parameterised queries, `execFile`, sanitise |
| Broken auth | bcrypt/argon2, rate limits, MFA, secure sessions |
| Sensitive data exposure | HTTPS, encrypt at rest, no secrets in logs |
| XXE / deserialization | Disable external entities, never `eval` user data |
| Broken access control | Check authorization on **every** request, server-side |
| Security misconfiguration | helmet, disable `x-powered-by`, no stack traces in prod |
| XSS | Escape output, CSP, sanitise HTML |
| Vulnerable dependencies | `npm audit`, Dependabot, lockfiles |
| Insufficient logging | Structured logs, alerting, no PII |
| SSRF | Allowlist outbound URLs, block internal IP ranges |

**Interview Tip:** NoSQL operator injection is the one people forget. `{ email, password }` from `req.body` lets an attacker send `{"$ne": null}` and log in as anyone. Mention `express-mongo-sanitize` and explicit type coercion.

---

# Testing & Debugging

## How do you test a Node application?

### Answer

```js
// Built-in test runner (Node 18+) — no dependencies needed
import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('UserService', () => {
  let service;
  before(async () => { service = new UserService(testDb); });
  after(async () => { await testDb.close(); });

  test('creates a user', async () => {
    const user = await service.create({ email: 'a@b.com' });
    assert.equal(user.email, 'a@b.com');
    assert.ok(user.id);
  });

  test('rejects a duplicate email', async () => {
    await service.create({ email: 'dup@b.com' });
    await assert.rejects(
      () => service.create({ email: 'dup@b.com' }),
      { name: 'ConflictError' }
    );
  });

  test('mocks an external call', async () => {
    const sendEmail = mock.fn(async () => ({ sent: true }));
    await service.register({ email: 'x@y.com' }, { sendEmail });
    assert.equal(sendEmail.mock.callCount(), 1);
  });
});

// node --test
// node --test --watch
// node --test --experimental-test-coverage
```

```js
// API integration testing with supertest
import request from 'supertest';

test('POST /api/users', async () => {
  const res = await request(app)
    .post('/api/users')
    .send({ email: 'a@b.com', password: 'secret123' })
    .expect(201);

  assert.ok(res.body.id);
  assert.equal(res.body.password, undefined);   // never leak the hash
});
```

### The testing pyramid

```
      /\      E2E (few)          — Playwright, real browser
     /  \     Integration        — supertest + a test DB (testcontainers)
    /____\    Unit (many)        — pure functions, isolated logic
```

**Interview Tip:** Use **testcontainers** or an in-memory equivalent for integration tests rather than mocking the database. Mocked DBs pass tests that fail in production because the mock doesn't enforce constraints, transactions or types.

---

# Rapid Fire

**What is `package-lock.json`?**
An exact dependency tree lock. Commit it. `npm ci` installs from it deterministically; `npm install` may update it.

**What is the difference between `npm i` and `npm ci`?**
`ci` deletes `node_modules`, installs exactly from the lockfile, fails if `package.json` and the lock disagree. Use it in CI.

**What are dependencies vs devDependencies vs peerDependencies?**
Runtime, build/test-only, and "the host app must provide this version" (plugins, React libraries).

**What is semantic versioning?**
MAJOR.MINOR.PATCH. `^1.2.3` allows minor+patch; `~1.2.3` allows patch only; `1.2.3` is exact.

**What is `npx`?**
Runs a package binary without installing it globally.

**What is `process.env`?**
Environment variables. Load from `.env` with `dotenv`, or Node 20.6+ `node --env-file=.env`.

**What is `process.argv`?**
Command-line arguments. `[0]` is the node path, `[1]` the script path, the rest are user args.

**What is the difference between `spawn` and `exec`?**
`spawn` streams output and takes an argument array (safe). `exec` buffers output and runs through a shell (injection risk, output size limit).

**What is `os.cpus()` vs `os.availableParallelism()`?**
The latter (Node 19+) respects container CPU limits and is the correct choice for sizing worker pools.

**What is `global` in Node?**
The global object. Prefer `globalThis`. Avoid attaching things to it — except a dev-mode DB singleton to survive hot reload.

**What is the `crypto` module?**
Hashing (`createHash`), HMAC, encryption, `randomUUID()`, `randomBytes()`, and `timingSafeEqual` for comparing secrets.

**How do you generate a secure random token?**
`crypto.randomBytes(32).toString('hex')` — never `Math.random()`.

**What is `zlib`?**
Compression streams: gzip, brotli, deflate.

**What is `http` vs `https` vs `http2`?**
Core server modules. In production you usually terminate TLS at a reverse proxy (Nginx) or load balancer instead.

**What is a reverse proxy and why put Nginx in front of Node?**
TLS termination, static file serving, gzip, rate limiting, load balancing across workers, and shielding Node from slow-client attacks.

**What is `pm2`?**
A process manager: clustering, auto-restart, log rotation, zero-downtime reloads, monitoring.

**What is the difference between `readFile` and `createReadStream`?**
`readFile` loads everything into memory; `createReadStream` processes it in chunks with constant memory.

**How do you handle file uploads?**
`multer` for multipart in Express, streamed straight to S3. For big files use presigned URLs so the file never touches your server.

**What is CORS and how do you configure it?**
A browser policy requiring server opt-in. Use the `cors` middleware with an explicit origin allowlist; never `origin: true` with `credentials: true`.

**What is a JWT and where do you store it?**
A signed token carrying claims. Store it in an `HttpOnly`, `Secure`, `SameSite` cookie — not localStorage.

**What is the difference between authentication and authorization?**
Authentication = who you are. Authorization = what you're allowed to do. Check both on every request.

**What is rate limiting and how do you implement it distributed?**
Cap requests per client per window. Across multiple instances you need a shared store — Redis with a sliding window or token bucket.

**What is graceful shutdown?**
On SIGTERM: stop accepting new connections, finish in-flight requests, close DB/Redis, then exit. Without it, deploys drop requests.

**What is a health check endpoint?**
`/health` for liveness (is the process up) and `/ready` for readiness (are DB/cache reachable). Kubernetes uses them to route traffic.

**What is `AsyncLocalStorage`?**
Per-request context (request id, user, trace id) that flows through async calls without being passed as a parameter.

**What is the difference between `Buffer` and `Uint8Array`?**
`Buffer` is a subclass of `Uint8Array` with extra methods (encoding conversions, `toString`, pooling).

**What is Deno / Bun and how do they compare?**
Alternative runtimes. Deno: secure by default, TypeScript native, web-standard APIs. Bun: much faster startup and bundling, Node-compatible. Node still has the largest ecosystem and production track record.

---

## 📌 Interview Checklist

- [ ] Explain the event loop phases and predict output ordering
- [ ] `process.nextTick` vs `setImmediate` vs `setTimeout`
- [ ] Why streams? Explain backpressure and why `pipeline` beats `.pipe`
- [ ] cluster vs worker_threads vs child_process
- [ ] Operational vs programmer errors — how do you treat each?
- [ ] Write a graceful shutdown handler from memory
- [ ] How do you detect and fix a memory leak?
- [ ] Name five security measures you'd add to a fresh API
- [ ] What blocks the event loop and how would you find it?
