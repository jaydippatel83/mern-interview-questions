# 🍃 MongoDB Interview Questions

> Documents · CRUD · Indexes · Aggregation · Schema design · Mongoose · Transactions · Scaling

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [CRUD Operations](#crud-operations)
3. [Query Operators](#query-operators)
4. [Indexes](#indexes)
5. [Aggregation Framework](#aggregation-framework)
6. [Schema Design](#schema-design)
7. [Mongoose](#mongoose)
8. [Transactions](#transactions)
9. [Replication & Sharding](#replication--sharding)
10. [Performance](#performance)
11. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is MongoDB and when should you use it?

### Answer

A document database that stores data as **BSON** (binary JSON) documents inside collections, instead of rows inside tables.

```
SQL                MongoDB
─────────────────────────────
Database      →    Database
Table         →    Collection
Row           →    Document
Column        →    Field
JOIN          →    $lookup / embedding
Primary key   →    _id
```

### Why do we use it?

- **Flexible schema** — fields can differ per document, so evolving models don't need migrations
- **Documents match objects** — no ORM impedance mismatch
- **Horizontal scaling** built in (sharding)
- **Fast reads** when related data is embedded — one query instead of five joins

### When should we use it?

| Good fit | Poor fit |
|---|---|
| Content, catalogs, user profiles | Complex multi-entity reporting |
| Event logs, IoT, time series | Heavy financial transactions across many tables |
| Rapidly evolving schemas | Data with many many-to-many relationships |
| Read-heavy with denormalised access | Where strict referential integrity is required |

### Example

```js
// One document holds what SQL would need 3 tables for
{
  _id: ObjectId("65a1b2c3d4e5f6a7b8c9d0e1"),
  name: "Jaydip Patel",
  email: "jaydip@example.com",
  addresses: [
    { type: "home", city: "Surat", pincode: "395007" },
    { type: "office", city: "Ahmedabad", pincode: "380015" }
  ],
  orders: [
    { orderId: "ORD-1", total: 2499, date: ISODate("2026-01-15") }
  ],
  createdAt: ISODate("2026-01-01T10:00:00Z")
}
```

**Interview Tip:** "Schema-less" is a myth worth correcting. MongoDB has no *enforced* schema by default, but your application always has one. Modern MongoDB supports JSON Schema validation, and Mongoose enforces one in code. Saying this shows maturity.

**Common Mistakes:** Choosing MongoDB because "it's easier" and then modelling it exactly like SQL — many small collections joined with `$lookup`. That gives you the worst of both worlds.

---

## What is an ObjectId?

### Answer

A 12-byte unique identifier auto-generated for `_id`:

```
4 bytes: Unix timestamp (seconds)
5 bytes: random value per machine+process
3 bytes: incrementing counter
```

### Example

```js
const id = new ObjectId("65a1b2c3d4e5f6a7b8c9d0e1");

id.getTimestamp();      // ISODate — creation time is embedded, free "createdAt"
id.toString();          // "65a1b2c3d4e5f6a7b8c9d0e1"
ObjectId.isValid(str);  // validate before querying

// Sorting by _id ≈ sorting by creation time
db.users.find().sort({ _id: -1 }).limit(10);   // 10 newest

// Query by date range using ObjectId
const startOfDay = ObjectId.createFromTime(Date.now() / 1000 - 86400);
db.orders.find({ _id: { $gt: startOfDay } });
```

**Interview Tip:** The embedded timestamp means you often don't need a separate `createdAt` field, and `_id` sorts chronologically for free. But it's monotonic-ish, which makes it a poor shard key (hotspotting on one shard).

**Common Mistakes:** Comparing an ObjectId with `===` — use `.equals()` or `.toString()`.

---

# CRUD Operations

## How do you perform CRUD in MongoDB?

### Answer

```js
// ===== CREATE =====
db.users.insertOne({ name: "Jaydip", age: 25, tags: ["dev"] });
db.users.insertMany([{ name: "A" }, { name: "B" }], { ordered: false });
// ordered: false → continue after a failure (faster bulk inserts)

// ===== READ =====
db.users.find({ age: { $gte: 18 } });
db.users.findOne({ email: "a@b.com" });

// Projection — fetch only what you need
db.users.find({ age: 25 }, { name: 1, email: 1, _id: 0 });

// Sort, skip, limit
db.users.find().sort({ createdAt: -1 }).skip(20).limit(10);

// Count
db.users.countDocuments({ active: true });    // accurate, respects filter
db.users.estimatedDocumentCount();            // fast metadata read, no filter

// Distinct
db.users.distinct("city", { country: "India" });

// ===== UPDATE =====
db.users.updateOne(
  { _id: id },
  {
    $set: { name: "New Name", "address.city": "Surat" },
    $inc: { loginCount: 1, credits: -10 },
    $push: { tags: "premium" },
    $addToSet: { roles: "editor" },              // push only if absent
    $pull: { tags: "trial" },
    $unset: { temporaryField: "" },
    $currentDate: { updatedAt: true },
    $min: { lowestScore: 42 },
    $max: { highestScore: 99 },
    $rename: { oldName: "newName" }
  }
);

db.users.updateMany({ active: false }, { $set: { archived: true } });

// Upsert — insert if not found
db.users.updateOne(
  { email: "a@b.com" },
  { $set: { name: "A" }, $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
);

// Return the modified document
db.users.findOneAndUpdate(
  { _id: id },
  { $inc: { views: 1 } },
  { returnDocument: "after" }
);

// ===== DELETE =====
db.users.deleteOne({ _id: id });
db.users.deleteMany({ active: false });
db.users.findOneAndDelete({ _id: id });        // returns the deleted doc

// ===== BULK =====
db.users.bulkWrite([
  { insertOne: { document: { name: "X" } } },
  { updateOne: { filter: { _id: id }, update: { $set: { a: 1 } } } },
  { deleteOne: { filter: { _id: id2 } } }
], { ordered: false });
```

### Array update operators

```js
// Positional $ — updates the FIRST matching array element
db.orders.updateOne(
  { _id: id, "items.sku": "ABC" },
  { $set: { "items.$.qty": 5 } }
);

// $[] — updates ALL array elements
db.orders.updateMany({}, { $inc: { "items.$[].price": 10 } });

// $[identifier] — updates elements matching a filter
db.orders.updateOne(
  { _id: id },
  { $set: { "items.$[elem].discounted": true } },
  { arrayFilters: [{ "elem.price": { $gt: 1000 } }] }
);

// $push with modifiers — keep only the last 10, sorted
db.users.updateOne(
  { _id: id },
  { $push: { recentViews: { $each: [item], $sort: { date: -1 }, $slice: 10 } } }
);
```

**Interview Tip:** `countDocuments` vs `estimatedDocumentCount` is a common gotcha — the estimated one reads collection metadata (instant, but can't filter and may be stale after an unclean shutdown).

---

# Query Operators

## What are the main query operators?

### Answer

```js
// Comparison
{ age: { $eq: 25 } }
{ age: { $ne: 25 } }
{ age: { $gt: 18, $lt: 65 } }
{ age: { $gte: 18, $lte: 65 } }
{ status: { $in: ["active", "pending"] } }
{ status: { $nin: ["banned"] } }

// Logical
{ $and: [{ age: { $gt: 18 } }, { city: "Surat" }] }
{ $or: [{ role: "admin" }, { permissions: "write" }] }
{ $nor: [{ a: 1 }, { b: 2 }] }
{ age: { $not: { $lt: 18 } } }

// Element
{ phone: { $exists: true } }
{ age: { $type: "number" } }

// Evaluation
{ name: { $regex: /^jay/i } }                      // ⚠️ leading wildcard can't use an index
{ $text: { $search: "mongodb tutorial" } }         // needs a text index
{ $expr: { $gt: ["$spent", "$budget"] } }          // compare two FIELDS
{ price: { $mod: [10, 0] } }

// Array
{ tags: "nodejs" }                                  // matches if the array CONTAINS it
{ tags: { $all: ["node", "react"] } }               // contains all
{ tags: { $size: 3 } }
{ scores: { $elemMatch: { $gt: 80, $lt: 90 } } }    // ONE element matches ALL conditions

// The $elemMatch trap
// Documents: { scores: [70, 95] }
{ scores: { $gt: 80, $lt: 90 } }                    // ✅ MATCHES — 95 > 80 AND 70 < 90
{ scores: { $elemMatch: { $gt: 80, $lt: 90 } } }    // ❌ no match — no single element fits both

// Nested documents
{ "address.city": "Surat" }
{ "items.sku": "ABC" }

// Array of objects
{ "items": { $elemMatch: { sku: "ABC", qty: { $gt: 2 } } } }   // same element
{ "items.sku": "ABC", "items.qty": { $gt: 2 } }                // ⚠️ possibly DIFFERENT elements
```

**Interview Tip:** The `$elemMatch` distinction is a genuinely tricky interview question. Without it, conditions on an array can be satisfied by *different* elements — a real source of production bugs in order/cart queries.

---

# Indexes

## How do indexes work in MongoDB?

### Answer

B-tree structures that let the engine find documents without scanning the whole collection. Without one, every query is a **COLLSCAN**.

### Example

```js
// Single field
db.users.createIndex({ email: 1 }, { unique: true });

// Compound — ORDER MATTERS
db.orders.createIndex({ userId: 1, createdAt: -1 });

// Multikey — automatic on array fields
db.posts.createIndex({ tags: 1 });

// Text search
db.articles.createIndex({ title: "text", body: "text" },
  { weights: { title: 10, body: 1 } });

// Geospatial
db.places.createIndex({ location: "2dsphere" });

// Partial — index only some documents (smaller, faster)
db.orders.createIndex(
  { createdAt: -1 },
  { partialFilterExpression: { status: "active" } }
);

// Sparse — skip documents missing the field
db.users.createIndex({ phone: 1 }, { sparse: true });

// TTL — auto-delete documents after N seconds
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Case-insensitive
db.users.createIndex({ email: 1 }, { collation: { locale: "en", strength: 2 } });

// Hidden — test the impact of dropping an index without actually dropping it
db.users.createIndex({ x: 1 }, { hidden: true });

// Inspect
db.users.getIndexes();
db.users.stats().indexSizes;
db.users.dropIndex("email_1");
```

## The ESR rule for compound indexes

### Answer

Order compound index fields as **Equality → Sort → Range**.

```js
// Query
db.orders.find({ status: "shipped", price: { $gt: 100 } }).sort({ createdAt: -1 });

// ✅ Correct order: Equality (status) → Sort (createdAt) → Range (price)
db.orders.createIndex({ status: 1, createdAt: -1, price: 1 });

// ❌ Wrong — range before sort forces an in-memory sort
db.orders.createIndex({ status: 1, price: 1, createdAt: -1 });
```

### The index prefix rule

```js
db.users.createIndex({ a: 1, b: 1, c: 1 });

// Uses the index:
{ a: 1 }                    // ✅ prefix
{ a: 1, b: 1 }              // ✅ prefix
{ a: 1, b: 1, c: 1 }        // ✅ full

// Does NOT use it (efficiently):
{ b: 1 }                    // ❌ not a prefix
{ b: 1, c: 1 }              // ❌
{ a: 1, c: 1 }              // ⚠️ partial — uses `a` only
```

## Reading `explain()`

```js
db.orders.find({ status: "shipped" }).explain("executionStats");
```

```js
{
  executionStats: {
    nReturned: 100,
    executionTimeMillis: 2,
    totalKeysExamined: 100,      // index entries scanned
    totalDocsExamined: 100,      // documents fetched
    executionStages: { stage: "IXSCAN" }   // or COLLSCAN ❌
  }
}
```

| Stage | Meaning |
|---|---|
| `COLLSCAN` | Full collection scan — **needs an index** |
| `IXSCAN` | Index scan ✅ |
| `FETCH` | Fetching full documents after the index scan |
| `PROJECTION_COVERED` | **Covered query** — answered from the index alone, no FETCH 🏆 |
| `SORT` | In-memory sort — fails above 100MB, add an index |

**The goal:** `totalKeysExamined ≈ totalDocsExamined ≈ nReturned`. If keys examined is 1,000,000 and nReturned is 10, your index isn't selective.

**Interview Tip:** A **covered query** is the best possible outcome — when the index contains every field in both the filter and the projection, MongoDB never touches the documents. Show it:

```js
db.users.createIndex({ email: 1, name: 1 });
db.users.find({ email: "a@b.com" }, { name: 1, _id: 0 });   // fully covered
```

**Common Mistakes:** Creating an index per field instead of well-designed compound indexes. Indexes cost write performance and RAM — every insert updates every index.

---

# Aggregation Framework

## What is the aggregation pipeline?

### Answer

A sequence of stages where each transforms the documents and passes them to the next.

```js
db.orders.aggregate([
  // 1. Filter EARLY — use indexes, reduce the working set
  { $match: {
      status: "completed",
      createdAt: { $gte: ISODate("2026-01-01") }
  }},

  // 2. Join
  { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
  }},
  { $unwind: "$user" },     // $lookup returns an array; flatten it

  // 3. Reshape
  { $project: {
      orderId: 1,
      total: 1,
      customerName: "$user.name",
      month: { $month: "$createdAt" },
      isLarge: { $gt: ["$total", 5000] }
  }},

  // 4. Group and aggregate
  { $group: {
      _id: { month: "$month", customer: "$customerName" },
      revenue: { $sum: "$total" },
      orderCount: { $sum: 1 },
      avgOrder: { $avg: "$total" },
      maxOrder: { $max: "$total" },
      allOrders: { $push: "$orderId" },
      uniqueProducts: { $addToSet: "$productId" }
  }},

  // 5. Filter AFTER grouping
  { $match: { revenue: { $gt: 10000 } } },

  // 6. Sort and paginate
  { $sort: { revenue: -1 } },
  { $skip: 0 },
  { $limit: 20 }
]);
```

### The stages you must know

| Stage | Purpose |
|---|---|
| `$match` | Filter — put it first, uses indexes |
| `$project` | Include/exclude/compute fields |
| `$addFields` / `$set` | Add fields, keep everything else |
| `$group` | Group and aggregate |
| `$sort` | Sort (indexed if early) |
| `$limit` / `$skip` | Pagination |
| `$unwind` | Array → one document per element |
| `$lookup` | Left outer join |
| `$facet` | Run multiple pipelines on the same input |
| `$bucket` | Histogram-style grouping |
| `$count` | Count documents |
| `$out` / `$merge` | Write results to a collection |
| `$unionWith` | Combine with another collection |
| `$graphLookup` | Recursive/hierarchical lookup |

### `$facet` — multiple results in one round trip

```js
// Get paginated data + total count + filter aggregates in ONE query
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $facet: {
      data: [
        { $sort: { price: 1 } },
        { $skip: 0 },
        { $limit: 20 }
      ],
      totalCount: [{ $count: "count" }],
      priceRanges: [
        { $bucket: {
            groupBy: "$price",
            boundaries: [0, 1000, 5000, 20000, 100000],
            default: "expensive",
            output: { count: { $sum: 1 } }
        }}
      ],
      brands: [
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]
  }}
]);
```

### `$lookup` with a sub-pipeline (more control)

```js
{ $lookup: {
    from: "orders",
    let: { userId: "$_id" },
    pipeline: [
      { $match: { $expr: { $eq: ["$userId", "$$userId"] }, status: "completed" } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      { $project: { total: 1, createdAt: 1 } }
    ],
    as: "recentOrders"
}}
```

### `$graphLookup` — hierarchies

```js
// Find an entire management chain
db.employees.aggregate([
  { $match: { name: "Jaydip" } },
  { $graphLookup: {
      from: "employees",
      startWith: "$managerId",
      connectFromField: "managerId",
      connectToField: "_id",
      as: "managementChain",
      maxDepth: 5,
      depthField: "level"
  }}
]);
```

**Interview Tip:** The performance rule: **`$match` and `$sort` as early as possible** so they can use indexes. Once you hit `$group` or `$unwind`, the documents are synthetic and no index can help.

**Common Mistakes:** `$lookup` on an unindexed foreign field — it's a nested loop join and gets very slow. Always index the `foreignField`.

---

# Schema Design

## Embedding vs referencing — how do you decide?

### Answer

| | Embed | Reference |
|---|---|---|
| Relationship | One-to-few | One-to-many / many-to-many |
| Access pattern | Always read together | Read independently |
| Update frequency | Child changes with parent | Child changes on its own |
| Growth | Bounded | Unbounded |
| Query | One read ✅ | Needs `$lookup` or a second query |
| Duplication | Data is duplicated | Single source of truth |

### The rules of thumb

1. **One-to-few (< ~100, bounded):** embed — addresses, phone numbers
2. **One-to-many (bounded, ~100–1000):** reference with an array of ids
3. **One-to-squillions (unbounded):** reference from the child side — log entries, comments
4. **Many-to-many:** references on both sides, or a join collection
5. **16MB document limit** — a growing array will eventually break the document

### Example

```js
// ✅ EMBED — always read together, bounded
{
  _id: ObjectId(),
  name: "Jaydip",
  addresses: [
    { type: "home", city: "Surat" },
    { type: "office", city: "Ahmedabad" }
  ]
}

// ✅ REFERENCE — unbounded child collection
// users
{ _id: ObjectId("u1"), name: "Jaydip" }
// posts
{ _id: ObjectId("p1"), authorId: ObjectId("u1"), title: "…" }
// index: db.posts.createIndex({ authorId: 1, createdAt: -1 })

// ✅ EXTENDED REFERENCE — reference + duplicate the hot fields
// Avoids a $lookup for the 95% case
{
  _id: ObjectId("o1"),
  userId: ObjectId("u1"),
  userSnapshot: { name: "Jaydip", email: "j@x.com" },   // denormalised
  items: [...],
  total: 2499
}
// Tradeoff: if the user renames themselves, you update it in two places
// (often correct anyway — an order should keep the name at time of purchase)

// ✅ SUBSET PATTERN — embed the recent few, reference the rest
{
  _id: ObjectId("p1"),
  title: "My post",
  commentCount: 1543,
  recentComments: [/* last 5 — shown on page load */],
  // the other 1538 live in the `comments` collection
}

// ✅ BUCKET PATTERN — time series, avoids one doc per reading
{
  sensorId: "s1",
  hour: ISODate("2026-07-25T10:00:00Z"),
  count: 60,
  readings: [
    { t: ISODate("...:00"), v: 22.5 },
    { t: ISODate("...:01"), v: 22.7 }
  ]
}

// ✅ COMPUTED PATTERN — store the aggregate, don't recompute per read
{ productId: "p1", avgRating: 4.6, reviewCount: 218 }
```

### The anti-patterns

```js
// ❌ Unbounded array — will hit the 16MB limit and slow every read
{ _id: "post1", comments: [ /* 50,000 comments */ ] }

// ❌ Massive number of collections (one per user/tenant)
// ❌ Modelling exactly like SQL — 12 collections all joined with $lookup
// ❌ Case-insensitive queries with regex instead of a collation index
```

**Interview Tip:** The one-line principle: **"Data that is accessed together should be stored together."** Then follow with: *"I design the schema around the queries the application actually makes, not around the entities."* That's the fundamental difference from relational modelling.

---

# Mongoose

## How do you use Mongoose effectively?

### Answer

```js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: { type: Number, min: 0 },
    qty: { type: Number, min: 1, default: 1 },
  }],
  status: {
    type: String,
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  },
  total: { type: Number, required: true },
  couponCode: { type: String, uppercase: true, trim: true },
  metadata: { type: Map, of: String },
}, {
  timestamps: true,                 // createdAt + updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Virtual — computed, not stored
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, i) => sum + i.qty, 0);
});

// Virtual populate — reverse reference without storing an array
userSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'userId',
});

// Middleware (hooks)
orderSchema.pre('save', function (next) {
  this.total = this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  next();
});

orderSchema.post('save', async function (doc) {
  await sendOrderConfirmation(doc);
});

// Query middleware — soft delete, applied everywhere
orderSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

// Instance method
orderSchema.methods.cancel = async function (reason) {
  if (!['pending', 'paid'].includes(this.status)) {
    throw new Error(`Cannot cancel a ${this.status} order`);
  }
  this.status = 'cancelled';
  this.cancelReason = reason;
  return this.save();
};

// Static method
orderSchema.statics.findByUser = function (userId, { limit = 20 } = {}) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
};

export const Order = mongoose.model('Order', orderSchema);
```

### Populate

```js
// Basic
const order = await Order.findById(id).populate('userId', 'name email');

// Nested + filtered
await Order.find()
  .populate({
    path: 'items.productId',
    select: 'name price image',
    match: { active: true },
  })
  .populate({
    path: 'userId',
    select: 'name',
    populate: { path: 'company', select: 'name' },   // deep populate
  })
  .lean();
```

### `.lean()` — the biggest easy win

```js
// Without lean — full Mongoose documents with getters, virtuals, change tracking
const docs = await Order.find();       // slow, high memory

// With lean — plain JS objects
const docs = await Order.find().lean(); // ~5x faster, ~10x less memory
// ⚠️ No .save(), no virtuals (unless mongoose-lean-virtuals), no instance methods
```

### Connection singleton

```js
let cached = global.mongooseConn;
if (!cached) cached = global.mongooseConn = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  cached.promise ??= mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
// The globalThis cache prevents connection explosions on hot reload in dev
```

**Interview Tip:** Always mention `.lean()` for read-only queries — it's the single most impactful Mongoose optimisation and most candidates don't know it exists.

**Common Mistakes:** `populate` in a loop (N+1 queries); not indexing the `ref` field; using `findOneAndUpdate` without `{ new: true }` and being confused by the old document.

---

# Transactions

## How do transactions work in MongoDB?

### Answer

Multi-document ACID transactions, available since 4.0 for replica sets and 4.2 for sharded clusters.

### Example

```js
const session = await mongoose.startSession();

try {
  await session.withTransaction(async () => {
    // Deduct stock
    const product = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: qty } },   // conditional — prevents overselling
      { $inc: { stock: -qty } },
      { session, new: true }
    );
    if (!product) throw new Error('Insufficient stock');

    // Charge the wallet
    const user = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: total } },
      { $inc: { balance: -total } },
      { session, new: true }
    );
    if (!user) throw new Error('Insufficient balance');

    // Create the order
    await Order.create([{ userId, productId, qty, total }], { session });
  }, {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 5000,
  });
} finally {
  await session.endSession();
}
```

### When you DON'T need a transaction

```js
// A single document update is already atomic — no transaction needed
await Account.updateOne(
  { _id: id, balance: { $gte: amount } },
  { $inc: { balance: -amount }, $push: { history: entry } }
);
```

### Limitations

- Requires a replica set (a standalone mongod won't work — even locally, use `rs.initiate()`)
- Default 60-second time limit
- Performance cost — locks and oplog overhead
- Not available on capped collections

**Interview Tip:** The key insight: **operations on a single document are always atomic in MongoDB.** If your schema is designed well (embedding what changes together), you rarely need transactions. Needing them constantly is usually a signal the schema is modelled like SQL.

---

# Replication & Sharding

## What is a replica set?

### Answer

A group of mongod processes maintaining the same data — one **primary** (all writes) and multiple **secondaries** (replicate via the oplog).

```
        ┌───────────┐
Writes ─>│  PRIMARY  │
        └─────┬─────┘
     oplog    │    oplog
    ┌─────────┴─────────┐
    ▼                   ▼
┌──────────┐      ┌──────────┐
│SECONDARY │      │SECONDARY │  ← optional reads
└──────────┘      └──────────┘
```

### Why do we use it?

- **High availability** — automatic failover in ~10s if the primary dies
- **Redundancy** — data on multiple machines
- **Read scaling** — with `readPreference: 'secondaryPreferred'`
- **Zero-downtime maintenance** — rolling upgrades

### Read and write concerns

```js
// Write concern — how many nodes must acknowledge
{ w: 1 }              // primary only — fast, can be lost on failover
{ w: 'majority' }     // majority of nodes — durable ✅ (default since 5.0)
{ w: 'majority', j: true, wtimeout: 5000 }   // + written to the journal

// Read concern — what you're guaranteed to see
{ level: 'local' }         // may be rolled back
{ level: 'majority' }      // acknowledged by a majority — won't roll back
{ level: 'linearizable' }  // strongest, slowest

// Read preference
readPreference: 'primary'             // default — always consistent
readPreference: 'secondaryPreferred'  // scale reads, but may be stale
readPreference: 'nearest'             // lowest latency
```

## What is sharding?

### Answer

Horizontal partitioning across multiple machines. Each shard holds a subset of the data.

```
             ┌──────────┐
Client ─────>│  mongos  │  (router)
             └────┬─────┘
      ┌───────────┼───────────┐
      ▼           ▼           ▼
  ┌───────┐  ┌───────┐  ┌───────┐
  │Shard 1│  │Shard 2│  │Shard 3│   ← each is a replica set
  └───────┘  └───────┘  └───────┘
             ┌──────────────┐
             │ config servers│  (metadata: which chunk lives where)
             └──────────────┘
```

### Choosing a shard key — the most important decision

A good shard key has:
1. **High cardinality** — many distinct values
2. **Even distribution** — no hot shard
3. **Query isolation** — most queries include the key, so they hit one shard

```js
// ❌ Bad: monotonically increasing → all writes hit the last shard
sh.shardCollection("db.orders", { createdAt: 1 });
sh.shardCollection("db.orders", { _id: 1 });     // ObjectId is time-ordered

// ❌ Bad: low cardinality → only 3 possible chunks
sh.shardCollection("db.orders", { status: 1 });

// ✅ Good: hashed for even distribution (but no range queries)
sh.shardCollection("db.orders", { userId: "hashed" });

// ✅ Better: compound — distributes AND supports common queries
sh.shardCollection("db.orders", { userId: 1, createdAt: -1 });
```

**Interview Tip:** The shard key is **immutable** (until 4.4 for values, 5.0 added refinement) and choosing badly is extremely expensive to fix — often requiring a full data migration. That's why it's the question interviewers dig into.

**Common Mistakes:** Sharding too early. A single well-indexed replica set handles a lot. Shard when your working set exceeds RAM or a single node's write throughput.

---

# Performance

## How do you optimise MongoDB performance?

### Answer

```js
// 1. Find slow queries
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);

// 2. Always explain
db.orders.find(query).explain("executionStats");
// Look for: COLLSCAN, high totalDocsExamined, SORT stage

// 3. Project only what you need
db.users.find({}, { name: 1, email: 1 });   // less network, less memory

// 4. Use .lean() in Mongoose for read-only

// 5. Avoid skip() for deep pagination — it scans everything skipped
db.posts.find().skip(100000).limit(20);              // ❌ scans 100,020 docs
db.posts.find({ _id: { $lt: lastId } }).limit(20);   // ✅ cursor pagination, O(limit)

// 6. Bulk operations instead of loops
for (const doc of docs) await db.c.insertOne(doc);   // ❌ N round trips
await db.c.insertMany(docs, { ordered: false });     // ✅ one

// 7. Index the fields you filter, sort and join on
// 8. Use $match early in aggregation pipelines
// 9. allowDiskUse for large aggregations (default true in 6.0+)
db.c.aggregate(pipeline, { allowDiskUse: true });

// 10. Connection pooling
mongoose.connect(uri, { maxPoolSize: 10, minPoolSize: 2 });
```

### The working set principle

MongoDB is fastest when your **working set** (frequently accessed data + indexes) fits in RAM. When it doesn't, every query hits disk.

```js
db.stats();                  // dataSize, indexSize
db.serverStatus().wiredTiger.cache;   // cache hit ratio
```

**Interview Tip:** *"Indexes must fit in RAM"* is the practical rule. If `db.stats().indexSize` exceeds available memory, performance falls off a cliff. That's when you shard or prune indexes.

---

# Rapid Fire

**What is BSON?**
Binary JSON — MongoDB's storage format. Adds types JSON lacks: `ObjectId`, `Date`, `Binary`, `Decimal128`, `Int32/64`.

**What is the max document size?**
16 MB. For larger data, use GridFS or object storage with a reference.

**What is GridFS?**
A convention for storing files over 16MB by splitting them into 255KB chunks across two collections. In practice, S3 is usually a better choice.

**What is a capped collection?**
A fixed-size collection with insertion-order guarantees that overwrites the oldest documents. Used for logs and the oplog.

**What is the oplog?**
The capped collection recording every write on the primary; secondaries tail it to replicate. Also what change streams read.

**What is a change stream?**
A real-time feed of database changes — `db.collection.watch()`. Used for cache invalidation, notifications, and CDC pipelines.

**What is WiredTiger?**
The default storage engine — document-level concurrency, compression, and a configurable cache (default 50% of RAM − 1GB).

**What is `$out` vs `$merge`?**
`$out` replaces the target collection entirely; `$merge` can insert, update or fail per document — the basis of materialised views.

**What is the aggregation memory limit?**
100 MB per stage by default; exceeded stages spill to disk when `allowDiskUse` is on (default in 6.0+).

**How do you do case-insensitive search?**
Create an index with `collation: { locale: 'en', strength: 2 }` and query with the same collation. Regex with `/i` cannot use a normal index efficiently.

**What is a covered query?**
One answered entirely from the index — the projection includes only indexed fields and excludes `_id` (or `_id` is in the index).

**What is the difference between `$push` and `$addToSet`?**
`$push` always appends; `$addToSet` appends only if the value isn't already present.

**What is `$setOnInsert`?**
Applies only when an upsert actually inserts — for `createdAt` on upserts.

**What is a TTL index?**
Automatically deletes documents N seconds after a date field. Used for sessions, OTPs and caches. Deletion runs roughly every 60 seconds.

**What is the difference between `updateOne` and `replaceOne`?**
`updateOne` applies operators to specific fields; `replaceOne` swaps the entire document (except `_id`).

**How do you handle schema migrations?**
Either a migration script (`migrate-mongo`) or lazy migration — read the old shape, write the new one, with a `schemaVersion` field.

**What is `$expr`?**
Lets you use aggregation expressions in a query, so you can compare two fields: `{ $expr: { $gt: ["$spent", "$budget"] } }`.

**What is the MongoDB Atlas Search?**
Lucene-based full-text search built into Atlas — far more capable than `$text` (fuzzy matching, autocomplete, faceting, relevance scoring).

**What is a hot shard?**
One shard receiving a disproportionate share of traffic because of a poor shard key — usually monotonically increasing values.

**How do you back up MongoDB?**
`mongodump`/`mongorestore` for small datasets; filesystem/volume snapshots for large ones; Atlas continuous backup with point-in-time restore.

**What is the difference between `find()` and `aggregate()`?**
`find` is a single-stage filter+projection; `aggregate` is a multi-stage pipeline that can group, join, reshape and compute.

**What is read/write concern `majority` protecting you from?**
Rollbacks — data acknowledged by only the primary can be lost if that primary fails before replicating.

---

## 📌 Interview Checklist

- [ ] When would you choose MongoDB over PostgreSQL, honestly?
- [ ] Embed vs reference — give three deciding factors
- [ ] Explain the ESR rule and the index prefix rule
- [ ] Read an `explain()` output and identify the problem
- [ ] What is a covered query and how do you create one?
- [ ] Write an aggregation with `$lookup`, `$group` and `$facet`
- [ ] When do you actually need a transaction?
- [ ] Pick a shard key for an orders collection and justify it
- [ ] Why is `skip()` bad for deep pagination, and what replaces it?
- [ ] What does `.lean()` do and when can't you use it?
