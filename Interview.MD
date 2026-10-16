# Senior Full-Stack Interview Questions & Practical Answers

> Interview-only preparation notes.  
> Scope: Senior React, JavaScript/TypeScript, Next.js, Node.js, MongoDB/PostgreSQL, AWS, practical coding, backend scaling, system design, security, Docker/CI-CD and Web3-related full-stack experience.  
> Excluded: recruiter mails, email replies, grammar corrections, job-application communication and unrelated conversations.

---

## 1. Senior Developer Introduction

### Q1. Tell me about yourself.

**Answer:**

I’m a Full Stack Developer with 7+ years of experience in technology and around 4 years of blockchain development experience. My main stack is React.js, Next.js, Node.js, TypeScript, PostgreSQL, MongoDB and REST APIs.

I have worked end-to-end on products, starting from requirements and architecture to frontend, backend, database, deployment and production support. I have also worked with Docker, Redis, CI/CD, VPS deployments and cloud services.

On the frontend, I mainly work with React, Next.js, TypeScript, Tailwind CSS and state management. On the backend, I work with Node.js, Express, REST APIs, PostgreSQL, MongoDB and Redis.

I have also worked on blockchain applications using Solidity, ethers.js and wagmi, including NFT, DeFi, credentials and Web3 applications.

Some products I have worked on include CoinTopper, SMB Market, AI Citizen and ImgKit. In ImgKit, I built a browser-based image-processing product where image operations happen on the client side, which improves privacy because images do not need to be uploaded to a server.

My strength is taking ownership of a feature or product from idea to production and solving problems across the full stack.

---

# 2. JavaScript Interview Questions

## Q2. What is the difference between `var`, `let` and `const`?

**Answer:**

- `var` is function-scoped and can be redeclared.
- `let` is block-scoped and can be reassigned.
- `const` is block-scoped and cannot be reassigned.

```js
var a = 10;
let b = 20;
const c = 30;

b = 40; // valid
// c = 40; // error
```

For modern JavaScript, I prefer `const` by default and `let` when reassignment is required.

---

## Q3. What is hoisting?

**Answer:**

Hoisting means JavaScript processes declarations before executing the code.

```js
console.log(a); // undefined
var a = 10;
```

`var` is hoisted and initialized with `undefined`.

`let` and `const` are also hoisted internally, but they remain in the Temporal Dead Zone until their declaration is executed.

---

## Q4. What is a closure?

**Answer:**

A closure happens when a function remembers variables from its outer lexical scope even after the outer function has finished executing.

```js
function counter() {
  let count = 0;

  return function () {
    count++;
    return count;
  };
}

const increment = counter();

console.log(increment()); // 1
console.log(increment()); // 2
```

Closures are commonly used for private state, callbacks, memoization and event handlers.

---

## Q5. What is the event loop?

**Answer:**

JavaScript is single-threaded, but asynchronous operations are handled through the runtime and event loop.

A simplified flow is:

1. Execute synchronous code.
2. Async operations are handled by the runtime.
3. Completed callbacks/promises are placed in queues.
4. The event loop moves queued work back to the call stack when it is available.

Promise callbacks use the microtask queue, which generally runs before timer callbacks.

---

## Q6. What is the difference between synchronous and asynchronous code?

**Answer:**

Synchronous code executes sequentially and waits for each operation.

Asynchronous code allows other work to continue while waiting for an operation such as an API request, file operation or timer.

```js
console.log("A");

setTimeout(() => {
  console.log("B");
}, 1000);

console.log("C");
```

Output:

```text
A
C
B
```

---

## Q7. Reverse a string in JavaScript.

```js
function reverseString(str) {
  return str.split("").reverse().join("");
}
```

Alternative:

```js
function reverseString(str) {
  let result = "";

  for (let i = str.length - 1; i >= 0; i--) {
    result += str[i];
  }

  return result;
}
```

---

## Q8. Check whether a string is a palindrome.

```js
function isPalindrome(str) {
  const reversed = str.split("").reverse().join("");
  return str === reversed;
}

console.log(isPalindrome("madam")); // true
```

For production code, normalization can be added for spaces and case.

---

## Q9. What is the difference between `==` and `===`?

**Answer:**

`==` performs type coercion.

`===` compares both value and type.

```js
5 == "5";  // true
5 === "5"; // false
```

I generally prefer `===` because it gives predictable comparisons.

---

## Q10. What are debounce and throttle?

**Answer:**

**Debounce:** waits until the user stops triggering an event.

Useful for:

- Search input
- API calls
- Form validation

**Throttle:** limits execution to once within a fixed interval.

Useful for:

- Scroll events
- Resize events
- Mouse movement

---

# 3. React Interview Questions

## Q11. What is React?

**Answer:**

React is a JavaScript library for building user interfaces using reusable components. It uses a declarative programming model and efficiently updates the UI based on state and props.

---

## Q12. What is the Virtual DOM?

**Answer:**

The Virtual DOM is an in-memory representation of the UI.

When state changes:

1. React creates a new virtual representation.
2. React compares it with the previous representation.
3. It determines the required changes.
4. React updates the actual DOM efficiently.

This comparison process is called reconciliation.

---

## Q13. What is reconciliation?

**Answer:**

Reconciliation is React's process of comparing the previous component tree with the new component tree to determine what needs to change in the UI.

Keys are important because they help React identify elements across renders.

---

## Q14. Why are keys required in React lists?

```jsx
users.map(user => (
  <User key={user.id} user={user} />
))
```

Keys provide stable identity to list elements.

Using array indexes as keys can cause incorrect UI behavior when items are inserted, removed or reordered.

---

## Q15. Props vs state?

**Answer:**

**Props:**
- Passed from parent to child.
- Read-only from the child's perspective.
- Used to configure components.

**State:**
- Managed by a component or hook.
- Changes cause re-rendering.
- Represents dynamic UI data.

---

## Q16. What is `useEffect`?

**Answer:**

`useEffect` is used to synchronize a component with external systems or perform side effects.

Examples:

- API requests
- Event listeners
- Timers
- Subscriptions

```jsx
useEffect(() => {
  fetchUsers();
}, []);
```

The dependency array controls when the effect runs.

---

## Q17. What is `useMemo`?

**Answer:**

`useMemo` memoizes the result of an expensive calculation.

```jsx
const filteredUsers = useMemo(() => {
  return users.filter(user => user.active);
}, [users]);
```

It should not be used everywhere. I use it when the calculation is expensive or when stable references help avoid unnecessary work.

---

## Q18. What is `useCallback`?

**Answer:**

`useCallback` memoizes a function reference.

```jsx
const handleClick = useCallback(() => {
  saveUser(id);
}, [id]);
```

It can be useful when passing callbacks to memoized child components or when a stable function reference is required.

---

## Q19. `useMemo` vs `useCallback`?

**Answer:**

- `useMemo` memoizes a **value**.
- `useCallback` memoizes a **function**.

```jsx
useMemo(() => expensiveCalculation(), [data]);

useCallback(() => handleSave(), [data]);
```

---

## Q20. How do you optimize a React application?

**Answer:**

I first measure the bottleneck instead of optimizing blindly.

Typical approaches:

- Code splitting and lazy loading.
- Memoize expensive calculations where useful.
- Avoid unnecessary state updates.
- Use stable keys.
- Virtualize large lists.
- Optimize images.
- Reduce unnecessary re-renders.
- Keep component state close to where it is used.
- Cache API responses where appropriate.
- Use pagination instead of loading huge datasets.
- Analyze bundle size.
- Move expensive processing to Web Workers when appropriate.

---

## Q21. How would you handle a large list of 100,000 records?

**Answer:**

I would not render all records at once.

I would use:

1. Server-side pagination or cursor pagination.
2. Virtualized rendering on the frontend.
3. Search/filtering on the backend.
4. Proper database indexes.
5. API response limits.
6. Caching for frequently requested data.

For example, React virtualization can render only the visible rows.

---

# 4. Next.js Interview Questions

## Q22. What is Next.js?

**Answer:**

Next.js is a React framework that provides features such as routing, server rendering, static generation, Server Components, API/route handlers, image optimization, metadata/SEO support and application-level performance optimizations.

---

## Q23. App Router vs Pages Router?

**Answer:**

The App Router uses the `app` directory and supports modern React features such as Server Components, nested layouts and streaming.

The Pages Router uses the `pages` directory and APIs such as `getServerSideProps` and `getStaticProps`.

For new applications, I generally prefer the App Router unless an existing project is already based on Pages Router.

---

## Q24. What are Server Components?

**Answer:**

Server Components execute on the server and their component logic does not need to be shipped to the browser as client-side JavaScript.

Benefits include:

- Smaller client bundles.
- Direct server-side data access where appropriate.
- Better initial rendering.
- Reduced client JavaScript.

Interactive components that require browser APIs, state or event handlers need to be Client Components.

---

## Q25. Server Component vs Client Component?

**Answer:**

A Server Component is appropriate for:

- Data fetching.
- Server-side rendering.
- Static or non-interactive UI.

A Client Component is required when we need:

- `useState`
- `useEffect`
- Browser APIs
- Event handlers
- Interactive UI

```jsx
"use client";

import { useState } from "react";
```

---

## Q26. SSR vs SSG vs ISR?

**Answer:**

**SSR:** page is generated on the server for a request.

**SSG:** page is generated ahead of time.

**ISR:** a static page can be regenerated after a configured period or through revalidation.

I choose based on how frequently the data changes and whether request-time data is required.

---

## Q27. How do you improve Next.js performance?

**Answer:**

- Use Server Components where possible.
- Keep Client Components small.
- Optimize images.
- Use dynamic imports for heavy components.
- Cache/revalidate data appropriately.
- Use pagination.
- Avoid unnecessary client-side API calls.
- Reduce JavaScript bundle size.
- Use streaming/Suspense where useful.
- Optimize database queries and indexes.
- Use CDN/caching for static assets.

---

## Q28. How do you handle SEO in Next.js?

**Answer:**

I focus on:

- Correct metadata.
- Title and description.
- Canonical URLs.
- Open Graph metadata.
- Semantic HTML.
- Server-rendered content where useful.
- XML sitemaps.
- Robots configuration.
- Clean SEO-friendly URLs.
- Structured data when appropriate.
- Fast page loading and Core Web Vitals.

---

## Q29. Why can a Next.js page perform a full reload during navigation?

**Answer:**

Common causes include:

- Using a normal `<a>` where client navigation is expected.
- Navigating to an external URL.
- Incorrect routing structure.
- Mixing router implementations incorrectly.
- Browser-level redirects.
- Middleware/server redirects depending on the flow.

For internal App Router navigation, I normally use `next/link` or the appropriate Next.js router APIs.

---

# 5. Node.js Interview Questions

## Q30. What is Node.js?

**Answer:**

Node.js is a JavaScript runtime based on the V8 engine. It is designed around an event-driven, non-blocking I/O model, which makes it suitable for APIs, real-time applications and I/O-heavy workloads.

---

## Q31. Is Node.js single-threaded?

**Answer:**

JavaScript execution in a Node.js process is primarily single-threaded, but Node.js can use the runtime, operating-system facilities and worker threads/thread pools for certain operations.

So saying "Node.js can only use one CPU core" is an oversimplification.

---

## Q32. How do you scale a Node.js backend?

**Answer:**

I use multiple layers:

**Application:**
- Stateless services.
- Horizontal scaling.
- Load balancing.
- Process/container scaling.

**Database:**
- Indexes.
- Query optimization.
- Connection pooling.
- Read replicas where needed.
- Appropriate partitioning/sharding for very large workloads.

**Caching:**
- Redis.
- HTTP/CDN caching.

**Async processing:**
- Queues.
- Background workers.
- Event-driven processing.

**Infrastructure:**
- Docker.
- CI/CD.
- Monitoring.
- Auto scaling.

---

## Q33. What is middleware in Express?

**Answer:**

Middleware is a function that runs during the request-response lifecycle.

```js
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
```

Typical middleware handles:

- Authentication.
- Authorization.
- Logging.
- Validation.
- Error handling.
- Rate limiting.

---

## Q34. How do you handle errors in Node.js APIs?

**Answer:**

I use centralized error handling.

```js
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error"
  });
});
```

I also validate inputs, avoid exposing internal errors to clients and log enough information for debugging.

---

## Q35. How do you secure a Node.js API?

**Answer:**

- Validate and sanitize input.
- Use authentication and authorization.
- Use secure cookies where appropriate.
- Protect against XSS.
- Use CSRF protection where applicable.
- Rate-limit sensitive endpoints.
- Use HTTPS.
- Store secrets in environment/secret management systems.
- Avoid SQL/NoSQL injection through parameterized queries and safe query construction.
- Apply proper CORS rules.
- Do not expose stack traces or secrets.
- Keep dependencies updated.

---

# 6. MongoDB vs PostgreSQL

## Q36. MongoDB vs PostgreSQL — which would you choose?

**Answer:**

I choose based on the data model and workload rather than saying one is always better.

**PostgreSQL is a strong choice when:**
- Data is relational.
- Transactions are important.
- Relationships and joins are common.
- Complex SQL queries are required.
- Strong consistency and constraints are important.

**MongoDB is useful when:**
- The data is naturally document-oriented.
- Schema flexibility is valuable.
- Documents are commonly accessed as a unit.
- Rapidly changing document structures are expected.

For transactional business systems with relationships, I generally prefer PostgreSQL. For document-oriented data with flexible structures, MongoDB can be a good fit.

---

## Q37. Why did you use both MongoDB and PostgreSQL?

**Answer:**

Different parts of a product can have different data requirements.

For example, in a content-heavy platform, MongoDB can be useful for flexible content-oriented data, while PostgreSQL can be better for structured relational data such as users, Q&A relationships, permissions and transactional workflows.

The decision should be based on access patterns, consistency requirements, relationships and operational complexity.

---

## Q38. How do database indexes improve performance?

**Answer:**

An index creates an additional data structure that helps the database find records without scanning the entire table/collection.

For example:

```sql
CREATE INDEX idx_users_email ON users(email);
```

But indexes also have costs:

- Additional storage.
- Slower writes.
- Maintenance overhead.

Therefore, I add indexes based on actual query patterns.

---

## Q39. How would you optimize a slow SQL query?

**Answer:**

I would:

1. Reproduce the slow query.
2. Check the execution plan using `EXPLAIN` / `EXPLAIN ANALYZE`.
3. Check indexes.
4. Look for unnecessary joins.
5. Avoid selecting unused columns.
6. Check filtering and sorting.
7. Check row counts and cardinality.
8. Consider pagination.
9. Check locking/contention.
10. Re-measure after changes.

---

# 7. PostgreSQL / SQL Practical Questions

## Q40. Find duplicate emails.

```sql
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## Q41. Get the second-highest salary.

```sql
SELECT MAX(salary)
FROM employees
WHERE salary < (
  SELECT MAX(salary)
  FROM employees
);
```

---

## Q42. What is a transaction?

**Answer:**

A transaction groups multiple database operations into one logical unit.

Typical properties are ACID:

- Atomicity
- Consistency
- Isolation
- Durability

For example, transferring money requires debit and credit to succeed together.

---

# 8. Redis / Caching

## Q43. Why use Redis?

**Answer:**

Redis is an in-memory data store commonly used for:

- Caching.
- Sessions.
- Rate limiting.
- Distributed locks.
- Queues/streams depending on architecture.
- Temporary data.

---

## Q44. How would you implement API caching?

**Answer:**

A simple strategy:

```text
Request
   ↓
Check Redis
   ↓
Cache hit → return data
   ↓
Cache miss
   ↓
Query database
   ↓
Store result in Redis with TTL
   ↓
Return response
```

I would also define invalidation rules carefully because stale data is one of the main challenges with caching.

---

# 9. AWS Interview Questions

## Q45. What AWS services have you worked with?

**Answer:**

My AWS knowledge is practical but I would describe myself as stronger in application development and deployment than deep AWS infrastructure architecture.

I understand common services and deployment concepts such as EC2, S3, IAM, networking, containers, CI/CD and cloud deployment patterns. I am comfortable working with Docker and deployment pipelines, but I would not claim deep hands-on expertise across every AWS service.

---

## Q46. EC2 vs ECS?

**Answer:**

**EC2** provides virtual machines where we manage the server environment.

**ECS** is a container orchestration service for running Docker containers.

With ECS, AWS manages more of the orchestration layer, while EC2 gives more direct control over the underlying machine.

---

## Q47. What is S3?

**Answer:**

Amazon S3 is object storage.

Typical use cases:

- Images.
- Videos.
- Documents.
- Backups.
- Static assets.

Applications generally store the object in S3 and save its key/URL in the database.

---

## Q48. What is IAM?

**Answer:**

IAM controls access to AWS resources.

It uses concepts such as:

- Users.
- Roles.
- Policies.
- Permissions.

For applications running on AWS, I prefer IAM roles over hard-coded access keys whenever possible.

---

## Q49. How would you deploy a Node.js application on AWS?

**Answer:**

One possible architecture:

```text
User
 ↓
Route 53
 ↓
Load Balancer
 ↓
ECS / EC2
 ↓
Node.js containers
 ↓
Redis
 ↓
PostgreSQL / RDS
 ↓
S3 for files
```

CI/CD can build the Docker image, push it to a container registry and deploy the new version.

---

## Q50. How would you scale an AWS application?

**Answer:**

I would identify the bottleneck first.

Possible improvements:

- Load balancer.
- Horizontal application scaling.
- Auto Scaling.
- ECS/EKS depending on requirements.
- RDS scaling/read replicas.
- Redis caching.
- S3/CDN for static files.
- Queue-based background processing.
- Database indexing and query optimization.
- Monitoring and alerting.

---

# 10. Docker / CI-CD

## Q51. Why use Docker?

**Answer:**

Docker packages an application and its dependencies into a consistent environment.

Benefits:

- Environment consistency.
- Easier deployment.
- Isolation.
- Reproducibility.
- Easier scaling.
- Works well with CI/CD.

---

## Q52. What is a CI/CD pipeline?

**Answer:**

A typical pipeline is:

```text
Git push
 ↓
Install dependencies
 ↓
Lint
 ↓
Unit tests
 ↓
Build
 ↓
Docker image
 ↓
Push image
 ↓
Deploy
 ↓
Health check
```

The exact pipeline depends on the project.

---

# 11. Authentication and Security

## Q53. JWT authentication — explain the flow.

**Answer:**

A typical flow:

```text
Login
 ↓
Validate credentials
 ↓
Generate access token
 ↓
Client sends token
 ↓
Middleware validates token
 ↓
Request reaches protected API
```

For higher security, access and refresh tokens can have different lifetimes. Refresh-token storage should be designed carefully, and secure HTTP-only cookies can be used where appropriate.

---

## Q54. What is XSS?

**Answer:**

Cross-Site Scripting happens when an attacker injects malicious script into content that is executed in another user's browser.

Prevention includes:

- Escaping output.
- Sanitizing HTML when HTML is intentionally allowed.
- Avoiding unsafe DOM APIs.
- Content Security Policy where appropriate.
- Secure framework defaults.

---

## Q55. What is CSRF?

**Answer:**

CSRF tricks an authenticated browser into sending an unwanted request to a website.

Protection can include:

- SameSite cookies.
- CSRF tokens.
- Origin/Referer validation where appropriate.
- Proper authentication architecture.

---

## Q56. What are secure cookies?

**Answer:**

Important cookie attributes include:

- `HttpOnly` — prevents JavaScript access.
- `Secure` — sends the cookie over HTTPS.
- `SameSite` — controls cross-site cookie behavior.

---

# 12. REST API Design

## Q57. How do you design a good REST API?

**Answer:**

I focus on:

- Resource-oriented URLs.
- Correct HTTP methods.
- Consistent status codes.
- Request validation.
- Pagination.
- Filtering/sorting.
- Authentication and authorization.
- Consistent error responses.
- Idempotency for operations where required.
- Versioning when needed.
- Logging and monitoring.

Example:

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

---

## Q58. Offset pagination vs cursor pagination?

**Answer:**

Offset pagination is simple:

```text
?page=2&limit=20
```

But for very large datasets, deep offsets can become expensive.

Cursor pagination uses a stable position:

```text
?cursor=abc123&limit=20
```

Cursor pagination is often better for large or frequently changing datasets.

---

# 13. System Design / Senior-Level Questions

## Q59. Design a scalable marketplace.

**Answer:**

I would separate major responsibilities:

```text
Frontend
   ↓
API Gateway / Load Balancer
   ↓
Backend Services
   ├── Auth
   ├── Users
   ├── Listings
   ├── Search
   ├── Deals
   └── Notifications
        ↓
 PostgreSQL
 Redis
 Search Index
 Object Storage
 Queue
```

Important considerations:

- Database indexes.
- Search indexing.
- Redis caching.
- Pagination.
- Async jobs.
- Rate limiting.
- Authentication/authorization.
- Monitoring.
- Horizontal scaling.

I would not start with microservices automatically. I would first understand domain boundaries and traffic requirements.

---

## Q60. When would you use microservices?

**Answer:**

I would consider microservices when there are clear domain boundaries, independent scaling requirements, different deployment lifecycles or organizational reasons.

I would avoid splitting a small application into many services because it increases:

- Operational complexity.
- Network communication.
- Debugging complexity.
- Deployment overhead.
- Monitoring requirements.

A modular monolith can be a better starting point.

---

## Q61. When would you use Kafka or a message queue?

**Answer:**

For work that does not need to block the user's request or for event-driven workflows.

Examples:

```text
Order created
 ↓
Publish event
 ↓
 ├── Send email
 ├── Update analytics
 ├── Generate invoice
 └── Notification
```

This keeps the main request path fast and allows consumers to process tasks independently.

---

## Q62. How would you handle millions of API requests?

**Answer:**

I would scale in layers:

```text
CDN
 ↓
Load Balancer
 ↓
Multiple API instances
 ↓
Redis
 ↓
Database
```

Then:

- Cache hot data.
- Optimize queries.
- Add proper indexes.
- Use connection pooling.
- Use database replicas where useful.
- Move expensive tasks to queues.
- Rate-limit abusive clients.
- Monitor latency, errors and saturation.
- Scale horizontally.

---

# 14. Practical React Assessment

## Q63. Build a searchable user list.

**Requirements:**

- React/Next.js.
- Search.
- Pagination.
- Loading state.
- Error state.
- Empty state.
- Debounced search.

**Approach:**

```text
Search input
 ↓
Debounce
 ↓
API request
 ↓
Loading
 ↓
Render results
 ↓
Pagination
```

Important edge cases:

- Cancel/ignore stale requests.
- Empty search results.
- API failure.
- Rapid typing.
- Pagination reset after search.

---

## Q64. How would you prevent stale search responses?

**Answer:**

Use `AbortController` or request IDs.

```js
const controller = new AbortController();

fetch(`/api/users?q=${query}`, {
  signal: controller.signal
});

return () => controller.abort();
```

This prevents older requests from incorrectly updating the latest UI state.

---

# 15. Practical Node.js Assessment

## Q65. Build a CRUD API.

**Expected structure:**

```text
src/
  controllers/
  services/
  repositories/
  routes/
  middleware/
  validators/
  utils/
  app.js
  server.js
```

Flow:

```text
Route
 ↓
Validation
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database
```

This separation makes the code easier to test and maintain.

---

# 16. Practical Full-Stack Assessment

## Q66. Design a Community Events Board.

**Requirements:**

- Next.js App Router.
- Admin login.
- Create events.
- Edit/delete events.
- List events.
- Search/filter.
- Database.
- Responsive UI.

**Architecture:**

```text
Next.js
 ├── App Router
 ├── Server Components
 └── Client Components
        ↓
API / Server Actions
        ↓
Service Layer
        ↓
Database
```

For a small assignment, hard-coded admin credentials may be acceptable if explicitly allowed, but production authentication should use a proper identity/authentication system.

---

# 17. Image Processing / WebAssembly

## Q67. Why is browser-based image processing useful?

**Answer:**

Processing images in the browser can provide:

- Better privacy.
- Reduced server bandwidth.
- Lower infrastructure cost.
- Faster local processing for suitable operations.
- No need to upload sensitive images.

This is the approach used in ImgKit for browser-based image tools.

---

## Q68. What is WebAssembly?

**Answer:**

WebAssembly, or Wasm, is a low-level binary instruction format that runs in modern browsers and other runtimes.

It can be useful for CPU-intensive operations such as:

- Image processing.
- Video processing.
- Compression.
- Cryptography.
- Computational algorithms.

A JavaScript application can call WebAssembly modules when performance-intensive processing is better suited to compiled code.

---

# 18. Web3 / Blockchain Full-Stack Questions

## Q69. How does a frontend interact with a blockchain?

**Answer:**

A common flow is:

```text
React / Next.js
 ↓
wagmi / ethers.js
 ↓
Wallet
 ↓
RPC provider
 ↓
Blockchain
 ↓
Smart contract
```

The frontend prepares contract calls, the wallet signs transactions and the transaction is submitted through an RPC provider.

---

## Q70. What is the difference between a blockchain transaction and a read call?

**Answer:**

A read call retrieves blockchain state and normally does not require a wallet signature or gas payment.

A write transaction changes blockchain state and requires signing and gas.

---

# 19. Senior Debugging Questions

## Q71. Production API is slow. How do you debug it?

**Answer:**

I would avoid immediately changing code.

I would check:

1. Request latency.
2. Application logs.
3. Database query duration.
4. External API latency.
5. CPU/memory.
6. Redis/cache hit rate.
7. Network latency.
8. Recent deployments.
9. Error rate.
10. Database locks/connections.

Then identify the actual bottleneck and measure again after the fix.

---

## Q72. React page is rendering too many times. What do you check?

**Answer:**

I check:

- Parent re-renders.
- State updates.
- Context updates.
- Effect dependencies.
- New object/function references.
- Missing memoization where useful.
- Incorrect component structure.
- Development Strict Mode behavior.

I use React DevTools Profiler to identify the actual source rather than adding `memo`, `useMemo` or `useCallback everywhere.

---

# 20. Senior Architecture Principles

## Q73. How do you decide between simplicity and scalability?

**Answer:**

I start with the simplest architecture that can satisfy current requirements.

Then I identify expected bottlenecks and make the architecture extensible.

I avoid premature microservices and infrastructure complexity. At the same time, I design clear boundaries, database indexes, caching interfaces and background-job boundaries so the system can evolve.

---

## Q74. What makes someone a senior developer?

**Answer:**

For me, seniority is not only knowing more technologies.

It means being able to:

- Understand requirements.
- Make technical trade-offs.
- Design maintainable systems.
- Debug production issues.
- Think about security and performance.
- Communicate decisions clearly.
- Review code.
- Take ownership.
- Understand business impact.
- Know when not to over-engineer.

---

# 21. Rapid-Fire Questions

## Q75. REST vs GraphQL?

**Answer:**

REST uses resource-oriented endpoints. GraphQL lets clients request the exact data shape they need.

REST is often simpler for standard APIs. GraphQL can be useful when clients have complex or different data requirements.

---

## Q76. SQL vs NoSQL?

**Answer:**

SQL databases are strong for relational, transactional and structured data.

NoSQL databases can be useful for flexible or document-oriented data and specific high-scale access patterns.

---

## Q77. Authentication vs authorization?

**Answer:**

Authentication asks: **Who are you?**

Authorization asks: **What are you allowed to do?**

---

## Q78. 401 vs 403?

**Answer:**

- `401 Unauthorized`: authentication is missing or invalid.
- `403 Forbidden`: the user is authenticated but does not have permission.

---

## Q79. 400 vs 422?

**Answer:**

`400` generally means the request is invalid.

`422` is commonly used when the request structure is understood but validation/business rules reject the provided data.

---

## Q80. What is idempotency?

**Answer:**

An operation is idempotent if making the same request multiple times has the same intended final effect as making it once.

This is important for payment/order APIs and retry-safe distributed systems.

---

# 22. Practical Interview Checklist

### React

- [ ] Components
- [ ] Props/state
- [ ] Hooks
- [ ] useEffect
- [ ] useMemo/useCallback
- [ ] Context
- [ ] Rendering
- [ ] Reconciliation
- [ ] Keys
- [ ] Performance
- [ ] Large lists
- [ ] Error/loading states

### JavaScript

- [ ] Closures
- [ ] Hoisting
- [ ] Scope
- [ ] Event loop
- [ ] Promises
- [ ] async/await
- [ ] Microtasks/macrotasks
- [ ] Debounce/throttle
- [ ] Array methods
- [ ] String problems
- [ ] Objects
- [ ] `this`

### Next.js

- [ ] App Router
- [ ] Pages Router
- [ ] Server Components
- [ ] Client Components
- [ ] SSR
- [ ] SSG
- [ ] ISR
- [ ] Routing
- [ ] Metadata
- [ ] SEO
- [ ] Caching
- [ ] Performance
- [ ] Middleware

### Node.js

- [ ] Event loop
- [ ] Express
- [ ] Middleware
- [ ] REST API
- [ ] Authentication
- [ ] Authorization
- [ ] Validation
- [ ] Error handling
- [ ] Scaling
- [ ] Queues
- [ ] Redis
- [ ] Logging

### Database

- [ ] PostgreSQL
- [ ] MongoDB
- [ ] Indexes
- [ ] Transactions
- [ ] Joins
- [ ] Query optimization
- [ ] EXPLAIN
- [ ] Pagination
- [ ] Connection pooling
- [ ] Redis caching

### AWS

- [ ] EC2
- [ ] ECS
- [ ] S3
- [ ] IAM
- [ ] Load Balancer
- [ ] RDS
- [ ] Cloud deployment
- [ ] Scaling
- [ ] Monitoring

### DevOps

- [ ] Docker
- [ ] CI/CD
- [ ] GitHub Actions
- [ ] Nginx
- [ ] PM2
- [ ] VPS
- [ ] Deployment
- [ ] Environment variables

### Security

- [ ] XSS
- [ ] CSRF
- [ ] Secure cookies
- [ ] JWT
- [ ] CORS
- [ ] Rate limiting
- [ ] Input validation
- [ ] SQL/NoSQL injection
- [ ] Secrets management

### System Design

- [ ] Load balancing
- [ ] Horizontal scaling
- [ ] Caching
- [ ] Queues
- [ ] Event-driven architecture
- [ ] Microservices
- [ ] Modular monolith
- [ ] Database scaling
- [ ] Search
- [ ] Monitoring

---

# 23. Best Senior Interview Answer Pattern

For architecture and practical questions, answer using this structure:

### 1. Clarify the requirement

Explain what the system needs to achieve.

### 2. Start with the simplest solution

Do not immediately over-engineer.

### 3. Explain the architecture

```text
Client
 ↓
API
 ↓
Service
 ↓
Database
```

### 4. Discuss scale

Explain what changes when traffic/data grows.

### 5. Discuss failure cases

Mention:

- API failures.
- Database failures.
- Timeouts.
- Retries.
- Duplicate requests.
- Stale cache.
- Partial failures.

### 6. Discuss security

Mention:

- Authentication.
- Authorization.
- Input validation.
- Secure cookies/tokens.
- Rate limiting.
- Secrets.

### 7. Discuss observability

Mention:

- Logs.
- Metrics.
- Tracing where appropriate.
- Alerts.
- Error monitoring.

### 8. Explain trade-offs

A senior answer should explain **why** you selected the approach and what you would change at larger scale.

---

# 24. Practical Coding Problems to Practice

1. Reverse a string.
2. Check palindrome.
3. Find duplicate values in an array.
4. Find the second-largest number.
5. Count character frequency.
6. Remove duplicates from an array.
7. Flatten a nested array.
8. Implement debounce.
9. Implement throttle.
10. Implement a simple cache.
11. Implement pagination.
12. Build a searchable React table.
13. Build a CRUD API.
14. Implement JWT authentication.
15. Add Redis caching to an API.
16. Design a rate limiter.
17. Optimize a slow PostgreSQL query.
18. Design a scalable Node.js API.
19. Design a marketplace.
20. Design a notification system.
21. Design a file/image-processing service.
22. Design an event-driven system.
23. Build a Next.js App Router application.
24. Implement protected routes.
25. Implement optimistic UI updates.

---

# 25. Final Interview Reminder

For senior interviews, do not only give definitions.

Use this pattern:

**Concept → Real project example → Trade-off → Production consideration**

Example:

> "I would use Redis for caching frequently accessed data. In a production system, I would define a TTL and an invalidation strategy. I would also monitor cache hit rate because caching without an invalidation strategy can return stale data."

This demonstrates practical senior-level thinking instead of only theoretical knowledge.
