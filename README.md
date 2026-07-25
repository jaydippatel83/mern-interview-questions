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
| 8 | Database | [Database/](Database/) | MongoDB, SQL, PostgreSQL, Redis |
| 9 | System Design | [System-Design/](System-Design/) | Scaling, caching, queues, HLD/LLD case studies |
| 10 | AWS | [AWS/](AWS/) | EC2, S3, IAM, CloudFront, ALB, Route53, Lambda, VPC |
| 11 | Docker | [Docker/](Docker/) | Images, layers, compose, networking, Kubernetes basics |
| 12 | CI/CD | [CI-CD/](CI-CD/) | GitHub Actions, Jenkins, build/test/deploy/rollback |
| 13 | Deployment | [Deployment/](Deployment/) | Nginx, PM2, SSL, VPS, DNS, reverse proxy |
| 14 | Git | [Git/](Git/) | Branching, rebase, merge, conflicts, workflows |
| 15 | DSA | [DSA/](DSA/) | Arrays, strings, linked list, trees, graphs, DP |
| 16 | HR & Behavioral | [HR/](HR/) | STAR answers, salary negotiation, culture fit |

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

## 🎯 Coverage Targets

| Topic | Target |
|-------|--------|
| HTML | 50+ questions |
| CSS | 120+ questions |
| JavaScript | 300+ questions + 150+ coding problems |
| TypeScript | 120+ questions |
| React | 250+ questions |
| Next.js | 180+ questions |
| Node.js | 250+ questions |
| Express.js | 100+ questions |
| MongoDB | 150+ questions |
| SQL / PostgreSQL | 200+ questions |
| Redis | 60+ questions |
| System Design | 100+ questions |
| Git | 80+ questions |
| AWS | 150+ questions |
| Docker | 100+ questions |
| CI/CD | 80+ questions |
| Deployment | 80+ questions |
| DSA | 250+ coding problems |
| HR & Behavioral | 100+ questions |

**Goal:** 3,000+ interview questions with hundreds of practical, runnable examples.

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
