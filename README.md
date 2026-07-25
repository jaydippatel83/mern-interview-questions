# 🚀 Full Stack Developer Interview Handbook

Everything required to crack **Frontend + Full Stack** interviews — theory, questions, answers, coding problems and real-world examples, organized topic-wise so it is easy to revise the night before an interview.

---

## 📚 Topics

| # | Topic | Folder | Contents |
|---|-------|--------|----------|
| 1 | HTML | [HTML/](HTML/) | Semantics, forms, accessibility, SEO, storage |
| 2 | CSS | [CSS/](CSS/) | Box model, Flexbox, Grid, responsive, animations, architecture |
| 3 | JavaScript | [JavaScript/](JavaScript/) | Core JS, async, closures, prototypes, polyfills, 150+ programs |
| 4 | TypeScript | [TypeScript/](TypeScript/) | Types, generics, utility types, decorators, config |
| 5 | React | [React/](React/) | Core, hooks, performance, patterns, coding rounds |
| 6 | Next.js | [NextJS/](NextJS/) | App Router, SSR/SSG/ISR, Server Actions, caching |
| 7 | Node.js | [NodeJS/](NodeJS/) | Event loop, streams, clustering, Express, auth |
| 8 | GraphQL | [GraphQL/](GraphQL/) | Schema, resolvers, N+1/DataLoader, subscriptions, Apollo |
| 9 | Database | [Database/](Database/) | MongoDB, SQL, PostgreSQL, Redis |
| 10 | System Design | [System-Design/](System-Design/) | Scaling, caching, queues, HLD/LLD case studies |
| 11 | AWS | [AWS/](AWS/) | EC2, S3, IAM, CloudFront, ALB, Route53, Lambda, VPC |
| 12 | Docker | [Docker/](Docker/) | Images, layers, compose, networking, Kubernetes basics |
| 13 | CI/CD | [CI-CD/](CI-CD/) | GitHub Actions, Jenkins, build/test/deploy/rollback |
| 14 | Deployment | [Deployment/](Deployment/) | Nginx, PM2, SSL, VPS, DNS, reverse proxy |
| 15 | Git | [Git/](Git/) | Branching, rebase, merge, conflicts, workflows |
| 16 | DSA | [DSA/](DSA/) | Arrays, strings, linked list, trees, graphs, DP |
| 17 | HR & Behavioral | [HR/](HR/) | STAR answers, salary negotiation, culture fit |

---

## 🗂️ Repository Structure

```
mern-interview-questions/
│
├── README.md
│
├── HTML/
│   └── html-interview.md
│
├── CSS/
│   └── css-interview.md
│
├── JavaScript/
│   ├── js-interview.md
│   ├── array-programs.js
│   ├── string-programs.js
│   ├── object-programs.js
│   ├── promise-programs.js
│   ├── polyfills.js
│   └── interview-programs.js
│
├── TypeScript/
│   └── typescript-interview.md
│
├── React/
│   ├── react-interview.md
│   ├── hooks.md
│   ├── performance.md
│   └── coding-questions.jsx
│
├── NextJS/
│   └── nextjs-interview.md
│
├── NodeJS/
│   ├── node-interview.md
│   ├── express-interview.md
│   ├── authentication.md
│   └── coding.js
│
├── GraphQL/
│   └── graphql-interview.md
│
├── Database/
│   ├── mongodb.md
│   ├── sql.md
│   ├── postgresql.md
│   └── redis.md
│
├── System-Design/
│   └── system-design.md
│
├── AWS/
│   └── aws-interview.md
│
├── Docker/
│   └── docker.md
│
├── CI-CD/
│   └── cicd.md
│
├── Deployment/
│   └── deployment.md
│
├── Git/
│   └── git-interview.md
│
├── DSA/
│   ├── arrays.js
│   ├── strings.js
│   ├── linked-list.js
│   └── trees.js
│
└── HR/
    └── hr-interview.md
```

---

## ✍️ Question Format

Every question in this handbook follows the same shape, so revision is fast and predictable:

````markdown
## What is useMemo?

### Answer

`useMemo` caches the **result** of a computation between renders...

### Why do we use it?

To avoid re-running expensive calculations on every render...

### When should we use it?

Only when the computation is measurably expensive or the value feeds a
referential-equality check (`React.memo`, dependency arrays)...

### Example

```jsx
const sorted = useMemo(() => items.sort(cmp), [items]);
```

**Interview Tip:** ...

**Common Mistakes:** ...
````

---

## 📊 Current Status

All 16 topics are covered end to end.

| | Count |
|---|---|
| Topics covered | **17 / 17** ✅ |
| Total lines | ~35,000 |
| Detailed Q&As (full format) | 460+ |
| Rapid-fire Q&As | 440+ |
| Code examples | 700+ |
| **Interview Tips** | 395+ |
| **Common Mistakes** callouts | 185+ |
| Executable programs | 11 files |
| Passing tests | **223** |

Every `.js` file runs with `node <file>` and prints verified output.
The DSA files ship with their own test suites:

```bash
node DSA/arrays.js        # 52 passed
node DSA/strings.js       # 55 passed
node DSA/linked-list.js   # 52 passed
node DSA/trees.js         # 64 passed
```

---

## 🎯 Expansion Targets

Each topic currently covers the **most-asked** questions in depth. Long-term goal per topic:

| Topic | Target | | Topic | Target |
|-------|--------|---|-------|--------|
| HTML | 50+ | | AWS | 150+ |
| CSS | 120+ | | Docker | 100+ |
| JavaScript | 300+ & 150 programs | | CI/CD | 80+ |
| TypeScript | 120+ | | Deployment | 80+ |
| React | 250+ | | Git | 80+ |
| Next.js | 180+ | | MongoDB | 150+ |
| Node.js | 250+ | | SQL / PostgreSQL | 200+ |
| Express.js | 100+ | | Redis | 60+ |
| GraphQL | 120+ | | DSA | 250+ problems |
| System Design | 100+ | | HR & Behavioral | 100+ |

**Goal:** 3,000+ interview questions. Per-topic expansion passes and contributions welcome.

---

## 🧭 How to Use This Repo

1. **Two weeks out** — read the whole `md` file for each topic on your stack, top to bottom.
2. **One week out** — solve the `.js` / `.jsx` coding files without looking at the answers.
3. **Night before** — read only the **Interview Tip** and **Common Mistakes** lines. They are the highest-yield 20 minutes you can spend.
4. **After every interview** — add the questions you were asked back into this repo. That is what turns it from notes into a handbook.

---

## 🤝 Contributing

Adding a question? Keep the format identical:

- `##` for the question
- `### Answer`, `### Why do we use it?`, `### When should we use it?`, `### Example`
- End with **Interview Tip** and **Common Mistakes**
- Every code block must be runnable / copy-paste-able

Commit convention: `feat: added <topic> interview questions`

---

## 📄 License

MIT — free to use, fork and share. If it helped you land a job, star it ⭐
