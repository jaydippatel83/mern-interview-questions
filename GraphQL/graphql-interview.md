# ◈ GraphQL Interview Questions

> Schema · Queries · Mutations · Resolvers · N+1 · DataLoader · Subscriptions · Apollo · Security

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Schema & Type System](#schema--type-system)
3. [Queries](#queries)
4. [Mutations](#mutations)
5. [Resolvers](#resolvers)
6. [The N+1 Problem & DataLoader](#the-n1-problem--dataloader)
7. [Subscriptions](#subscriptions)
8. [Error Handling](#error-handling)
9. [Caching](#caching)
10. [Security](#security)
11. [Apollo Client (React)](#apollo-client-react)
12. [Federation & Schema Design](#federation--schema-design)
13. [Testing](#testing)
14. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is GraphQL and how does it differ from REST?

### Answer

A query language and runtime for APIs where the **client specifies exactly what data it needs** in a single request, against a strongly-typed schema.

| | REST | GraphQL |
|---|---|---|
| Endpoints | Many (`/users`, `/users/1/posts`) | **One** (`/graphql`) |
| Data shape | Server decides | **Client decides** |
| Over-fetching | Common | Solved |
| Under-fetching | Needs multiple round trips | One request |
| Versioning | `/v1`, `/v2` | Evolve the schema, deprecate fields |
| Schema/types | Optional (OpenAPI) | **Built in, mandatory** |
| HTTP caching | Works natively | Harder (POST, one URL) |
| File upload | Native | Needs a spec/extension |
| Error handling | HTTP status codes | Always 200 + `errors` array |
| Learning curve | Low | Higher |

### Why do we use it?

The two problems it was built to solve:

```
OVER-FETCHING — REST returns the whole user object when you need the name
  GET /api/users/1
  → { id, name, email, address, phone, preferences, createdAt, … }  (2KB)
  You needed:  { name }                                              (20 bytes)

UNDER-FETCHING (the n+1 round trip problem)
  GET /api/users/1              → user
  GET /api/users/1/posts        → posts
  GET /api/posts/1/comments     → comments
  GET /api/posts/2/comments     → comments
  → 4+ sequential round trips, each with full latency
```

### Example

```graphql
# ONE request replaces all four
query {
  user(id: "1") {
    name
    posts(limit: 5) {
      title
      comments(limit: 3) {
        text
        author { name }
      }
    }
  }
}
```

```json
{
  "data": {
    "user": {
      "name": "Jaydip",
      "posts": [
        { "title": "GraphQL basics", "comments": [{ "text": "Nice!", "author": { "name": "Amit" } }] }
      ]
    }
  }
}
```

The response shape **mirrors the query shape exactly** — that's the core design idea.

### When should we use it?

| Use GraphQL | Use REST |
|---|---|
| Many clients with different data needs (web, iOS, Android) | Simple CRUD |
| Deeply nested/relational data | File uploads and downloads |
| Rapidly evolving frontend | Heavy HTTP caching / CDN needs |
| Aggregating multiple backend services (BFF) | Public APIs where simplicity matters |
| Mobile clients on slow networks | Small team, tight deadline |

**Interview Tip:** The honest framing that impresses: *"GraphQL moves complexity from the client to the server. The client gets exactly what it wants; in exchange the server now owns query cost analysis, N+1 prevention, depth limiting and caching — problems REST gets from HTTP for free. It's worth it when you have multiple divergent clients, and often not worth it when you don't."*

**Common Mistakes:** Saying "GraphQL is faster than REST." It usually reduces *round trips*, but a badly-resolved GraphQL query can be far slower than a well-designed REST endpoint.

---

## What are the three operation types?

### Answer

```graphql
query    — read data (should be side-effect free, executed in PARALLEL)
mutation — write data (executed SEQUENTIALLY, top-level fields one after another)
subscription — long-lived connection, server pushes updates
```

```graphql
query GetUser($id: ID!) {
  user(id: $id) { name }
}

mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) { id title }
}

subscription OnCommentAdded($postId: ID!) {
  commentAdded(postId: $postId) { id text }
}
```

**Interview Tip:** The parallel-vs-sequential detail matters: top-level **query** fields resolve concurrently, but top-level **mutation** fields run strictly in order. That's deliberate — two mutations in one document must not race. Most candidates don't know this.

---

# Schema & Type System

## Explain the GraphQL type system.

### Answer

```graphql
# ---------- SCALARS (leaf types) ----------
# Built in: Int, Float, String, Boolean, ID
scalar DateTime          # custom scalars need a serialise/parse implementation
scalar JSON
scalar EmailAddress

# ---------- OBJECT TYPE ----------
type User {
  id: ID!                # ! = non-nullable
  name: String!
  email: String!
  age: Int
  posts: [Post!]!        # non-null list of non-null Posts
  role: Role!
  createdAt: DateTime!
}

# [Post]    → list may be null, items may be null
# [Post!]   → list may be null, items never null
# [Post]!   → list never null, items may be null
# [Post!]!  → neither is ever null  ⭐ usually what you want

# ---------- ENUM ----------
enum Role {
  USER
  EDITOR
  ADMIN
}

# ---------- INTERFACE — shared fields, polymorphic ----------
interface Node {
  id: ID!
}

interface Content {
  id: ID!
  title: String!
  author: User!
}

type Post implements Node & Content {
  id: ID!
  title: String!
  author: User!
  body: String!
}

type Video implements Node & Content {
  id: ID!
  title: String!
  author: User!
  durationSeconds: Int!
}

# ---------- UNION — no shared fields ----------
union SearchResult = User | Post | Video

# ---------- INPUT TYPE — for arguments only ----------
input CreatePostInput {
  title: String!
  body: String!
  tags: [String!] = []       # default value
}

# Input types CANNOT have fields returning object types —
# they're strictly for data going IN.

# ---------- ROOT TYPES ----------
type Query {
  user(id: ID!): User
  users(first: Int = 20, after: String, filter: UserFilter): UserConnection!
  search(term: String!): [SearchResult!]!
  node(id: ID!): Node
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
  deletePost(id: ID!): DeletePostPayload!
}

type Subscription {
  commentAdded(postId: ID!): Comment!
}

# ---------- DIRECTIVES ----------
type User {
  fullName: String! @deprecated(reason: "Use firstName and lastName")
  email: String! @auth(requires: ADMIN)
}

directive @auth(requires: Role!) on FIELD_DEFINITION | OBJECT
```

### Querying interfaces and unions

```graphql
query {
  search(term: "graphql") {
    __typename                 # ⭐ always request this for unions
    ... on User { name email }
    ... on Post { title body }
    ... on Video { title durationSeconds }
  }
}
```

**Interview Tip:** `[Post!]!` vs `[Post]` is a favourite question. The nullability rules cascade: **if a non-null field resolves to null, the error bubbles UP to the nearest nullable parent** — potentially nulling out a huge chunk of your response. That's why over-using `!` is risky: one failing field can wipe out an entire branch.

**Common Mistakes:** Making everything non-null "for safety". A single database hiccup on one field then nulls the whole query. Be strict on IDs and truly-always-present fields; be lenient elsewhere.

---

## What is schema-first vs code-first?

### Answer

| | Schema-first (SDL) | Code-first |
|---|---|---|
| Source of truth | `.graphql` files | TypeScript/JS code |
| Types | Generated from SDL | Schema generated from code |
| Tools | Apollo Server + SDL, GraphQL Tools | Pothos, Nexus, TypeGraphQL, gqlgen |
| Pros | Readable, language-agnostic, easy for frontend to review | Full type safety, no drift, refactor-friendly |
| Cons | Types can drift from resolvers | Schema is less readable in review |

```js
// Schema-first
const typeDefs = `#graphql
  type User { id: ID!  name: String! }
  type Query { user(id: ID!): User }
`;

// Code-first (Pothos)
builder.objectType('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
  }),
});
```

**Interview Tip:** With schema-first, use **GraphQL Code Generator** to produce TypeScript types for both resolvers and the client. Without it, your resolvers and schema silently drift apart — which is the main argument people make for code-first.

---

# Queries

## What are the client-side query features?

```graphql
# ---------- VARIABLES — never string-interpolate into a query ----------
query GetUser($id: ID!, $limit: Int = 10) {
  user(id: $id) {
    name
    posts(limit: $limit) { title }
  }
}
# variables: { "id": "1", "limit": 5 }

# ---------- ALIASES — same field, different arguments ----------
query {
  firstUser: user(id: "1") { name }
  secondUser: user(id: "2") { name }
}

# ---------- FRAGMENTS — reusable field sets ----------
fragment UserFields on User {
  id
  name
  email
  avatar
}

query {
  me { ...UserFields }
  author: user(id: "5") { ...UserFields }
}

# ---------- INLINE FRAGMENTS — for interfaces/unions ----------
query {
  node(id: "1") {
    id
    ... on Post { title }
    ... on User { name }
  }
}

# ---------- DIRECTIVES ----------
query GetUser($withPosts: Boolean!, $skipEmail: Boolean!) {
  user(id: "1") {
    name
    email @skip(if: $skipEmail)
    posts @include(if: $withPosts) { title }
  }
}

# ---------- INTROSPECTION ----------
query {
  __schema {
    types { name kind description }
  }
  __type(name: "User") {
    fields { name type { name kind } }
  }
}
```

**Interview Tip:** Fragments aren't just DRY — they're the foundation of **fragment colocation**, where each React component declares its own data requirements and the parent composes them. Relay enforces this; Apollo supports it. It's how large GraphQL codebases stay maintainable.

---

## How do you implement pagination?

### Answer

Two approaches, and the difference matters.

```graphql
# ---------- OFFSET PAGINATION — simple, but flawed ----------
type Query {
  posts(limit: Int = 20, offset: Int = 0): [Post!]!
}
# ❌ Slow at depth (the DB still scans skipped rows)
# ❌ Items shift if data changes between pages → duplicates and skips

# ---------- CURSOR PAGINATION (Relay Connection spec) ⭐ ----------
type Query {
  posts(first: Int, after: String, last: Int, before: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type PostEdge {
  node: Post!
  cursor: String!          # opaque, usually base64 of the sort key
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```graphql
query {
  posts(first: 20, after: "Y3Vyc29yOjIw") {
    edges {
      cursor
      node { id title }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```js
// Resolver
const posts = async (_, { first = 20, after }) => {
  const cursor = after ? JSON.parse(Buffer.from(after, 'base64').toString()) : null;

  const rows = await db.post.findMany({
    where: cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : {},
    orderBy: { createdAt: 'desc' },
    take: first + 1,                              // fetch one extra to detect hasNextPage
  });

  const hasNextPage = rows.length > first;
  const nodes = hasNextPage ? rows.slice(0, first) : rows;

  return {
    edges: nodes.map((node) => ({
      node,
      cursor: Buffer.from(JSON.stringify({ createdAt: node.createdAt })).toString('base64'),
    })),
    pageInfo: {
      hasNextPage,
      hasPreviousPage: Boolean(after),
      startCursor: /* first cursor */ null,
      endCursor: /* last cursor */ null,
    },
  };
};
```

**Interview Tip:** The `edges`/`node` indirection looks like ceremony but exists so you can put metadata **on the relationship** — e.g. `edge { node { user } role joinedAt }` for a team membership. That's the justification for the Relay spec's shape.

---

# Mutations

## How do you design good mutations?

### Answer

```graphql
# ✅ Single input object — easy to evolve without breaking clients
input CreatePostInput {
  title: String!
  body: String!
  tags: [String!]
  clientMutationId: String        # for optimistic UI correlation
}

# ✅ Payload type — lets you return errors as DATA, not as a thrown error
type CreatePostPayload {
  post: Post
  userErrors: [UserError!]!       # expected, recoverable errors
  clientMutationId: String
}

type UserError {
  field: [String!]                # ["input", "title"]
  message: String!
  code: ErrorCode!
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
  updatePost(input: UpdatePostInput!): UpdatePostPayload!
  deletePost(input: DeletePostInput!): DeletePostPayload!
}
```

```graphql
mutation {
  createPost(input: { title: "Hi", body: "..." }) {
    post { id title }
    userErrors { field message code }
  }
}
```

### Why the payload pattern?

```
❌ Throwing an error → the whole `data` is null, HTTP still 200,
   and the client has to parse the `errors` array to find field-level problems.

✅ Returning userErrors → the client gets a TYPED, predictable shape.
   Validation failures are DATA, not exceptions.
   Reserve thrown errors for genuinely exceptional cases (auth, server failure).
```

### Naming convention

```
verbNoun:   createPost, updatePost, deletePost, publishPost, archivePost
❌ Not:     post, postCreate, savePost (ambiguous — create or update?)
```

**Interview Tip:** The **mutation payload pattern with `userErrors`** is the answer that shows production GraphQL experience. It's how Shopify and GitHub design their APIs, and it cleanly separates "you sent invalid data" from "the server broke."

**Common Mistakes:** Returning a bare `Boolean` from a mutation. The client then has to refetch to update its cache. Always return the affected object so the cache can update itself.

---

# Resolvers

## How do resolvers work?

### Answer

Every field can have a resolver with the signature:

```js
fieldName: (parent, args, context, info) => result
```

| Argument | What it is |
|---|---|
| `parent` | The result of the **parent** field's resolver |
| `args` | The field's arguments |
| `context` | Per-request shared object — auth, DB, loaders |
| `info` | AST details: field name, requested selection set, path |

```js
const resolvers = {
  Query: {
    user: (_, { id }, { db }) => db.user.findUnique({ where: { id } }),

    users: async (_, { first, after }, { db, user }) => {
      if (!user) throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
      return db.user.findMany({ take: first });
    },
  },

  Mutation: {
    createPost: async (_, { input }, { db, user }) => {
      if (!user) return { post: null, userErrors: [{ field: null, message: 'Not authenticated', code: 'UNAUTHENTICATED' }] };

      const parsed = createPostSchema.safeParse(input);
      if (!parsed.success) {
        return {
          post: null,
          userErrors: parsed.error.issues.map((i) => ({
            field: i.path.map(String),
            message: i.message,
            code: 'VALIDATION_ERROR',
          })),
        };
      }

      const post = await db.post.create({ data: { ...parsed.data, authorId: user.id } });
      return { post, userErrors: [] };
    },
  },

  // ---------- FIELD RESOLVERS ----------
  User: {
    // `parent` is the User object returned by Query.user
    posts: (parent, args, { loaders }) => loaders.postsByUserId.load(parent.id),

    // Computed field — not in the database
    fullName: (parent) => `${parent.firstName} ${parent.lastName}`,

    // Field-level authorization
    email: (parent, _, { user }) => {
      if (user?.id !== parent.id && user?.role !== 'ADMIN') return null;
      return parent.email;
    },
  },

  // ---------- UNION / INTERFACE RESOLUTION ----------
  SearchResult: {
    __resolveType(obj) {
      if (obj.email) return 'User';
      if (obj.durationSeconds) return 'Video';
      if (obj.body) return 'Post';
      return null;
    },
  },

  // ---------- CUSTOM SCALAR ----------
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    serialize: (value) => value.toISOString(),        // server → client
    parseValue: (value) => new Date(value),           // client variable → server
    parseLiteral: (ast) => new Date(ast.value),       // inline literal → server
  }),
};
```

### Default resolvers

If you don't write a resolver, GraphQL uses the default: return `parent[fieldName]`, calling it if it's a function. That's why you only need resolvers for computed, relational or authorized fields.

### The execution tree

```
query { user(id:"1") { name posts { title } } }

1. Query.user       → { id: "1", name: "Jaydip" }
2. User.name        → default resolver: parent.name
3. User.posts       → your resolver, receives parent = the user object
4. Post.title       → default resolver, once PER POST
```

**Interview Tip:** The critical insight: **`User.posts` runs once per user.** Fetch 100 users and the posts resolver fires 100 times. That's the N+1 problem, and it's the single most important GraphQL server topic.

---

## What is `context` and how do you build it?

```js
const server = new ApolloServer({ typeDefs, resolvers });

await startStandaloneServer(server, {
  context: async ({ req }) => {
    // Runs ONCE PER REQUEST
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;

    return {
      user,
      db: prisma,
      // ⚠️ Loaders MUST be created per request — a shared loader
      //    would cache across users and leak data
      loaders: createLoaders(prisma),
      requestId: crypto.randomUUID(),
    };
  },
});
```

**Interview Tip:** "DataLoaders must be per-request, never global" is a security answer as much as a performance one. A global loader caches a user's private data and serves it to the next request.

---

# The N+1 Problem & DataLoader

## What is the N+1 problem in GraphQL?

### Answer

The defining GraphQL server problem.

```graphql
query {
  posts(first: 100) {      # 1 query → 100 posts
    title
    author { name }        # ⚠️ 100 MORE queries, one per post
  }
}
```

```js
// ❌ Naive resolver — 101 database queries
const resolvers = {
  Post: {
    author: (post, _, { db }) => db.user.findUnique({ where: { id: post.authorId } }),
    //                          ^ fires ONCE PER POST
  },
};
```

It's worse than REST because the client can nest arbitrarily deep, and the resolver author often can't see the query shape that will hit them.

## How does DataLoader solve it?

### Answer

DataLoader **batches** all loads within a single tick of the event loop into one call, and **caches** by key for the request's lifetime.

```js
import DataLoader from 'dataloader';

function createLoaders(db) {
  return {
    // ---------- BATCH BY ID ----------
    userById: new DataLoader(async (ids) => {
      // Called ONCE with ALL the ids collected in this tick: ['1','2','3',…]
      const users = await db.user.findMany({ where: { id: { in: ids } } });

      // ⚠️ MUST return results in the SAME ORDER as the input keys,
      //    with null for missing ones. This is the #1 DataLoader bug.
      const map = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => map.get(id) ?? null);
    }),

    // ---------- BATCH ONE-TO-MANY ----------
    postsByUserId: new DataLoader(async (userIds) => {
      const posts = await db.post.findMany({
        where: { authorId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
      });

      const grouped = new Map(userIds.map((id) => [id, []]));
      for (const post of posts) grouped.get(post.authorId)?.push(post);
      return userIds.map((id) => grouped.get(id));   // array of arrays
    }),

    // ---------- COUNTS ----------
    postCountByUserId: new DataLoader(async (userIds) => {
      const rows = await db.post.groupBy({
        by: ['authorId'],
        where: { authorId: { in: userIds } },
        _count: true,
      });
      const map = new Map(rows.map((r) => [r.authorId, r._count]));
      return userIds.map((id) => map.get(id) ?? 0);
    }),
  };
}

// ✅ Resolver — now 2 queries total instead of 101
const resolvers = {
  Post: {
    author: (post, _, { loaders }) => loaders.userById.load(post.authorId),
  },
  User: {
    posts: (user, _, { loaders }) => loaders.postsByUserId.load(user.id),
    postCount: (user, _, { loaders }) => loaders.postCountByUserId.load(user.id),
  },
};
```

### How the batching actually works

```
Tick 1:  100 calls to loaders.userById.load(id)
         → DataLoader collects all 100 keys, deduplicates them
Tick 2:  ONE call to the batch function with [id1, id2, … idN]
         → one SQL query:  WHERE id IN (…)
         → results distributed back to the 100 waiting promises
```

### Other solutions

| Approach | How | Tradeoff |
|---|---|---|
| **DataLoader** ⭐ | Batch + cache per request | Standard; requires a loader per relation |
| **Join-based** | Read `info` and build a single SQL join | Fastest; complex to implement |
| Prisma `include` | ORM-level eager loading | Only if you know the shape upfront |
| Query planning | Libraries like `join-monster`, Prisma's relation joins | Powerful, opinionated |

**Interview Tip:** The **ordering requirement** is the detail that proves you've actually used DataLoader: the batch function must return an array the same length as the keys array, in the same order, with `null`/`Error` for misses. Returning the raw database rows (which come back in arbitrary order) silently gives every user the wrong data.

**Common Mistakes:** Creating loaders globally instead of per request (data leak between users). Forgetting to handle missing keys. Not batching count queries, so `postCount` on 100 users fires 100 `COUNT(*)` queries.

---

# Subscriptions

## How do GraphQL subscriptions work?

### Answer

A long-lived connection (usually WebSocket via `graphql-ws`) where the server pushes results whenever an event fires.

```graphql
type Subscription {
  commentAdded(postId: ID!): Comment!
  postUpdated(id: ID!): Post!
  notificationReceived: Notification!
}
```

```js
import { PubSub, withFilter } from 'graphql-subscriptions';
const pubsub = new PubSub();   // ⚠️ in-memory — single instance only

const resolvers = {
  Subscription: {
    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['COMMENT_ADDED']),
        (payload, variables, context) => {
          // Filter — only send to subscribers of THIS post
          if (!context.user) return false;
          return payload.commentAdded.postId === variables.postId;
        }
      ),
    },
  },

  Mutation: {
    addComment: async (_, { input }, { db, user }) => {
      const comment = await db.comment.create({ data: { ...input, authorId: user.id } });
      await pubsub.publish('COMMENT_ADDED', { commentAdded: comment });   // fire the event
      return { comment, userErrors: [] };
    },
  },
};
```

```js
// Server setup with graphql-ws
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

useServer({
  schema,
  context: async (ctx) => {
    // ⚠️ Auth happens in connectionParams, NOT headers — WebSockets have no headers per message
    const token = ctx.connectionParams?.authorization;
    const user = token ? await verifyToken(token) : null;
    if (!user) throw new Error('Not authenticated');
    return { user, db, loaders: createLoaders(db) };
  },
  onDisconnect: () => cleanup(),
}, wsServer);
```

### Scaling subscriptions

```
❌ In-memory PubSub — works only on ONE server instance.
   With 3 replicas behind a load balancer, a mutation on instance A
   never reaches subscribers connected to instance B.

✅ Redis PubSub  — graphql-redis-subscriptions
✅ Kafka / NATS  — for high throughput and replay
✅ A dedicated realtime service (Ably, Pusher) if subscriptions are peripheral
```

```js
import { RedisPubSub } from 'graphql-redis-subscriptions';
const pubsub = new RedisPubSub({ connection: { host, port } });
```

**Interview Tip:** Ask yourself — and say out loud — *"do I actually need subscriptions?"* Polling or SSE is often simpler and adequate. Subscriptions bring stateful connections, sticky sessions, reconnection handling, and horizontal-scaling complexity. Use them for genuinely live features (chat, collaborative editing, live dashboards), not for "the data might change."

---

# Error Handling

## How do you handle errors in GraphQL?

### Answer

GraphQL always returns **HTTP 200** (except for malformed requests). Errors go in an `errors` array alongside partial `data`.

```json
{
  "data": {
    "user": { "name": "Jaydip", "posts": null }
  },
  "errors": [
    {
      "message": "Failed to fetch posts",
      "path": ["user", "posts"],
      "locations": [{ "line": 4, "column": 5 }],
      "extensions": { "code": "INTERNAL_SERVER_ERROR" }
    }
  ]
}
```

```js
import { GraphQLError } from 'graphql';

// Thrown errors — for EXCEPTIONAL cases
throw new GraphQLError('Not authenticated', {
  extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
});

throw new GraphQLError('Forbidden', {
  extensions: { code: 'FORBIDDEN' },
});

throw new GraphQLError('Post not found', {
  extensions: { code: 'NOT_FOUND', id },
});
```

### The two-tier strategy

```
TIER 1 — userErrors in the mutation payload  (EXPECTED)
  Validation failures, business rule violations, "email already taken"
  → Typed, part of the schema, client handles them predictably

TIER 2 — thrown GraphQLError  (EXCEPTIONAL)
  Not authenticated, forbidden, server/database failure
  → Goes to the errors array
```

### Masking internal errors

```js
const server = new ApolloServer({
  schema,
  formatError: (formattedError, error) => {
    // Log the full error server-side
    logger.error({ err: error, path: formattedError.path }, formattedError.message);

    // ⚠️ Never leak stack traces or DB details to the client
    if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      return {
        message: 'Internal server error',
        extensions: { code: 'INTERNAL_SERVER_ERROR', requestId: /* … */ },
      };
    }
    return formattedError;
  },
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
});
```

### Partial data and null bubbling

```graphql
type User {
  name: String!         # non-null
  posts: [Post!]!       # non-null
}
```

If `posts` fails, it can't be null — so the error **bubbles up** to `user`. If `user` is also non-null, it bubbles further, potentially nulling the whole `data`.

**Interview Tip:** This is why nullability design matters so much. Make a field non-null only when it genuinely can never be absent. A `!` on a field backed by a flaky external service means one timeout can wipe out an entire response branch.

---

# Caching

## How do you cache GraphQL?

### Answer

The hard part — a single POST endpoint defeats normal HTTP caching.

```
1. CLIENT-SIDE NORMALISED CACHE  ⭐ the biggest win
2. SERVER-SIDE RESPONSE CACHE (@cacheControl)
3. PERSISTED QUERIES (enables GET + CDN)
4. DATALOADER (per-request cache)
5. APPLICATION CACHE (Redis inside resolvers)
```

### 1. Normalised client cache

```js
// Apollo Client splits objects by __typename + id and stores them flat
// Query A fetches User:1 { name }
// Query B fetches User:1 { email }
// → ONE cache entry: User:1 { name, email }
// Updating it anywhere updates every component reading it

new InMemoryCache({
  typePolicies: {
    User: {
      keyFields: ['id'],                      // how to normalise
      fields: {
        posts: {
          keyArgs: ['filter'],                // cache separately per filter
          merge(existing = { edges: [] }, incoming) {
            return { ...incoming, edges: [...existing.edges, ...incoming.edges] };
          },
        },
      },
    },
  },
});
```

### 2. Server response cache

```graphql
type Query {
  popularPosts: [Post!]! @cacheControl(maxAge: 300, scope: PUBLIC)
}

type User @cacheControl(maxAge: 60, scope: PRIVATE) {
  id: ID!
  email: String! @cacheControl(maxAge: 0)     # never cache
}
```

```js
import responseCachePlugin from '@apollo/server-plugin-response-cache';

new ApolloServer({
  schema,
  plugins: [responseCachePlugin({
    sessionId: (ctx) => ctx.contextValue.user?.id ?? null,   // per-user cache key
  })],
  cache: new KeyvAdapter(new Keyv('redis://…')),
});
```

⚠️ The **overall cache policy is the most restrictive** of all fields in the query. One `maxAge: 0` field makes the whole response uncacheable.

### 3. Persisted queries — restoring CDN caching

```
1. Client sends only a HASH of the query
2. If the server knows the hash → executes it
3. If not → client sends the full query once, server stores it

Benefits:
  ✅ Much smaller requests (a hash, not a 3KB query)
  ✅ Can use GET → CDN and browser caching work again
  ✅ Security: with a manifest, you can REJECT any query not in the allowlist
```

```js
// Apollo Client
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const link = createPersistedQueryLink({ sha256, useGETForHashedQueries: true })
  .concat(httpLink);
```

**Interview Tip:** **Trusted/persisted documents** are the strongest security answer for a production GraphQL API: build a manifest of every query your clients actually use, and reject anything else. That eliminates arbitrary query attacks, depth attacks and introspection abuse in one move — and it's how large GraphQL deployments run.

---

# Security

## What are the GraphQL-specific security risks?

### Answer

| Risk | Attack | Mitigation |
|---|---|---|
| **Deep nesting** | `user{posts{author{posts{author{…}}}}}` | Depth limiting |
| **Query complexity** | Requesting 10,000 items × 5 nested fields | Cost analysis |
| **Batching abuse** | 1,000 aliased queries in one request | Limit aliases + batch size |
| **Introspection** | Attacker maps your entire schema | Disable in production |
| **Field-level authz** | Any authenticated user reads any field | Per-field checks |
| **Injection** | Unsanitised args into SQL/NoSQL | Parameterised queries |
| **Info leakage** | Stack traces in errors | `formatError` masking |
| **DoS via aliases** | `a: expensiveField b: expensiveField …` | Cost analysis counts aliases |

```js
// ---------- 1. DEPTH LIMITING ----------
import depthLimit from 'graphql-depth-limit';
new ApolloServer({ schema, validationRules: [depthLimit(7)] });

// ---------- 2. COMPLEXITY / COST ANALYSIS ----------
import { createComplexityLimitRule } from 'graphql-validation-complexity';
new ApolloServer({
  schema,
  validationRules: [createComplexityLimitRule(1000, {
    onCost: (cost) => logger.debug({ cost }, 'query cost'),
  })],
});
```

```graphql
# Cost directives — declare what each field costs
type Query {
  users(first: Int!): [User!]! @cost(complexity: 1, multipliers: ["first"])
  expensiveReport: Report! @cost(complexity: 100)
}
```

```js
// ---------- 3. DISABLE INTROSPECTION IN PRODUCTION ----------
new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
});

// ---------- 4. FIELD-LEVEL AUTHORIZATION ----------
const resolvers = {
  User: {
    email: (parent, _, { user }) => {
      if (user?.id !== parent.id && user?.role !== 'ADMIN') {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }
      return parent.email;
    },
  },
};

// Or as a schema directive
directive @auth(requires: Role = USER) on FIELD_DEFINITION | OBJECT

type User {
  email: String! @auth(requires: ADMIN)
  salary: Float @auth(requires: ADMIN)
}

// ---------- 5. TIMEOUTS & RATE LIMITING ----------
new ApolloServer({
  plugins: [{
    async requestDidStart() {
      const timer = setTimeout(() => { throw new Error('Query timeout'); }, 10_000);
      return { async willSendResponse() { clearTimeout(timer); } };
    },
  }],
});

// ---------- 6. LIMIT BATCHED REQUESTS ----------
new ApolloServer({ allowBatchedHttpRequests: false });   // or cap the array length
```

**Interview Tip:** The GraphQL-specific DoS vector is the one interviewers probe. In REST, each endpoint has a bounded cost. In GraphQL, **the client controls the query shape**, so a single 200-byte request can trigger millions of database rows. Depth limiting + cost analysis + persisted queries is the layered answer.

**Common Mistakes:** Assuming authentication in the context is enough. Authentication says *who* you are; you still need **authorization per field** — otherwise any logged-in user can query `users { email salary }`.

---

# Apollo Client (React)

## How do you use GraphQL in React?

```jsx
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, useMutation, gql } from '@apollo/client';

// ---------- SETUP ----------
const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
  credentials: 'include',
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});

<ApolloProvider client={client}><App /></ApolloProvider>

// ---------- QUERY ----------
const GET_POSTS = gql`
  query GetPosts($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      edges { node { id title author { name } } cursor }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function PostList() {
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_POSTS, {
    variables: { first: 20 },
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  if (loading && !data) return <Skeleton />;
  if (error) return <ErrorMessage error={error} onRetry={() => refetch()} />;

  const loadMore = () =>
    fetchMore({
      variables: { after: data.posts.pageInfo.endCursor },
      // merging is handled by the typePolicy in InMemoryCache
    });

  return (
    <>
      {data.posts.edges.map(({ node }) => <PostCard key={node.id} post={node} />)}
      {data.posts.pageInfo.hasNextPage && <button onClick={loadMore}>Load more</button>}
    </>
  );
}

// ---------- MUTATION with optimistic UI ----------
const ADD_COMMENT = gql`
  mutation AddComment($input: AddCommentInput!) {
    addComment(input: $input) {
      comment { id text author { id name } }
      userErrors { field message }
    }
  }
`;

function CommentForm({ postId }) {
  const [addComment, { loading }] = useMutation(ADD_COMMENT, {
    // Show the result INSTANTLY, revert automatically if it fails
    optimisticResponse: (vars) => ({
      addComment: {
        __typename: 'AddCommentPayload',
        comment: {
          __typename: 'Comment',
          id: `temp-${Date.now()}`,
          text: vars.input.text,
          author: { __typename: 'User', id: currentUser.id, name: currentUser.name },
        },
        userErrors: [],
      },
    }),

    // Manually update the normalised cache
    update(cache, { data }) {
      const newComment = data?.addComment?.comment;
      if (!newComment) return;

      cache.modify({
        id: cache.identify({ __typename: 'Post', id: postId }),
        fields: {
          comments(existing = []) {
            const ref = cache.writeFragment({
              data: newComment,
              fragment: gql`fragment NewComment on Comment { id text author { id name } }`,
            });
            return [...existing, ref];
          },
        },
      });
    },

    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (text) =>
    addComment({ variables: { input: { postId, text } } });
}
```

### Fetch policies

| Policy | Behaviour |
|---|---|
| `cache-first` (default) | Cache if available, else network |
| `cache-and-network` | Return cache immediately, then refetch ⭐ good UX |
| `network-only` | Always fetch, still write to cache |
| `no-cache` | Fetch, don't read or write the cache |
| `cache-only` | Never hit the network |

**Interview Tip:** The normalised cache is Apollo's real value. Because objects are stored by `__typename:id`, a mutation returning the updated object automatically updates **every component displaying it** — no manual refetching. That's why mutations should always return the affected entity.

**Common Mistakes:** Forgetting to request `id` in a query — without it Apollo can't normalise the object, so cache updates silently stop working. And using `refetchQueries` everywhere instead of letting the cache update itself.

---

# Federation & Schema Design

## What is GraphQL Federation?

### Answer

Composing multiple GraphQL services into **one unified graph**, so clients see a single schema while teams own their own services independently.

```
                    ┌──────────────┐
Client ────────────>│    Router    │   (one endpoint, one schema)
                    └──────┬───────┘
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌───────────┐     ┌───────────┐     ┌────────────┐
  │  Users    │     │  Products │     │  Reviews   │
  │  service  │     │  service  │     │  service   │
  └───────────┘     └───────────┘     └────────────┘
```

```graphql
# ---------- Users service ----------
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# ---------- Reviews service — EXTENDS the User type it doesn't own ----------
type User @key(fields: "id") {
  id: ID!                          # the key
  reviews: [Review!]!              # a field this service adds
}

type Review @key(fields: "id") {
  id: ID!
  rating: Int!
  text: String!
  author: User!
  product: Product!
}

type Product @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}
```

```js
// Reference resolver — how this service resolves an entity by its key
const resolvers = {
  User: {
    __resolveReference: (ref) => ({ id: ref.id }),   // just needs the key
    reviews: (user, _, { loaders }) => loaders.reviewsByUserId.load(user.id),
  },
};
```

Now a client can query across services in one request:

```graphql
query {
  product(id: "1") {
    name                    # Products service
    reviews {               # Reviews service
      rating
      author { name }       # Users service
    }
  }
}
```

### Federation vs Schema Stitching vs BFF

| | Federation | Stitching | BFF (monolith gateway) |
|---|---|---|---|
| Ownership | Distributed | Central gateway | Central |
| Type extension | Native (`@key`) | Manual | N/A |
| Complexity | Medium | High | Low |
| Best for | Many teams, microservices | Legacy composition | Single team |

**Interview Tip:** Federation is genuinely valuable at organisational scale (many teams, many services) and genuine overkill below that. For a small team, a single GraphQL server calling multiple internal services is simpler and faster. Saying that shows judgement rather than resume-driven architecture.

---

## How do you evolve a GraphQL schema without breaking clients?

```graphql
# ✅ SAFE — additive changes
type User {
  id: ID!
  name: String!
  avatarUrl: String        # NEW field — old clients simply don't request it
}

# ✅ SAFE — deprecate rather than delete
type User {
  fullName: String! @deprecated(reason: "Use firstName + lastName. Removal: 2026-12-01")
  firstName: String!
  lastName: String!
}

# ❌ BREAKING
- Removing a field or type
- Renaming a field
- Making a nullable field non-null? SAFE for output, BREAKING for input
- Making a non-null field nullable? BREAKING for output, safe for input
- Adding a required argument
- Removing an enum value  (a client may be sending it)
- Changing a field's type
```

### The deprecation process

```
1. Add the new field
2. Mark the old field @deprecated with a reason and a removal date
3. Track usage with field-level metrics (Apollo Studio, custom plugin)
4. Notify consumers
5. Remove ONLY when usage hits zero
```

```js
// Track field usage so you know when it's safe to remove
const fieldUsagePlugin = {
  async requestDidStart() {
    return {
      async willSendResponse({ document, operationName }) {
        for (const field of extractFields(document)) {
          metrics.increment('graphql.field.usage', { field, operationName });
        }
      },
    };
  },
};
```

**Interview Tip:** GraphQL's "no versioning" claim is real but requires discipline: you get continuous evolution instead of `/v2`, but only if you **measure field usage** before removing anything. Without usage metrics you're guessing, and you'll break a client you forgot existed.

---

# Testing

```js
import { ApolloServer } from '@apollo/server';
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

describe('Post resolvers', () => {
  const server = new ApolloServer({ typeDefs, resolvers });

  test('fetches a post with its author', async () => {
    const response = await server.executeOperation(
      {
        query: `query GetPost($id: ID!) { post(id: $id) { title author { name } } }`,
        variables: { id: '1' },
      },
      { contextValue: { db: testDb, user: testUser, loaders: createLoaders(testDb) } }
    );

    assert.equal(response.body.kind, 'single');
    assert.equal(response.body.singleResult.errors, undefined);
    assert.equal(response.body.singleResult.data.post.title, 'Test Post');
  });

  test('returns userErrors for invalid input', async () => {
    const response = await server.executeOperation(
      {
        query: `mutation { createPost(input: { title: "", body: "x" }) {
          post { id } userErrors { field message code }
        } }`,
      },
      { contextValue: { db: testDb, user: testUser } }
    );

    const { data } = response.body.singleResult;
    assert.equal(data.createPost.post, null);
    assert.equal(data.createPost.userErrors[0].code, 'VALIDATION_ERROR');
  });

  test('requires authentication', async () => {
    const response = await server.executeOperation(
      { query: `mutation { createPost(input: { title: "x", body: "y" }) { post { id } } }` },
      { contextValue: { db: testDb, user: null } }        // no user
    );
    assert.equal(response.body.singleResult.data.createPost.userErrors[0].code, 'UNAUTHENTICATED');
  });
});

// ---------- SCHEMA CHANGE DETECTION IN CI ----------
// npx graphql-inspector diff schema-main.graphql schema-pr.graphql
// Fails the build on breaking changes
```

```jsx
// ---------- TESTING REACT COMPONENTS ----------
import { MockedProvider } from '@apollo/client/testing';

const mocks = [{
  request: { query: GET_POSTS, variables: { first: 20 } },
  result: { data: { posts: { edges: [{ node: { id: '1', title: 'Test' } }] } } },
}];

render(
  <MockedProvider mocks={mocks} addTypename={false}>
    <PostList />
  </MockedProvider>
);
expect(await screen.findByText('Test')).toBeInTheDocument();
```

**Interview Tip:** `graphql-inspector diff` in CI is the practical answer to "how do you avoid breaking clients?" It compares the PR's schema against main and fails the build on breaking changes — turning schema discipline into an automated gate rather than a code-review convention.

---

# Rapid Fire

**Why does GraphQL always return HTTP 200?**
Because a partial success is normal — some fields can resolve while others fail. The `errors` array carries failures alongside partial `data`. (Apollo Server 4 can return other statuses via `extensions.http`.)

**What is `__typename`?**
A meta-field on every object type returning its type name. Essential for unions/interfaces and for Apollo's cache normalisation.

**What is introspection?**
The ability to query the schema itself (`__schema`, `__type`). Powers GraphiQL, codegen and IDE tooling. Disable it in production.

**What is SDL?**
Schema Definition Language — the `type User { … }` syntax used to describe a schema.

**What is a resolver chain?**
Each field's resolver receives the parent's result, so data flows down the query tree from root to leaves.

**What is the default resolver?**
If no resolver is defined, GraphQL returns `parent[fieldName]` (invoking it if it's a function).

**What is `@skip` and `@include`?**
Built-in directives that conditionally omit fields based on a variable.

**What is a custom scalar?**
A scalar you define (DateTime, Email, JSON) with `serialize`, `parseValue` and `parseLiteral` implementations.

**Interface vs union?**
Interface = shared fields, types implement it. Union = no shared fields, just "one of these types."

**Input type vs object type?**
Input types are for arguments only and can't contain object-typed fields. Object types are for output only.

**What is a connection?**
The Relay pagination pattern: `edges { node cursor }` + `pageInfo`, enabling cursor-based pagination with per-edge metadata.

**What is `keyArgs` in Apollo?**
Tells the cache which arguments make a field's result distinct — so `posts(filter: "a")` and `posts(filter: "b")` don't overwrite each other.

**What is an optimistic response?**
A fake result written to the cache immediately so the UI updates instantly; automatically rolled back if the mutation fails.

**How do you upload files?**
Not natively supported. Use the GraphQL multipart request spec (`graphql-upload`), or — better — get a presigned S3 URL via a mutation and upload directly.

**What is a persisted query?**
Sending a hash instead of the full query text. Smaller requests, enables GET + CDN caching, and with a manifest becomes an allowlist.

**What is Automatic Persisted Queries (APQ)?**
Apollo's version: the client tries the hash first, and only sends the full query if the server doesn't recognise it.

**What is query batching?**
Sending multiple operations in one HTTP request. Reduces round trips but is a DoS vector — cap the batch size.

**What is `@defer` and `@stream`?**
Incremental delivery — send fast fields immediately and stream slow ones as they resolve. Great for above-the-fold content.

**What is a schema directive?**
Custom metadata on schema elements (`@auth`, `@cost`, `@deprecated`) that a transformer or plugin acts on.

**What is Apollo Studio / GraphOS?**
Hosted schema registry, field-level usage metrics, breaking-change detection and performance tracing.

**Can GraphQL work over something other than HTTP?**
Yes — it's transport-agnostic. WebSockets for subscriptions, and it can run over anything that carries a request/response.

**What is `useLazyQuery`?**
A query that runs on demand (on a button click) rather than on render.

**Is GraphQL good for public APIs?**
It's a real tradeoff. You get flexibility but also arbitrary query cost from untrusted clients, harder caching and harder rate limiting. GitHub does it successfully — with strict cost limits.

**How do you rate limit GraphQL?**
Not by request count — by **query cost**. Assign a point value per field, compute the cost before execution, and deduct from the client's budget.

**What is the `info` argument used for?**
Reading the requested selection set — used to build a single optimised SQL join instead of resolving field by field.

**How do you version a GraphQL API?**
You generally don't. Add fields, deprecate old ones, measure usage, remove when it hits zero.

---

## 📌 Interview Checklist

- [ ] Explain over-fetching and under-fetching with a concrete example
- [ ] What does GraphQL make *harder* than REST? (caching, cost control, errors)
- [ ] Explain the resolver signature and the execution tree
- [ ] What is the N+1 problem, and write a DataLoader that fixes it
- [ ] Why must DataLoaders be per-request?
- [ ] Why does the batch function need to preserve key order?
- [ ] Design a mutation with a payload type and `userErrors`
- [ ] Explain null bubbling and why over-using `!` is risky
- [ ] Name four GraphQL-specific security risks and their mitigations
- [ ] How do you evolve a schema without versioning?
- [ ] Cursor vs offset pagination — why does Relay use edges/nodes?
- [ ] When would you NOT use GraphQL?
