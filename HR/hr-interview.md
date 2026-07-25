# 💼 HR & Behavioural Interview Questions

> STAR method · Common questions · Salary negotiation · Culture fit · Questions to ask

---

## Table of Contents

1. [The STAR Method](#the-star-method)
2. [About You](#about-you)
3. [Behavioural Questions](#behavioural-questions)
4. [Technical Judgement](#technical-judgement)
5. [Conflict & Failure](#conflict--failure)
6. [Motivation & Fit](#motivation--fit)
7. [Salary Negotiation](#salary-negotiation)
8. [Questions to Ask Them](#questions-to-ask-them)
9. [Red Flags to Watch For](#red-flags-to-watch-for)
10. [Before, During & After](#before-during--after)

---

# The STAR Method

## How do you structure a behavioural answer?

### Answer

**S**ituation → **T**ask → **A**ction → **R**esult

```
SITUATION  (15%)  Set the context. Where, when, what was at stake?
TASK       (15%)  What was YOUR specific responsibility?
ACTION     (55%)  What did YOU do? This is the bulk. Use "I", not "we".
RESULT     (15%)  What happened? Quantify it. What did you learn?
```

### Why it works

Interviewers are trying to predict future behaviour from past behaviour. A rambling answer gives them nothing to score. STAR forces you to give a concrete, complete example in about 90 seconds.

### Example — weak vs strong

**❌ Weak**

> "We had performance problems on our site so we optimised it and it got faster."

No context, no specifics, no ownership, no numbers.

**✅ Strong**

> **Situation:** "At my last company, our product listing page was taking about 8 seconds to load on mobile. We were seeing a 40% bounce rate and the business team flagged it as a revenue problem."
>
> **Task:** "I owned the frontend performance work and was asked to get it under 3 seconds within a sprint."
>
> **Action:** "I started by profiling rather than guessing. Lighthouse and the React Profiler showed two things: we were shipping a 2.4MB bundle including all of moment.js with every locale, and the page rendered 500 product cards with no virtualization.
>
> I did four things. First, I replaced moment with date-fns imports, which cut about 60KB gzipped. Second, I code-split the routes so the listing page only loaded what it needed — that took the initial bundle from 2.4MB to 600KB. Third, I added TanStack Virtual so we only rendered visible rows. Fourth, I moved images to WebP with proper `srcset` and lazy loading below the fold.
>
> I also added a bundle-size budget to CI so it couldn't regress silently."
>
> **Result:** "Load time went from 8.2 seconds to 2.1 seconds on a throttled 3G connection. Bounce rate dropped from 40% to 24% over the following month, and the team attributed roughly a 12% lift in mobile conversions to it. The CI budget has caught two regressions since."

**Interview Tip:** Prepare **6–8 stories** covering: a technical challenge, a conflict, a failure, leadership/initiative, a tight deadline, learning something new, and improving a process. Most behavioural questions are one of these stories retold with a different framing.

**Common Mistakes:** Saying "we" throughout — the interviewer can't tell what *you* did. Skipping the result. Choosing a story where nothing was actually at stake.

---

# About You

## "Tell me about yourself."

### Answer

The most-asked question and the most commonly wasted. It's not asking for your life story — it's asking *"why are you the right person for this role?"*

### The structure — Present → Past → Future, ~90 seconds

```
PRESENT  Who you are now, professionally
PAST     Relevant experience that got you here
FUTURE   Why this role, why now
```

### Example

> "I'm a full-stack developer with about three years of experience building React and Node applications, currently at [Company] where I work on the customer-facing dashboard.
>
> I started out mostly on the frontend — React, TypeScript, design systems — but over the last 18 months I've moved deeper into the backend. I built our notification service in Node with BullMQ handling around 50,000 jobs a day, and I led the migration of our REST endpoints to a properly typed API layer, which cut integration bugs noticeably.
>
> The part I enjoy most is owning a feature end to end — from the database schema through to the UI — and I'm looking for a role where I can keep doing that at more scale. That's what drew me to this position: you're building [specific thing from the job description], which is exactly the kind of product-focused full-stack work I want to grow in."

**Interview Tip:** End with a bridge to *their* company. Naming something specific from the job description or their product proves you researched them rather than mass-applying.

**Common Mistakes:** Starting with "I was born in..." Reciting your CV chronologically. Going over three minutes. Being generic — "I'm passionate about coding" tells them nothing.

---

## "Walk me through your resume."

### Answer

Similar to the above but chronological, with a *reason* for each transition.

```
For each role: what the company did → what you owned → your biggest impact →
               why you moved on (always framed positively)
```

> "I started at [A] as a junior developer working on their internal admin tools. That's where I learned React properly and got my first exposure to code review culture. After 18 months I wanted more ownership than a junior role allowed, so I moved to [B] as a full-stack developer..."

**Interview Tip:** Never criticise a previous employer. Even a genuinely bad experience should be framed as "I was looking for X and the role couldn't offer it." Interviewers assume how you talk about your last company is how you'll talk about theirs.

---

## "What are your strengths?"

### Answer

Pick 2–3 that are **relevant to the role** and back each with evidence.

> "Two things I'd point to.
>
> First, debugging. I'm methodical about it — I reproduce first, form a hypothesis, and use bisect or profiling rather than guessing. Last quarter we had an intermittent production error nobody could reproduce; I added structured logging with request IDs and traced it to a race condition in our payment webhook handler where duplicate events were processed concurrently.
>
> Second, I write for the next person. I care about readable code, meaningful PR descriptions and tests that document intent. On my current team I introduced a PR template and our review turnaround dropped from about two days to under one."

**Interview Tip:** Avoid the strengths everyone claims — "hard worker", "team player", "fast learner". Pick something specific and prove it with a story.

---

## "What is your greatest weakness?"

### Answer

The trap: a fake weakness ("I'm a perfectionist", "I care too much") reads as dishonest. A catastrophic one ("I miss deadlines") disqualifies you.

**The formula:** a real weakness + what you're actively doing about it + evidence of progress.

> "I used to take on too much rather than delegating or pushing back. I'd say yes to every request and then be the bottleneck on three things at once.
>
> What helped was getting explicit about capacity. Now I keep a visible list of what I'm committed to, and when a new request comes in I go back with 'I can take this on if we move X to next sprint — which is higher priority?' It turns it into a conversation about priorities rather than me quietly overcommitting.
>
> I'm not perfect at it — I still catch myself saying yes reflexively — but my sprint completion rate is much more predictable now and my manager has actual visibility into my load."

### Other honest options

- "I was weak at system design because I'd mostly worked on features within an existing architecture. I've been deliberately fixing it — I read *Designing Data-Intensive Applications*, and I volunteered to write the design doc for our notification service."
- "I under-communicate when I'm deep in a problem. I've started posting a short daily update in the team channel so nobody has to ask."

**Interview Tip:** Choose a weakness that is genuinely real but **not core to the job you're applying for**. Applying for a backend role? Don't say "I'm bad at databases."

---

# Behavioural Questions

## "Tell me about a challenging project."

### The story structure

Pick a project with real technical difficulty and a measurable outcome.

> **S:** "We were migrating a five-year-old monolith's authentication to a new identity provider, with 200,000 active users who could not be logged out."
>
> **T:** "I owned the migration path — designing it so no user would have to reset their password or lose their session."
>
> **A:** "The hard constraint was that we couldn't do a big-bang cutover. I designed a dual-read approach: on login, the app would try the new provider first, fall back to the legacy password hash, and if the legacy path succeeded, transparently create the user in the new system and migrate them.
>
> I wrote a compatibility layer so both auth paths returned the same session shape, put the whole thing behind a feature flag, and rolled it out to 1% of traffic first. I built a dashboard tracking migration rate and auth error rate so we'd catch problems before users complained.
>
> The part I hadn't anticipated: about 3,000 accounts had duplicate emails with different casing from an old bug. I wrote a reconciliation script and worked with support on a manual review process for the ambiguous ones."
>
> **R:** "We migrated 97% of active users over six weeks with zero forced password resets. Auth error rate never exceeded baseline. The remaining 3% were dormant accounts we migrated on next login. It took about three weeks longer than I estimated, mostly because of the duplicate-email issue — which taught me to audit the data before designing the migration, not after."

**Interview Tip:** Include something that **went wrong** and how you handled it. A story where everything went perfectly sounds rehearsed and teaches the interviewer nothing about how you handle difficulty.

---

## "Tell me about a time you had to meet a tight deadline."

> **S:** "Two weeks before a major client demo, we found that our reporting feature — the centrepiece of the demo — timed out on the client's actual data volume. It worked fine on our test data of a few thousand rows; they had 4 million."
>
> **T:** "I had eight working days to make it usable."
>
> **A:** "First I decided what *not* to do. A full rewrite to a data warehouse was the right long-term answer but impossible in eight days, so I scoped to making the existing feature fast enough.
>
> I profiled the queries and found three problems: a missing composite index causing a full table scan, an N+1 pattern loading each row's related records separately, and the whole report being computed on every page load.
>
> I added the index, replaced the N+1 with a single aggregate query, and added a materialised view refreshed every 15 minutes since the client agreed that data freshness of 15 minutes was acceptable for reporting. I also added a loading skeleton so it felt responsive even during the initial fetch.
>
> I communicated the tradeoff explicitly to the product manager: we're getting speed by accepting 15-minute-stale data, and here's the plan to do it properly next quarter."
>
> **R:** "Report generation went from timing out at 30 seconds to loading in under 2. The demo went well and they signed. We did the proper data pipeline work the following quarter — I wrote the design doc based on what I'd learned during the scramble."

**Interview Tip:** The strongest signal in a deadline story isn't heroics — it's **scoping**. Show that you decided what to cut and communicated the tradeoff, rather than just working nights.

---

## "Tell me about a time you improved a process."

> "Our deploys were manual — SSH into the server, pull, build, restart PM2. They took about 40 minutes, only two people knew how, and we'd had two incidents from missed steps.
>
> I wasn't asked to fix it, but I timed how much it was costing us: roughly 6 hours a week across the team, plus the incident risk.
>
> I built a GitHub Actions pipeline: lint, test, build a Docker image, push to the registry, deploy to staging, run smoke tests, then require approval for production. I added automatic rollback if the health check failed after deploy.
>
> The important part was adoption. I paired with each team member on their first pipeline deploy and wrote a one-page runbook. I also deliberately kept the manual path documented for a month as a fallback so nobody felt trapped.
>
> Deploy time went from 40 minutes to 6, anyone on the team can deploy now, and we haven't had a deploy-related incident in the eight months since. Deploy frequency went from about twice a week to several times a day."

**Interview Tip:** Initiative stories are strong because they show you notice problems nobody assigned you. Include the **adoption** work — building something nobody uses isn't an improvement.

---

## "Tell me about a time you disagreed with your manager or a teammate."

> **S:** "A senior engineer on my team wanted to introduce GraphQL for a new internal admin tool. I thought it was the wrong call."
>
> **T:** "I needed to make my case without turning it into a status fight — he had more experience than me."
>
> **A:** "I made sure I understood his reasoning first. His argument was real: our REST endpoints were over-fetching and the admin tool needed data from six different resources.
>
> My concern was cost. Nobody on the team knew GraphQL, we'd need to solve N+1 with DataLoader, caching gets harder, and this was an internal tool used by eight people — the ROI seemed poor.
>
> Rather than debating in a meeting, I wrote a short comparison doc: the actual over-fetching cost measured in KB, what a REST aggregate endpoint would take to build, and what GraphQL would take including the learning curve. I offered to prototype the REST version in a day.
>
> The prototype worked and took four hours. Seeing the concrete comparison, he agreed REST was right *for this tool* — but he also made a good point that our public API had a stronger GraphQL case, and we revisited it there later."
>
> **R:** "We shipped the admin tool in two weeks instead of an estimated four. More importantly, the way we handled it set a pattern — we now write short comparison docs for architectural decisions instead of arguing in standups. And I was wrong about GraphQL generally; the public API did end up benefiting from it."

**Interview Tip:** The best disagreement stories end with **mutual respect and a decision based on evidence** — and ideally you being partly wrong about something. It shows you're not defensive.

**Common Mistakes:** Stories where you were completely right and everyone else was foolish. That reads as arrogance, not judgement.

---

## "Tell me about a time you had to work with a difficult person."

> "I worked with a developer who left very blunt code review comments — things like 'this is wrong, rewrite it' with no explanation. A junior on our team told me she'd started avoiding putting up PRs.
>
> I didn't assume bad intent. I asked him for coffee and mentioned it directly but neutrally: 'Your reviews catch real issues, but the phrasing is landing hard on some people — was that the intent?' It turned out he was reviewing 15 PRs a day and had compressed his feedback to save time. He genuinely hadn't considered how it read.
>
> We agreed on a small change: he'd add one line of *why* to each comment, and if something needed a bigger discussion he'd suggest a five-minute call instead of a comment thread. I also raised with our lead that his review load was unsustainable and we spread it across more people.
>
> His comments got noticeably more useful, and the junior started putting up PRs again. I learned to assume workload before assuming attitude."

**Interview Tip:** Never describe someone as "toxic" or "impossible". Describe the **behaviour and its impact**, then what you did. Interviewers are assessing whether *you'll* be the difficult person.

---

# Technical Judgement

## "Tell me about a technical decision you regret."

> "I introduced a heavily abstracted 'generic CRUD service' early at a startup — one base class that every entity extended, with hooks for validation, permissions and audit logging.
>
> It felt elegant. It was a disaster within six months. Every entity had exceptions, so the base class accumulated flags and conditionals. Debugging meant tracing through four layers of inheritance. New developers took days to understand it, and simple changes required understanding the whole abstraction.
>
> Eventually we deleted it. The replacement was more code — explicit service files per entity, with shared utility functions rather than inheritance — but every file could be read in isolation.
>
> What I took from it: I abstracted based on what I predicted would repeat, not on what had actually repeated. Now I follow the rule of three — I don't abstract until I've written something similar three times and can see the real shape of the variation. Duplication is cheaper to fix than the wrong abstraction."

**Interview Tip:** This question is really asking *"can you learn?"* A candidate with no regrets either hasn't built much or isn't reflective. Give a real one with a genuine lesson.

---

## "How do you keep your skills current?"

> "A few habits.
>
> I read release notes for the tools I actually use — React, Node, TypeScript, Postgres. That's higher signal than general tech news because it directly affects my work.
>
> For depth, I read one technical book a quarter. This year it was *Designing Data-Intensive Applications*, which genuinely changed how I think about consistency tradeoffs.
>
> I learn by building. When I wanted to understand how bundlers work, I wrote a tiny one — 200 lines, terrible, but I understood the module graph afterwards in a way reading docs hadn't given me.
>
> And I try to be deliberate about *not* chasing everything. There's a new framework every month. I look for what's solving a problem I actually have."

**Interview Tip:** The last point is the differentiator. Anyone can list resources. Showing you filter deliberately signals maturity.

---

## "How do you approach debugging a production issue?"

> "First, stabilise. If it's actively affecting users, roll back or toggle the feature flag before investigating. Restoring service beats understanding the cause.
>
> Then I want data before theories. What changed — deploys, config, traffic, a dependency? What do the metrics show — error rate, latency, saturation? What do the logs say, filtered by request ID?
>
> I try to reproduce it. If I can't reproduce it, I usually don't understand it, and a fix I can't verify is a guess.
>
> Then narrow it down. Bisect if it's a regression, binary search the request path if it's not. I try to avoid the trap of fixating on the first plausible cause.
>
> Once fixed, I write it up — what happened, why, what we're changing to prevent it. Blameless, focused on the system rather than the person. Most incidents I've seen were a missing guardrail, not a careless human."

**Interview Tip:** The "stabilise first, understand second" instinct is what separates people who've been on call from people who haven't.

---

# Conflict & Failure

## "Tell me about a time you failed."

> **S:** "I shipped a database migration that took our API down for 20 minutes during business hours."
>
> **T:** "I was adding a NOT NULL column to our orders table — about 12 million rows."
>
> **A:** "I'd tested it on staging where the table had 50,000 rows and it ran in under a second. In production, adding a NOT NULL column with a default required a full table rewrite and took an exclusive lock. Every query on orders queued behind it.
>
> When alerts fired I didn't immediately understand what was happening — I was watching the migration, not the app. My teammate spotted the lock. We couldn't safely cancel mid-rewrite, so we waited it out, which was the worst 15 minutes of my week.
>
> Afterwards I wrote the postmortem myself. The root cause wasn't really my mistake — it was that we had no process preventing it. I proposed three changes: staging gets a production-sized dataset for migrations, all migrations run with an explicit `lock_timeout` so they fail fast instead of blocking, and any migration on a table over a million rows requires a second reviewer."
>
> **R:** "All three were adopted. The lock_timeout has since caught two migrations that would have caused the same problem. Personally, I stopped assuming staging behaves like production — I now check row counts and query plans before writing any migration."

**Interview Tip:** Choose a real failure with real consequences. Own it without excessive self-flagellation, and spend most of the answer on **what changed as a result**. A failure story where you blame circumstances is worse than no story.

**Common Mistakes:** A fake failure ("I once worked too hard on a project"). Blaming others. Not showing a systemic fix.

---

## "How do you handle criticism?"

> "I try to separate the feedback from my reaction to it. My first instinct when I get critical feedback is defensive — I think that's normal — so I've learned to not respond in that moment. I ask clarifying questions instead: 'Can you give me a specific example?' That gives me something concrete to work with and gives me time to get past the defensiveness.
>
> Then I look for the truth in it, even if I disagree with the framing. In my last review my manager said I was 'hard to get status from.' My first reaction was that I communicate plenty. But when I actually looked, I was communicating in DMs to individuals, not anywhere the team could see. The feedback was right even though I'd have described it differently.
>
> I started posting a short weekly update in the team channel. It took ten minutes a week and completely removed the problem."

---

## "How do you handle pressure or stress?"

> "Practically, I get things out of my head and into a list, then ruthlessly order it. Most of my stress comes from holding too many open loops rather than from any single task being hard.
>
> I also escalate earlier than I used to. I used to try to solve everything myself and only raise it when I was already behind. Now if I think a deadline is at risk I flag it as soon as I think it, with options — 'we can cut scope X, or move the date, or I can get help.' Nobody's ever been upset about early warning; they get upset about surprises.
>
> And I protect the basics. When I'm under pressure the first things I drop are sleep and breaks, which makes me slower. I've learned that a walk at hour six beats grinding to hour nine."

---

# Motivation & Fit

## "Why do you want to work here?"

### Answer

This is the question that most obviously separates people who researched the company from those who didn't. Be specific.

```
Structure:
1. Something specific about the PRODUCT or PROBLEM
2. Something about the TEAM or ENGINEERING CULTURE
3. How it connects to what YOU want next
```

> "Three things.
>
> The product — I read your engineering blog post about moving from a monolith to event-driven services, and the fact that you wrote honestly about what didn't work told me a lot. I've been on the other side of that migration and the problems you described are real.
>
> The domain — you're building tooling for developers, and I've spent the last two years building internal tools that engineers actually liked using. That's a niche skill and it's exactly what this role needs.
>
> And the stage. You're about 40 engineers, which is where I want to be — big enough that there's real infrastructure and mentorship, small enough that what I build matters. My current company is 400 people and I feel further from impact than I want to be."

**Interview Tip:** Do the homework. Read their engineering blog, their docs, their GitHub, their recent funding news, their product. Mentioning one specific thing beats any amount of enthusiasm.

**Common Mistakes:** "It's a great company with great opportunities." "I've heard good things." Anything that could be said about any company.

---

## "Why are you leaving your current job?"

### Answer

Be honest but forward-looking. Frame it as moving **toward** something, not away.

> "I've had a good run there — I've grown a lot and I'm still on good terms with the team. But I've been doing essentially the same kind of work for the last year. The product is mature and the roadmap is mostly incremental improvements.
>
> I'm looking for a place where I can work on harder technical problems and have more ownership over architecture, not just implementation. That's not something my current role can offer without waiting for someone above me to leave."

### If you were laid off

> "The company went through a restructuring in [month] and cut about 20% of engineering, including my team. It wasn't performance-related — my manager has offered to be a reference. It's given me a chance to be more deliberate about what I look for next, which is how I ended up applying here."

### If you were fired

Be brief, take responsibility, show what changed.

> "It wasn't a good fit and we parted ways. Honestly, part of that was on me — I struggled with [specific thing] and didn't ask for help early enough. What I took from it is [specific change]. I'd rather tell you that directly than have it come up later."

**Interview Tip:** Never badmouth your current employer, manager or teammates. Even if everything you'd say is true, the interviewer only hears "this person will say the same about us."

---

## "Where do you see yourself in five years?"

### Answer

Nobody expects a five-year plan. They're checking whether your direction is compatible with the role.

> "I'm less attached to a title than to a direction. What I want is to be the person on a team who can own a problem end to end — not just implement a spec but be involved in what we're building and why.
>
> Practically that probably means senior or staff level in three to four years, with deeper expertise in backend architecture — that's where I feel the biggest gap right now.
>
> I've thought about management and I'm genuinely unsure. I like mentoring and I've enjoyed leading projects, but I don't want to stop building. I'd rather find that out through experience than commit to a track now."

**Interview Tip:** Honest uncertainty is fine and often more credible than a rehearsed plan. What's not fine is an answer implying you'll leave ("I want to start my own company in two years") or that you have no direction at all.

---

## "What are you looking for in your next role?"

> "Four things, roughly in order.
>
> Problems that stretch me technically — I want to be slightly out of my depth, not comfortable.
>
> A team I learn from. Code review culture matters to me a lot; I've grown most where people pushed back on my PRs.
>
> Ownership. I want to be involved before the spec exists, not handed tickets.
>
> And a product where I can see the user impact. I've worked on things I couldn't explain to a friend and it's demotivating."

---

## "How do you work in a team?"

> "A few things I try to do consistently.
>
> I communicate early and in writing. If I'm blocked or something's slipping, I'd rather say it on day one than day five.
>
> I review PRs promptly. Nothing kills momentum like a PR sitting for three days, so I try to review within a few hours even if it's a quick pass.
>
> In reviews I try to distinguish between 'this is wrong' and 'I'd do it differently' — the second one is a suggestion, not a blocker, and I say so explicitly.
>
> And I try to write things down. Design decisions in a doc, gotchas in the README. Not because process is fun, but because I've been the person joining a codebase where nothing was documented."

---

# Salary Negotiation

## "What are your salary expectations?"

### Answer

**Do not name a number first if you can avoid it.** Whoever anchors first usually loses ground.

### Deflect (first attempt)

> "I'd rather understand the role and responsibilities a bit better before talking numbers. Do you have a budgeted range for this position?"

### Deflect (second attempt)

> "I'm sure we can find something that works if we're a good fit. What range has been approved for this role?"

### If they insist — give a researched range, anchored high

> "Based on my research for full-stack roles at this level in [city], and the scope we've discussed, I'm looking at ₹18–24 lakhs. Where does that sit against your budget?"

### Do your research first

```
Sources:  Levels.fyi, Glassdoor, AmbitionBox, LinkedIn Salary,
          your own network (the most accurate source)

Consider: base + bonus + equity + benefits + PF + insurance +
          learning budget + remote flexibility
```

## Handling the offer

### If it's below your range

> "Thank you — I'm genuinely excited about this role and the team. The base is a bit below what I was targeting. Based on my research and the scope we discussed, I was expecting closer to ₹X. Is there flexibility on the base?"

Then **stop talking**. Silence is uncomfortable and the other person often fills it with movement.

### If the base is fixed

> "I understand the base is constrained. Are there other components with flexibility — a signing bonus, an earlier review cycle, additional equity, or a learning budget?"

### Buying time

> "Thank you, I really appreciate the offer. Could I have until [specific day] to consider it properly? I want to give it the thought it deserves."

Two to five days is normal and reasonable to ask for.

### The rules

```
✅ Research the market rate BEFORE the conversation
✅ Negotiate the whole package, not just base
✅ Get everything in writing
✅ Stay warm and collaborative — you're joining this team
✅ Have a walk-away number decided in advance
✅ Be prepared to accept graciously if they meet you

❌ Don't lie about competing offers — it's checkable and it's a relationship-ender
❌ Don't accept on the call — always take time
❌ Don't negotiate without a range in mind
❌ Don't apologise for negotiating; it's expected
❌ Don't disclose your current salary if you can avoid it
   (illegal to ask in several jurisdictions)
```

**Interview Tip:** The single highest-value move is **letting them name a number first**. If asked what you currently earn, redirect: *"I'd rather focus on what the role is worth than what I was paid at a different company with a different scope."*

**Common Mistakes:** Naming a number too early and too low. Accepting immediately out of relief. Negotiating aggressively enough to sour the relationship before day one.

---

# Questions to Ask Them

## "Do you have any questions for us?"

**Always have questions.** "No, I think you covered everything" is a missed opportunity and reads as disinterest.

### About the role

- "What does success look like in this role after three months? After a year?"
- "What's the biggest challenge the person in this role will face?"
- "Is this a new position or a backfill? What happened with the previous person?"
- "How much of the work is new features versus maintenance?"

### About the team

- "How is the team structured, and where would I fit?"
- "What does a typical sprint look like?"
- "How are technical decisions made — who decides on architecture?"
- "How do you handle disagreements about technical direction?"

### About engineering practice

- "What's your code review process like?"
- "How often do you deploy? What does the pipeline look like?"
- "How much test coverage do you have, and how do you feel about it?"
- "What's your on-call rotation like?"
- "What's the biggest piece of technical debt you're carrying?"
- "How do you balance shipping features against paying down debt?"

### About growth

- "How do people grow here? Is there a defined engineering ladder?"
- "How often do performance reviews happen?"
- "Is there a learning budget or conference allowance?"
- "Can you tell me about someone who's grown significantly on this team?"

### About culture (asked carefully)

- "How would you describe the engineering culture in a sentence?"
- "What's something you'd change about working here?"
- "How does the team handle a production incident?"
- "What's the remote/hybrid expectation, and how does that work in practice?"

### The strong closing question

> "Is there anything about my background that gives you hesitation? I'd rather address it now than leave it unanswered."

**Interview Tip:** That last question is high-risk, high-reward. It's genuinely useful — it surfaces objections while you can still answer them — and it signals confidence. Only ask it if you can take the answer calmly.

**Common Mistakes:** Asking only about salary, holidays and perks in the first interview. Asking things clearly answered on their website. Asking nothing at all.

---

# Red Flags to Watch For

You're evaluating them too. Watch for:

```
🚩 Vague answers about what the role actually involves
🚩 "We're like a family here" — often precedes poor boundaries
🚩 Can't describe their code review or deploy process
🚩 High turnover, especially in the team you'd join
🚩 Interviewers who seem exhausted or speak carefully about management
🚩 "We work hard and play hard" / normalised long hours
🚩 No questions about how you work, only whether you can do the tasks
🚩 Pressure to accept immediately ("this offer expires tomorrow")
🚩 Disorganised process — rescheduling repeatedly, unclear stages
🚩 Can't answer "what's your biggest technical debt?" honestly
🚩 Salary range refused entirely at every stage
🚩 Unpaid take-home assignments over ~4 hours
🚩 Nobody you'd work with is in the interview process
```

**Interview Tip:** Ask a current engineer — not the hiring manager — *"What's something you'd change about working here?"* If they can't name anything, they're either new or not being candid. A thoughtful, specific answer is a good sign.

---

# Before, During & After

## Before the interview

```
□ Research the company: product, blog, GitHub, recent news, funding
□ Read the job description carefully; map your experience to each bullet
□ Prepare 6–8 STAR stories covering the common themes
□ Prepare your "tell me about yourself" and practise it out loud (90 seconds)
□ Research salary ranges; decide your target and your walk-away number
□ Prepare 5–8 questions to ask
□ Look up your interviewers on LinkedIn
□ Test your camera, mic, internet and the meeting link (for remote)
□ Have your resume, a notepad and water within reach
□ Know how to get there / log in 10 minutes early
```

## During the interview

```
□ Arrive/join early
□ Take a moment before answering — thinking first is fine and looks better than rambling
□ Ask clarifying questions before answering a broad question
□ Use "I" for your contributions, "we" for genuine team efforts
□ Quantify results whenever you can
□ Say "I don't know" when you don't — then say how you'd find out
□ Take notes; it shows engagement and helps your follow-up
□ Watch the time; keep answers to about 2 minutes
□ Ask your questions
□ Ask about next steps and timeline before you leave
```

## After the interview

```
□ Send a thank-you email within 24 hours
□ Reference something specific from the conversation
□ Briefly address anything you feel you answered poorly
□ If you promised to send something, send it
□ Note down the questions you were asked — for next time
□ If you don't hear back by the stated date, follow up once, politely
```

### Thank-you email template

> **Subject:** Thank you — Full Stack Developer interview
>
> Hi [Name],
>
> Thank you for taking the time to speak with me today. I enjoyed the conversation, particularly the discussion about how you're handling the migration to event-driven services — the point about ordering guarantees being the hardest part matched my experience and got me thinking.
>
> One thing I'd add to my answer about caching: I mentioned we used Redis for session storage, but I didn't explain that we specifically chose a sliding TTL with a refresh on activity, which cut our session storage by about 60% compared to fixed expiry. Happy to go into more detail if useful.
>
> The role sounds like a strong fit and I'd be glad to continue the conversation. Please let me know if there's anything else you need from me.
>
> Best regards,
> Jaydip Patel

**Interview Tip:** Using the thank-you note to improve one answer is genuinely effective. It shows you kept thinking about the problem after the meeting ended — which is exactly what good engineers do.

---

## 📌 Final Checklist

- [ ] Can you do "tell me about yourself" in 90 seconds without notes?
- [ ] Do you have 6–8 STAR stories ready?
- [ ] Can you name a real failure and what changed because of it?
- [ ] Can you name a real weakness you're actively working on?
- [ ] Do you know your salary range and your walk-away number?
- [ ] Have you researched this specific company?
- [ ] Do you have 5+ questions to ask them?
- [ ] Can you explain why you're leaving without criticising anyone?
- [ ] Have you practised out loud, not just in your head?

---

> **The mindset that helps most:** an interview is two people working out whether they should work together. You're evaluating them as much as they're evaluating you. That framing makes you calmer, makes your questions better, and — genuinely — makes you more attractive as a candidate.
