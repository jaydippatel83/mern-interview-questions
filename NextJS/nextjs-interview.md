# ▲ Next.js Interview Questions

> App Router · Rendering strategies · Server Components · Server Actions · Caching · Routing · SEO · Deployment

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [App Router vs Pages Router](#app-router-vs-pages-router)
3. [Rendering Strategies](#rendering-strategies)
4. [Server & Client Components](#server--client-components)
5. [Data Fetching](#data-fetching)
6. [Caching](#caching)
7. [Server Actions](#server-actions)
8. [Routing](#routing)
9. [API Routes & Route Handlers](#api-routes--route-handlers)
10. [Middleware](#middleware)
11. [Optimisation](#optimisation)
12. [SEO & Metadata](#seo--metadata)
13. [Authentication](#authentication)
14. [Deployment](#deployment)
15. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is Next.js and why use it over plain React?

### Answer

A React framework that adds the things React deliberately leaves out: routing, server rendering, data fetching conventions, bundling, image/font optimisation, and a deployment model.

### Why do we use it?

| Problem with plain React (CRA/Vite SPA) | Next.js answer |
|---|---|
| Blank HTML → bad SEO | SSR / SSG / RSC |
| Slow first paint (download JS, then render) | HTML streamed from the server |
| Manual routing setup | File-system routing |
| Manual code splitting | Automatic per route |
| Image optimisation by hand | `next/image` |
| Separate backend for simple APIs | Route handlers + Server Actions |
| Env/config/build wiring | Built in |

### When should we use it?

- **Use Next.js** for anything public-facing (marketing, e-commerce, blogs, dashboards with SEO needs), or when you want one codebase for frontend + light backend.
- **Use a Vite SPA** for internal tools behind a login, where SEO is irrelevant and you want simpler mental models and no server.

### Example

```
app/
├── layout.js            → shared shell (persists across navigation)
├── page.js              → /
├── loading.js           → Suspense fallback
├── error.js             → error boundary
├── not-found.js         → 404
├── blog/
│   ├── page.js          → /blog
│   └── [slug]/
│       └── page.js      → /blog/:slug
└── api/
    └── users/route.js   → /api/users
```

**Interview Tip:** Frame it as: *"React renders; Next.js decides where and when it renders."* That one line answers the question.

**Common Mistakes:** Saying "Next.js is faster than React." It's the same React — Next just moves work to the server and ships less JS.

---

# App Router vs Pages Router

## What's the difference between the App Router and the Pages Router?

### Answer

| | Pages Router (`pages/`) | App Router (`app/`) |
|---|---|---|
| Introduced | Next 1–12 | Next 13.4+ (stable) |
| Default component type | Client | **Server** |
| Data fetching | `getServerSideProps`, `getStaticProps`, `getInitialProps` | `async` components + `fetch` |
| Layouts | `_app.js` (one, remounts) | Nested `layout.js` (persist) |
| Loading UI | Manual | `loading.js` + Suspense |
| Error handling | `_error.js` | `error.js` per segment |
| Streaming | No | **Yes** |
| Server Actions | No | Yes |
| Metadata | `next/head` | Metadata API |
| Route handlers | `pages/api` | `app/**/route.js` |

Both can coexist in one app during migration.

### Example

```jsx
// Pages Router
// pages/blog/[slug].js
export async function getServerSideProps({ params }) {
  const post = await getPost(params.slug);
  if (!post) return { notFound: true };
  return { props: { post } };
}
export default function Post({ post }) {
  return <article>{post.title}</article>;
}

// App Router — no separate data function, no props plumbing
// app/blog/[slug]/page.js
export default async function Post({ params }) {
  const { slug } = await params;              // params is a Promise in Next 15
  const post = await getPost(slug);
  if (!post) notFound();
  return <article>{post.title}</article>;
}
```

**Interview Tip:** Next 15 made `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` **async**. If you write `params.slug` directly in an interview, mention you'd `await params` on 15+. That detail shows you're current.

---

## What are `layout.js`, `template.js`, `loading.js`, `error.js` and `not-found.js`?

### Answer

Special files that define UI for a route segment.

```jsx
// app/dashboard/layout.js — WRAPS children, PERSISTS across navigation
// State inside it is NOT reset when you navigate between child routes
export default function DashboardLayout({ children }) {
  return (
    <div className="grid">
      <Sidebar />       {/* keeps scroll position and state */}
      <main>{children}</main>
    </div>
  );
}

// app/dashboard/template.js — like layout, but REMOUNTS on every navigation
// Use for enter animations or per-route state that must reset
export default function Template({ children }) {
  return <div className="fade-in">{children}</div>;
}

// app/dashboard/loading.js — automatic Suspense boundary for the segment
export default function Loading() {
  return <DashboardSkeleton />;
}

// app/dashboard/error.js — MUST be a client component
'use client';
export default function Error({ error, reset }) {
  useEffect(() => { reportError(error); }, [error]);
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/dashboard/not-found.js — rendered by notFound()
export default function NotFound() {
  return <h2>Page not found</h2>;
}

// app/global-error.js — catches errors in the root layout itself
'use client';
export default function GlobalError({ error, reset }) {
  return <html><body><h2>Fatal error</h2></body></html>;   // must render html/body
}
```

### Hierarchy

```
layout
 └── template
      └── error boundary
           └── loading (Suspense)
                └── page
```

**Interview Tip:** `layout` vs `template` is a favourite. Layout persists (good for sidebars, avoids re-fetching); template remounts (good for animations and `useEffect` that must run per navigation).

---

# Rendering Strategies

## Explain SSR, SSG, ISR and CSR in Next.js.

### Answer

| Strategy | HTML generated | Best for | Freshness |
|---|---|---|---|
| **SSG** (Static) | At build time | Blogs, docs, marketing | Stale until rebuild |
| **ISR** (Incremental Static Regeneration) | At build + revalidated in the background | Product pages, news | Configurable |
| **SSR** (Server-side) | On every request | Dashboards, personalised pages | Always fresh |
| **CSR** (Client-side) | In the browser | Behind-login widgets, charts | Fresh, but slow first paint |
| **PPR** (Partial Prerendering) | Static shell + streamed dynamic holes | Mixed pages | Best of both |

### Example — App Router

```jsx
// SSG — the default when nothing dynamic is used
export default async function Page() {
  const posts = await fetch('https://api.com/posts').then(r => r.json());
  return <List posts={posts} />;
}

// ISR — regenerate at most once every 60 seconds
export const revalidate = 60;
// or per-fetch:
const data = await fetch(url, { next: { revalidate: 60 } });

// SSR — opt out of caching entirely
export const dynamic = 'force-dynamic';
// or:
const data = await fetch(url, { cache: 'no-store' });
// or simply use cookies() / headers() — that makes the route dynamic automatically

// CSR
'use client';
export default function Chart() {
  const { data } = useQuery({ queryKey: ['stats'], queryFn: getStats });
}

// generateStaticParams — pre-render dynamic routes at build time
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = true;   // build unlisted slugs on demand (default)
```

### Route segment config options

```jsx
export const dynamic = 'auto' | 'force-dynamic' | 'error' | 'force-static';
export const revalidate = false | 0 | number;
export const fetchCache = 'auto' | 'default-cache' | 'force-no-store' | ...;
export const runtime = 'nodejs' | 'edge';
export const preferredRegion = 'auto' | 'global' | 'home' | ['bom1'];
```

**Interview Tip:** The killer follow-up: *"How does ISR serve stale content?"* — stale-while-revalidate. The first request after the window still gets the cached page instantly, and regeneration happens in the background so the *next* visitor gets the fresh one. No user waits.

**Common Mistakes:** Thinking `revalidate` means "the page is rebuilt every 60s". It only regenerates if there's a request after that window expires.

---

## What is Partial Prerendering (PPR)?

### Answer

A single page that ships a **static shell** immediately, with dynamic parts streamed in as they resolve — no need to choose static *or* dynamic for the whole route.

### Example

```jsx
export const experimental_ppr = true;

export default function ProductPage({ params }) {
  return (
    <>
      <Header />                    {/* static — in the prerendered shell */}
      <ProductDetails id={params.id} />   {/* static */}

      <Suspense fallback={<CartSkeleton />}>
        <Cart />                    {/* dynamic — reads cookies, streams in */}
      </Suspense>

      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations userId={params.id} />   {/* dynamic, personalised */}
      </Suspense>
    </>
  );
}
```

### Why do we use it?

Previously a single `cookies()` call anywhere made the *entire* page dynamic. PPR isolates the dynamic parts behind Suspense boundaries so the rest stays on the CDN.

**Interview Tip:** The mental model: "static by default, dynamic where you draw a Suspense boundary." That's the whole feature in one sentence.

---

# Server & Client Components

## What is the difference between Server and Client Components?

### Answer

| | Server Component (default) | Client Component (`'use client'`) |
|---|---|---|
| Runs | On the server only | Server (for SSR HTML) + browser |
| Ships JS to client | **No** | Yes |
| `useState`, `useEffect` | ❌ | ✅ |
| Event handlers (`onClick`) | ❌ | ✅ |
| Browser APIs | ❌ | ✅ |
| `async`/`await` in the body | ✅ | ❌ |
| Direct DB / secrets | ✅ | ❌ (never) |
| Can import a Client Component | ✅ | ✅ |
| Can import a Server Component | ✅ | ❌ (only as `children`) |

### Example

```jsx
// app/products/page.js — Server Component
import { db } from '@/lib/db';
import AddToCart from './AddToCart';

export default async function Products() {
  const products = await db.product.findMany();   // direct DB, no API layer
  // process.env.DATABASE_URL is safe here — never sent to the browser

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name}
          <AddToCart productId={p.id} />     {/* client island */}
        </li>
      ))}
    </ul>
  );
}

// app/products/AddToCart.js
'use client';
import { useState } from 'react';

export default function AddToCart({ productId }) {
  const [adding, setAdding] = useState(false);
  return <button onClick={() => setAdding(true)}>{adding ? 'Adding…' : 'Add'}</button>;
}
```

### The composition rule

```jsx
// ❌ Can't import a Server Component into a Client Component
'use client';
import ServerThing from './ServerThing';    // becomes a client component!

// ✅ Pass it as children instead
'use client';
export function ClientWrapper({ children }) {
  const [open, setOpen] = useState(false);
  return open ? children : null;    // children was rendered on the SERVER
}

// In a server component:
<ClientWrapper>
  <ServerThing />        {/* stays a server component ✅ */}
</ClientWrapper>
```

**Interview Tip:** `'use client'` marks the **boundary**, not just the file. Everything imported below it becomes client code too. So push it as deep in the tree as possible — a `'use client'` in the root layout makes your whole app client-side.

**Common Mistakes:** Putting `'use client'` at the top of every file "to be safe"; trying to pass a function as a prop from a Server to a Client Component (not serializable — only Server Actions can cross that way).

---

## What can and can't be passed from Server to Client Components?

### Answer

Props crossing the boundary must be **serializable** by React's serialization format.

```jsx
// ✅ Allowed
string, number, boolean, null, undefined, bigint
Date, Map, Set, TypedArray, ArrayBuffer, FormData
plain objects & arrays of the above
JSX elements (as children)
Promises
Server Actions ('use server' functions)

// ❌ Not allowed
functions (except Server Actions)
class instances (Mongoose docs, Prisma Decimal, custom classes)
Symbols
Dates inside class instances
```

### Example

```jsx
// ❌ Mongoose documents are class instances
const user = await User.findById(id);
return <ClientProfile user={user} />;        // Error: only plain objects

// ✅ Convert first
const user = await User.findById(id).lean();          // Mongoose
const plain = JSON.parse(JSON.stringify(user));       // brute force
const { _id, name, email } = user;                    // pick fields (best)
return <ClientProfile user={{ id: _id.toString(), name, email }} />;
```

**Interview Tip:** "Only plain objects can be passed to Client Components" is one of the most-Googled Next.js errors. Knowing the `.lean()` / serialize-explicitly fix shows real project experience.

---

# Data Fetching

## How do you fetch data in the App Router?

### Answer

```jsx
// 1. Directly in a Server Component — the default
export default async function Page() {
  const res = await fetch('https://api.com/data', { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch');
  const data = await res.json();
  return <View data={data} />;
}

// 2. Parallel fetching — start both, then await
export default async function Page() {
  const userPromise = getUser();
  const postsPromise = getPosts();
  const [user, posts] = await Promise.all([userPromise, postsPromise]);
  // ❌ const user = await getUser(); const posts = await getPosts();  ← sequential waterfall
}

// 3. Streaming with Suspense — show the fast parts immediately
export default function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />      {/* streams in when ready */}
      </Suspense>
    </>
  );
}

async function SlowComponent() {
  const data = await slowQuery();
  return <View data={data} />;
}

// 4. Request deduplication — the same fetch in 3 components = 1 network call
async function getUser(id) {
  const res = await fetch(`/api/users/${id}`);   // auto-deduped within one render pass
  return res.json();
}

// For non-fetch (DB, ORM), wrap in React.cache
import { cache } from 'react';
export const getUser = cache(async (id) => db.user.findUnique({ where: { id } }));

// 5. Client-side fetching for interactive data
'use client';
import { useQuery } from '@tanstack/react-query';
const { data } = useQuery({ queryKey: ['stats'], queryFn: getStats });
```

**Interview Tip:** The "fetch waterfall" question comes up constantly. Show you know to start promises before awaiting, and that Suspense lets independent sections stream in parallel instead of blocking on the slowest one.

---

# Caching

## Explain the four caching layers in Next.js.

### Answer

| Cache | What it stores | Where | Duration | How to opt out |
|---|---|---|---|---|
| **Request Memoization** | `fetch` results within one render pass | Server | Single request | `AbortController` / different args |
| **Data Cache** | `fetch` results across requests & deploys | Server | Persistent | `cache: 'no-store'` |
| **Full Route Cache** | Rendered HTML + RSC payload | Server | Until revalidated | `dynamic = 'force-dynamic'` |
| **Router Cache** | RSC payload for visited routes | **Client** | 30s dynamic / 5min static | `router.refresh()` |

### Example

```jsx
// Data Cache control
fetch(url);                                   // Next 15: NOT cached by default
fetch(url, { cache: 'force-cache' });         // opt into caching
fetch(url, { cache: 'no-store' });            // never cache
fetch(url, { next: { revalidate: 60 } });     // ISR, 60s
fetch(url, { next: { tags: ['products'] } }); // taggable

// On-demand revalidation — the killer feature
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request) {
  await updateProduct(data);
  revalidateTag('products');          // invalidates every fetch tagged 'products'
  revalidatePath('/products');        // invalidates a specific route
  revalidatePath('/blog/[slug]', 'page');   // dynamic segment
  return Response.json({ ok: true });
}

// Router cache
'use client';
const router = useRouter();
router.refresh();                     // refetch the current route, keep client state
```

### Next 15 changed the defaults

| | Next 14 | Next 15 |
|---|---|---|
| `fetch` | Cached by default | **Not cached** by default |
| Route handlers (GET) | Cached | **Not cached** |
| Client Router Cache (page segments) | Cached 30s | **Not cached** by default |

**Interview Tip:** "Next.js caches too aggressively" was the biggest complaint about 13/14. Next 15 flipped to opt-in caching. Knowing that shift — and *why* they made it — is a strong senior answer.

**Common Mistakes:** Updating data and not seeing it because of the Full Route Cache. The fix is `revalidateTag`/`revalidatePath` after a mutation, not `no-store` everywhere.

---

# Server Actions

## What are Server Actions?

### Answer

Async functions marked `'use server'` that run on the server but can be called directly from client code — including as a `<form action={...}>`.

### Example

```jsx
// app/actions.js
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const schema = z.object({
  title: z.string().min(3, 'Title too short'),
  content: z.string().min(10),
});

export async function createPost(prevState, formData) {
  // 1. ALWAYS authenticate — a Server Action is a public HTTP endpoint
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  // 2. ALWAYS validate — never trust the client
  const parsed = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // 3. Mutate
  const post = await db.post.create({
    data: { ...parsed.data, authorId: session.user.id },
  });

  // 4. Revalidate the affected cache
  revalidatePath('/posts');

  // 5. Redirect (throws internally — must be outside try/catch)
  redirect(`/posts/${post.id}`);
}
```

```jsx
// app/posts/new/page.js
'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPost } from '@/app/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Publish'}</button>;
}

export default function NewPost() {
  const [state, formAction] = useActionState(createPost, {});

  return (
    <form action={formAction}>
      <input name="title" />
      {state.errors?.title && <p role="alert">{state.errors.title[0]}</p>}
      <textarea name="content" />
      <SubmitButton />
    </form>
  );
}
```

### Why do we use it?

- No API route boilerplate for mutations
- Progressive enhancement — the form works before JS loads
- Type-safe end to end (with TypeScript)
- Automatic cache revalidation

### Security rules

1. Every action is a **public POST endpoint** — always auth-check inside it.
2. Always validate input server-side.
3. Never rely on the client hiding a button.
4. Don't return sensitive data.

**Interview Tip:** The security point is the one interviewers probe. Many developers assume Server Actions are private because they look like function calls. They are network endpoints with a generated id.

**Common Mistakes:** Calling `redirect()` inside a `try/catch` — it works by throwing a special error, so your catch block swallows it.

---

# Routing

## Explain Next.js routing conventions.

### Answer

```
app/
├── page.js                     → /
├── about/page.js               → /about
├── blog/[slug]/page.js         → /blog/:slug          (dynamic)
├── shop/[...slug]/page.js      → /shop/a/b/c          (catch-all)
├── docs/[[...slug]]/page.js    → /docs and /docs/a/b  (optional catch-all)
├── (marketing)/                → route GROUP — no URL segment
│   ├── about/page.js           → /about
│   └── layout.js               → layout for the group only
├── @modal/                     → PARALLEL route (named slot)
│   └── login/page.js
├── (.)photo/[id]/page.js       → INTERCEPTING route (same level)
├── (..)feed/page.js            → intercept one level up
├── _components/                → private folder, NOT a route
└── api/users/route.js          → /api/users
```

### Navigation

```jsx
// Link — prefetches on viewport/hover automatically
import Link from 'next/link';
<Link href="/about" prefetch={false} replace scroll={false}>About</Link>

// Programmatic
'use client';
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation';

const router = useRouter();
router.push('/dashboard');
router.replace('/login');
router.back();
router.refresh();          // re-fetch server data, preserve client state

const pathname = usePathname();
const searchParams = useSearchParams();
const params = useParams();

// Server-side redirect
import { redirect, notFound, permanentRedirect } from 'next/navigation';
if (!user) redirect('/login');
if (!post) notFound();
```

### Parallel + intercepting routes — the modal pattern

```
app/
├── layout.js                    ← renders {children} and {modal}
├── @modal/
│   ├── default.js               ← renders null on a hard load
│   └── (.)photo/[id]/page.js    ← intercepts /photo/1 → shows a modal
└── photo/[id]/page.js           ← full page on direct visit / refresh
```

Clicking a photo in a feed opens a modal; refreshing that URL shows the full page. Instagram's exact behaviour, with no client state.

**Interview Tip:** Route groups `(name)` for organising without affecting the URL, and the intercepting-route modal pattern, are the two App Router features people find most impressive when explained well.

---

# API Routes & Route Handlers

## How do you build an API in Next.js?

### Answer

```js
// app/api/users/route.js
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') ?? 1);

  const users = await db.user.findMany({ skip: (page - 1) * 10, take: 10 });

  return NextResponse.json(
    { users, page },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const user = await db.user.create({ data: parsed.data });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Dynamic segment — params is async in Next 15
// app/api/users/[id]/route.js
export async function DELETE(request, { params }) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

// Streaming response
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generate()) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}

// Edge runtime — lower latency, limited APIs (no Node modules, no fs)
export const runtime = 'edge';
```

### Route Handler vs Server Action

| | Route Handler | Server Action |
|---|---|---|
| Called by | Anything (mobile, webhooks, third parties) | Your own React code |
| HTTP verbs | All | POST only |
| Response | Full control | Return value |
| Use for | Public APIs, webhooks, file uploads, streaming | Form mutations inside your app |

**Interview Tip:** Use Server Actions for your own forms; Route Handlers when something *outside* your app needs the endpoint (Stripe webhooks, a mobile client, cron).

---

# Middleware

## What is Next.js middleware and when do you use it?

### Answer

Code that runs on the **Edge** before a request is completed — before caching and before route rendering.

### Example

```js
// middleware.js — at the project root
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // 1. Auth gate
  if (pathname.startsWith('/dashboard') && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Rewrite (URL stays the same, different content served)
  if (pathname.startsWith('/blog')) {
    return NextResponse.rewrite(new URL(`/cms${pathname}`, request.url));
  }

  // 3. Geo / A-B testing
  const country = request.geo?.country ?? 'US';
  const bucket = request.cookies.get('bucket')?.value ?? (Math.random() < 0.5 ? 'a' : 'b');

  // 4. Set headers and cookies
  const response = NextResponse.next();
  response.headers.set('x-country', country);
  response.cookies.set('bucket', bucket, { maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',   // everything except static
  ],
};
```

### Limits

- Runs on the **Edge runtime** — no Node APIs, no `fs`, no native DB drivers
- Must be fast (it's on every matched request)
- Can't render UI, only redirect/rewrite/modify headers
- Body size and execution time limits

**Interview Tip:** Do **not** verify a JWT signature with a heavy library in middleware, and never hit a database there. Do a cheap presence/format check in middleware and the real authorization check in the page or action. That's the correct architecture and the answer interviewers want.

---

# Optimisation

## How does `next/image` work and why use it?

### Answer

```jsx
import Image from 'next/image';
import hero from '@/public/hero.jpg';     // static import → auto width/height/blur

// Local image — dimensions inferred, zero CLS
<Image src={hero} alt="Hero" priority placeholder="blur" />

// Remote image — dimensions required
<Image
  src="https://cdn.com/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={80}
  loading="lazy"           // default; use priority for the LCP image instead
/>

// Fill a container
<div style={{ position: 'relative', aspectRatio: '16/9' }}>
  <Image src={url} alt="" fill style={{ objectFit: 'cover' }} sizes="100vw" />
</div>
```

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};
```

### What it does for you

1. Serves AVIF/WebP when the browser supports it
2. Resizes per device and generates `srcSet`
3. Lazy loads below the fold
4. Reserves space → **CLS = 0**
5. Caches optimised variants

**Interview Tip:** `priority` on the LCP image is the single highest-impact Next.js perf tweak. And explain the tradeoff: on-demand optimisation costs CPU/serverless time, which is why big sites often pre-optimise with a CDN like Cloudinary and use `unoptimized` or a custom loader.

---

## How do you optimise fonts and scripts?

### Answer

```jsx
// next/font — self-hosted, zero layout shift, no external request
import { Inter, Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: true,     // size-adjusted fallback → no CLS on swap
});

const custom = localFont({ src: './fonts/Custom.woff2', variable: '--font-custom' });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${custom.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```jsx
// next/script — control when third-party JS loads
import Script from 'next/script';

<Script src="https://analytics.com/a.js" strategy="afterInteractive" />
<Script src="https://chat.com/widget.js" strategy="lazyOnload" />
<Script id="inline" strategy="beforeInteractive">{`window.x = 1;`}</Script>
```

| Strategy | Loads |
|---|---|
| `beforeInteractive` | Before hydration — critical polyfills only |
| `afterInteractive` | After hydration (default) — analytics |
| `lazyOnload` | During browser idle — chat widgets, non-critical |
| `worker` | In a web worker (experimental, Partytown) |

**Interview Tip:** `next/font` downloads the font at **build time** and self-hosts it. That removes a DNS lookup + connection to fonts.googleapis.com, and it's also a GDPR win since no user IP goes to Google.

---

# SEO & Metadata

## How do you handle metadata and SEO in the App Router?

### Answer

```jsx
// Static metadata
export const metadata = {
  title: { default: 'My Site', template: '%s | My Site' },
  description: 'Description under 160 characters',
  metadataBase: new URL('https://example.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'My Site',
    description: '…',
    url: 'https://example.com',
    siteName: 'My Site',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  robots: { index: true, follow: true },
};

// Dynamic metadata
export async function generateMetadata({ params }, parent) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Not found' };

  const previousImages = (await parent).openGraph?.images ?? [];

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.image, ...previousImages] },
  };
}
```

```jsx
// app/sitemap.js
export default async function sitemap() {
  const posts = await getPosts();
  return [
    { url: 'https://example.com', lastModified: new Date(), priority: 1 },
    ...posts.map((p) => ({
      url: `https://example.com/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
    })),
  ];
}

// app/robots.js
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] }],
    sitemap: 'https://example.com/sitemap.xml',
  };
}

// app/opengraph-image.js — generate OG images at request time
import { ImageResponse } from 'next/og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }) {
  const post = await getPost(params.slug);
  return new ImageResponse(
    <div style={{ display: 'flex', fontSize: 60, background: '#fff', width: '100%', height: '100%' }}>
      {post.title}
    </div>,
    size
  );
}
```

**Interview Tip:** `metadataBase` is required for relative OG image URLs to resolve — a very common "why is my Twitter card blank?" bug.

---

# Authentication

## How do you implement authentication in Next.js?

### Answer

```js
// Auth.js (NextAuth v5)
// auth.js
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    Credentials({
      async authorize(credentials) {
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        return ok ? { id: user.id, email: user.email, role: user.role } : null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
  pages: { signIn: '/login' },
});

// app/api/auth/[...nextauth]/route.js
export const { GET, POST } = handlers;
```

```jsx
// Reading the session in a Server Component
import { auth } from '@/auth';

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect('/login');
  return <p>Hello {session.user.email}</p>;
}

// In a Client Component
'use client';
import { useSession } from 'next-auth/react';
const { data: session, status } = useSession();

// In a Server Action — ALWAYS check
'use server';
export async function deletePost(id) {
  const session = await auth();
  if (session?.user.role !== 'admin') throw new Error('Forbidden');
  await db.post.delete({ where: { id } });
}
```

### Where do you store the token?

| Option | XSS safe | CSRF risk | Notes |
|---|---|---|---|
| `HttpOnly` cookie | ✅ | Needs `SameSite` + token | **Recommended** |
| localStorage | ❌ | None | Any XSS steals it |
| Memory only | ✅ | None | Lost on refresh |

**Interview Tip:** The layered answer: middleware for a cheap redirect (UX), and a real session check in every page/action/route handler (security). Middleware alone is not authorization — it can be bypassed by a direct request to a route handler.

---

# Deployment

## How do you deploy and configure a Next.js app?

### Answer

```js
// next.config.js
module.exports = {
  reactStrictMode: true,
  output: 'standalone',        // minimal server bundle for Docker
  // output: 'export',         // fully static — no SSR, no API routes, no ISR

  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.com' }] },

  async redirects() {
    return [{ source: '/old', destination: '/new', permanent: true }];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'https://backend.com/:path*' }];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
};
```

```dockerfile
# Multi-stage Dockerfile for output: 'standalone'
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment variables

```bash
DATABASE_URL=postgres://…             # server only
NEXT_PUBLIC_API_URL=https://api.com   # exposed to the browser — NEVER put secrets here
```

**Interview Tip:** `NEXT_PUBLIC_*` variables are **inlined at build time** into the client bundle. Two consequences: never put a secret behind that prefix, and changing one requires a rebuild, not just a restart. That trips people up in Docker deployments.

---

# Rapid Fire

**What is hydration in Next.js?**
Attaching React event handlers to server-rendered HTML. Mismatched markup between server and client causes a hydration error.

**Why do I get "window is not defined"?**
A Server Component or SSR pass is executing browser code. Move it into `useEffect`, or use `dynamic(() => import(...), { ssr: false })`.

**What is `next/dynamic`?**
Lazy loading with an SSR toggle: `dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton /> })`.

**What is `getStaticPaths` / `generateStaticParams`?**
Tells Next which dynamic routes to pre-render at build time.

**What is `fallback` in `getStaticPaths`?**
`false` = 404 for unlisted paths; `true` = render a fallback then generate; `'blocking'` = SSR the first request, then cache.

**What is `_app.js` vs `_document.js`?**
Pages Router: `_app` wraps every page (shared layout, providers). `_document` customises the HTML shell, runs server-only.

**What is the difference between `redirect()` and `router.push()`?**
`redirect()` is server-side, throws internally, changes the response. `router.push()` is client-side navigation.

**What is `unstable_cache`?**
Caches the result of any async function (not just `fetch`) with tags and revalidation.

**How do you handle CORS in Next.js?**
Set headers in the route handler or in `next.config.js` `headers()`. Note: same-origin `fetch` from your own app doesn't need CORS at all.

**What is the Edge runtime?**
A lightweight V8 runtime (no Node APIs) that runs close to users. Fast cold starts, but no `fs`, no native modules, limited npm compatibility.

**What is `revalidatePath` vs `revalidateTag`?**
Path invalidates a specific route's cache; tag invalidates every `fetch` labelled with that tag, across all routes.

**What is a route group?**
`(name)` — organises files and lets you scope layouts without adding a URL segment.

**What is `loading.js` actually doing?**
Wrapping the page in a `<Suspense>` boundary with your component as the fallback, enabling streaming.

**Why is my page dynamic when I expected static?**
You used `cookies()`, `headers()`, `searchParams`, `noStore()`, or `cache: 'no-store'` — any of those opt the route into dynamic rendering.

**What is `draftMode`?**
Bypasses static caching so CMS editors can preview unpublished content.

**How do you do i18n in the App Router?**
A `[lang]` dynamic segment plus middleware to detect and redirect based on `Accept-Language`. The built-in i18n config only works in the Pages Router.

**What is Turbopack?**
The Rust-based bundler replacing webpack — much faster dev refresh; `next dev --turbo`.

**What is `instrumentation.js`?**
Runs once when the server starts — the place to initialise OpenTelemetry, Sentry, or other monitoring.

**How do you handle file uploads?**
A route handler reading `await request.formData()`, then streaming to S3/Cloudinary. For large files, use a presigned URL and upload directly from the browser.

**How do you connect to a database?**
Create a singleton (cached on `globalThis` in dev to survive hot reload) and import it in Server Components/actions. Never connect from a Client Component.

---

## 📌 Interview Checklist

- [ ] SSR vs SSG vs ISR vs CSR — pick one per scenario and justify it
- [ ] Server vs Client Components — what can cross the boundary?
- [ ] Explain all four caches and how to invalidate each
- [ ] Why must Server Actions authenticate internally?
- [ ] What changed in Next 15 (async params, caching defaults)?
- [ ] `layout.js` vs `template.js`
- [ ] What should middleware NOT do?
- [ ] Explain the intercepting-route modal pattern
- [ ] Why does `NEXT_PUBLIC_` require a rebuild?
