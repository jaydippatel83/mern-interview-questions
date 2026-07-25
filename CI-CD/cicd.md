# 🔄 CI/CD Interview Questions

> Pipelines · GitHub Actions · Jenkins · Build · Test · Deploy · Rollback · GitOps

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Pipeline Stages](#pipeline-stages)
3. [GitHub Actions](#github-actions)
4. [Jenkins](#jenkins)
5. [Testing in CI](#testing-in-ci)
6. [Deployment Strategies](#deployment-strategies)
7. [Rollback](#rollback)
8. [Secrets Management](#secrets-management)
9. [GitOps](#gitops)
10. [Best Practices](#best-practices)
11. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is CI, CD and CD?

### Answer

| | Continuous Integration | Continuous Delivery | Continuous Deployment |
|---|---|---|---|
| What | Merge and verify code frequently | Every build is **releasable** | Every passing build **auto-releases** |
| Trigger | Every push/PR | Every merge to main | Every merge to main |
| Human gate | — | ✅ Manual approval to release | ❌ None |
| Output | Tested artifact | Artifact ready in staging | Live in production |

```
CI:                  code → build → test → artifact
Continuous Delivery: … → deploy to staging → [MANUAL APPROVAL] → production
Continuous Deployment: … → deploy to staging → automated checks → production
```

### Why do we use it?

Without CI, integration problems surface days or weeks later when merging is painful. With CI, every push is verified within minutes and the blame surface is one small commit.

Without CD, releases are rare, large, risky events. With CD, releases are small, frequent and boring — which is the goal.

**Interview Tip:** The DORA metrics are the vocabulary to use: **deployment frequency**, **lead time for changes**, **change failure rate**, **mean time to restore**. High performers deploy multiple times a day with a change failure rate under 15%. Framing CI/CD in those terms shows you understand *why* it matters, not just the tooling.

**Common Mistakes:** Saying "CI/CD means we use Jenkins." The practice matters more than the tool — trunk-based development, small PRs and fast feedback are what make it work.

---

## What makes a good pipeline?

### Answer

```
1. FAST         — under 10 minutes, ideally under 5. Slow pipelines get bypassed.
2. RELIABLE     — no flaky tests. A pipeline people don't trust is worse than none.
3. REPRODUCIBLE — same commit → same result, always.
4. FAIL FAST    — cheapest checks first (lint → unit → integration → e2e).
5. VISIBLE      — clear failure messages, direct links to logs.
6. AUTOMATED    — no manual steps that a human can forget.
```

```
Typical order, cheapest first:

  lint + typecheck   (30s)     ← fails 40% of bad PRs
        ↓
  unit tests         (2m)      ← fails another 40%
        ↓
  build              (2m)
        ↓
  integration tests  (4m)
        ↓
  e2e tests          (8m)      ← only after everything else passes
        ↓
  deploy
```

**Interview Tip:** A concrete number: if your pipeline takes 30 minutes, developers context-switch and stop watching it. Under 10 minutes, they wait for it and fix things immediately. Pipeline speed is a developer-productivity investment, not a nice-to-have.

---

# Pipeline Stages

## What are the standard pipeline stages?

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  SOURCE  │─>│  BUILD   │─>│   TEST   │─>│ PACKAGE  │─>│  DEPLOY  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
  checkout      compile        unit          docker        staging
  cache deps    bundle         integration   build         smoke test
                lint           e2e           push to       production
                typecheck      security      registry      verify
                               scan          sign          monitor
```

### Each stage in detail

```yaml
# SOURCE
- Checkout with the right fetch depth
- Restore dependency cache
- Detect what changed (monorepo path filters)

# BUILD
- Install dependencies (npm ci, NOT npm install)
- Lint + typecheck
- Compile / bundle
- Fail on any warning you care about

# TEST
- Unit tests with coverage thresholds
- Integration tests against real dependencies (testcontainers)
- Contract tests between services
- Security: SAST, dependency audit, secret scanning
- Performance: bundle size budget, Lighthouse CI

# PACKAGE
- Build a container image or artifact
- Tag with the commit SHA (immutable) AND a semantic version
- Scan the image for CVEs
- Sign the image
- Push to the registry

# DEPLOY
- Deploy to staging
- Run smoke tests
- Promote to production (canary → full)
- Verify health, watch error rates
- Auto-rollback on failure
```

**Interview Tip:** **Build once, deploy many.** The exact artifact tested in staging must be the one promoted to production. Rebuilding per environment means you're deploying something that was never tested. Environment differences belong in configuration, not in separate builds.

---

# GitHub Actions

## Write a complete CI/CD pipeline in GitHub Actions.

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:              # manual trigger

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true        # cancel superseded runs — saves minutes and money

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ---------------------------------------------------------------
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'            # built-in dependency caching

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npx prettier --check .

  # ---------------------------------------------------------------
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]            # test across versions

    services:                     # real dependencies, not mocks
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ['5432:5432']

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - uses: codecov/codecov-action@v4
        if: matrix.node == 20
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ---------------------------------------------------------------
  security:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Dependency audit
        run: npm audit --audit-level=high

      - name: Secret scanning
        uses: gitleaks/gitleaks-action@v2

      - name: SAST
        uses: github/codeql-action/analyze@v3

  # ---------------------------------------------------------------
  build:
    needs: [lint, test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write             # for OIDC / keyless signing
    outputs:
      image: ${{ steps.meta.outputs.tags }}
      digest: ${{ steps.push.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix={{branch}}-        # immutable, traceable
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}

      - id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha              # GitHub Actions layer cache
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
          provenance: true                  # supply-chain attestation

      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.meta.outputs.tags }}
          format: sarif
          output: trivy.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'                    # FAIL the build on high CVEs

  # ---------------------------------------------------------------
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    permissions:
      id-token: write                       # OIDC — no stored AWS keys ⭐
      contents: read

    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsDeploy
          aws-region: ap-south-1
          # ✅ No AWS_ACCESS_KEY_ID stored anywhere — short-lived OIDC credentials

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster staging \
            --service api \
            --force-new-deployment
          aws ecs wait services-stable --cluster staging --services api

      - name: Smoke test
        run: |
          for i in {1..30}; do
            if curl -sf https://staging.example.com/health; then exit 0; fi
            sleep 5
          done
          echo "Health check failed"; exit 1

  # ---------------------------------------------------------------
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production                      # ← configure required reviewers here
      url: https://example.com
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsProd
          aws-region: ap-south-1

      - name: Canary deploy (10%)
        run: ./scripts/deploy-canary.sh 10

      - name: Watch error rate for 5 minutes
        run: ./scripts/check-metrics.sh --duration 300 --max-error-rate 1

      - name: Full rollout
        run: ./scripts/deploy-canary.sh 100

      - name: Notify
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            { "text": "Deploy ${{ job.status }}: ${{ github.sha }}" }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Key GitHub Actions concepts

```yaml
Workflow  → the whole .yml file
Job       → runs on one runner, jobs run in PARALLEL by default
Step      → a command or an action within a job
Action    → a reusable unit (uses:)
Runner    → the machine (GitHub-hosted or self-hosted)

needs:       job dependencies (creates a DAG)
if:          conditional execution
strategy.matrix: run the same job across versions/OSes
environment: deployment protection rules and approvals
concurrency: cancel superseded runs
permissions: least-privilege GITHUB_TOKEN scopes
outputs:     pass values between jobs
```

**Interview Tip:** **OIDC** is the standout detail. Instead of storing long-lived AWS keys as repository secrets (which leak, and never rotate), GitHub Actions exchanges a short-lived OIDC token for temporary AWS credentials. It's the modern best practice and most candidates don't mention it.

---

# Jenkins

## Write a Jenkins declarative pipeline.

```groovy
pipeline {
    agent {
        docker {
            image 'node:20-alpine'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    environment {
        REGISTRY   = 'registry.example.com'
        IMAGE      = "${REGISTRY}/myapp"
        TAG        = "${env.GIT_COMMIT.take(7)}"
        DOCKER_CRED = credentials('docker-registry')   // injects USR and PSW
    }

    triggers {
        pollSCM('H/5 * * * *')       // or use a webhook (better)
        cron('H 2 * * *')            // nightly build
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            steps { sh 'npm ci' }
        }

        stage('Quality') {
            parallel {                     // run these concurrently
                stage('Lint')      { steps { sh 'npm run lint' } }
                stage('Typecheck') { steps { sh 'npm run typecheck' } }
                stage('Audit')     { steps { sh 'npm audit --audit-level=high' } }
            }
        }

        stage('Test') {
            steps {
                sh 'npm test -- --coverage --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    publishHTML([reportDir: 'coverage', reportFiles: 'index.html',
                                 reportName: 'Coverage'])
                }
            }
        }

        stage('Build image') {
            when { branch 'main' }
            steps {
                script {
                    def img = docker.build("${IMAGE}:${TAG}")
                    docker.withRegistry("https://${REGISTRY}", 'docker-registry') {
                        img.push()
                        img.push('latest')
                    }
                }
            }
        }

        stage('Deploy staging') {
            when { branch 'main' }
            steps {
                sh "kubectl set image deployment/api api=${IMAGE}:${TAG} -n staging"
                sh "kubectl rollout status deployment/api -n staging --timeout=5m"
            }
        }

        stage('Approve production') {
            when { branch 'main' }
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input message: 'Deploy to production?',
                          ok: 'Deploy',
                          submitter: 'release-managers'
                }
            }
        }

        stage('Deploy production') {
            when { branch 'main' }
            steps {
                sh "kubectl set image deployment/api api=${IMAGE}:${TAG} -n production"
                sh "kubectl rollout status deployment/api -n production --timeout=10m"
            }
        }
    }

    post {
        success { slackSend(color: 'good',   message: "✅ ${env.JOB_NAME} #${env.BUILD_NUMBER}") }
        failure { slackSend(color: 'danger', message: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} — ${env.BUILD_URL}") }
        always  { cleanWs() }
    }
}
```

### Jenkins vs GitHub Actions

| | Jenkins | GitHub Actions |
|---|---|---|
| Hosting | Self-hosted (you maintain it) | Managed (or self-hosted runners) |
| Setup | Significant | Minimal — a YAML file |
| Plugins | 1,800+, some unmaintained | Marketplace actions |
| Cost | Infrastructure + maintenance time | Free for public, per-minute for private |
| Flexibility | Very high (Groovy) | High, but more opinionated |
| Best for | Complex enterprise, on-prem, legacy | Anything already on GitHub |

**Interview Tip:** Be balanced. Jenkins is still everywhere in enterprises and it's genuinely more flexible for complex on-prem needs. GitHub Actions wins on setup speed and zero maintenance. The real answer depends on where your code lives and whether you have a platform team.

---

# Testing in CI

## What tests should run in a pipeline?

### Answer

```
        /\          E2E (5%)             — slow, brittle, high value
       /  \         Playwright/Cypress   — critical user journeys only
      /____\
     /      \       Integration (25%)    — API + real DB via testcontainers
    /        \      supertest, real Postgres/Redis
   /__________\
  /            \    Unit (70%)           — fast, isolated, deterministic
 /______________\   Vitest/Jest
```

```yaml
# Fail fast — order by cost
- lint            30s   catches style/obvious errors
- typecheck       45s   catches type errors
- unit           120s   catches logic errors
- integration    240s   catches wiring errors
- e2e            480s   catches user-facing regressions
```

### Quality gates

```yaml
- name: Coverage threshold
  run: |
    npm test -- --coverage
    npx nyc check-coverage --lines 80 --functions 80 --branches 70

- name: Bundle size budget
  uses: andresz1/size-limit-action@v1
  with:
    build_script: build

- name: Lighthouse CI
  run: |
    npm i -g @lhci/cli
    lhci autorun --assert.preset=lighthouse:recommended

- name: Accessibility
  run: npx playwright test --grep @a11y
```

### Handling flaky tests

```
A flaky test is worse than no test — it trains people to ignore red builds.

Approach:
  1. Detect     — track failure rate per test over time
  2. Quarantine — move flaky tests out of the blocking pipeline
  3. Fix or delete — within a fixed time window; never leave them quarantined forever

Common causes:
  ❌ Real timers and sleeps       → fake timers, deterministic waits
  ❌ Shared state between tests    → isolate, reset the DB per test
  ❌ Test order dependence         → randomise order to expose it
  ❌ Real network calls            → mock at the boundary (MSW)
  ❌ Race conditions in async code → await properly, use test utilities
```

**Interview Tip:** Retrying flaky tests in CI hides the problem and eventually hides a real bug. The correct answer is quarantine + fix, with a hard rule that a quarantined test is either fixed or deleted within a sprint.

---

# Deployment Strategies

## Compare deployment strategies.

### Answer

| Strategy | How | Downtime | Rollback | Cost | Risk |
|---|---|---|---|---|---|
| **Recreate** | Stop old, start new | ❌ Yes | Redeploy old | Low | High |
| **Rolling** | Replace instances gradually | ✅ None | Roll back gradually | Low | Medium |
| **Blue-Green** | Two full environments, switch traffic | ✅ None | **Instant** | 2× infra | Low |
| **Canary** | Small % first, then ramp | ✅ None | Route back | Low | **Lowest** |
| **A/B testing** | Route by user attribute | ✅ None | Toggle | Low | Low |
| **Feature flags** | Deploy dark, enable per user | ✅ None | **Toggle, no deploy** | Low | Lowest |

### Rolling update

```yaml
# Kubernetes
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1          # one extra pod during the update
    maxUnavailable: 0    # never go below the desired count → zero downtime
```

```
3 pods running v1
  → start 1 pod v2  (4 total)
  → v2 ready → terminate 1 v1  (3 total: 2×v1, 1×v2)
  → repeat until all v2
```

⚠️ During a rolling update, **both versions serve traffic simultaneously.** Your API and database schema must be backward compatible.

### Blue-Green

```
        ┌──────────┐
        │ Router / │
        │   ALB    │
        └────┬─────┘
             │ 100%
    ┌────────▼────────┐        ┌─────────────────┐
    │  BLUE (v1) LIVE │        │ GREEN (v2) idle │
    └─────────────────┘        └─────────────────┘

Deploy v2 to green → test green thoroughly → switch the router → green is live
Rollback = switch the router back. Seconds, not minutes.
```

### Canary

```
v1: 100% ──> v1: 95% + v2: 5%  ──> monitor 10 min
                                     ├── errors normal → 25% → 50% → 100%
                                     └── errors spike   → back to 0%, investigate
```

```yaml
# Automated canary analysis (Flagger/Argo Rollouts)
analysis:
  interval: 1m
  threshold: 5                  # fail after 5 bad checks
  maxWeight: 50
  stepWeight: 10
  metrics:
    - name: request-success-rate
      thresholdRange: { min: 99 }
    - name: request-duration
      thresholdRange: { max: 500 }   # p99 ms
```

### Database migrations — the hard part

```
❌ NEVER: deploy code and a breaking migration together.
   During a rolling update, old and new code run simultaneously against
   the SAME database.

✅ EXPAND / CONTRACT (three deploys):

  1. EXPAND    — add the new column (nullable), keep the old one
                 Deploy code that WRITES BOTH, READS the old
  2. MIGRATE   — backfill data; deploy code that reads the NEW column
  3. CONTRACT  — after everything is on the new code, drop the old column

  Renaming user.name → user.full_name:
    Deploy 1: add full_name; write to both; read name
    Deploy 2: backfill full_name; read full_name
    Deploy 3: stop writing name; drop the name column
```

**Interview Tip:** The expand/contract pattern is the answer to "how do you deploy a breaking schema change with zero downtime?" It's the question that separates people who've done real deployments from people who've read about them.

---

# Rollback

## How do you roll back a bad deployment?

### Answer

```bash
# Kubernetes — instant
kubectl rollout undo deployment/api
kubectl rollout undo deployment/api --to-revision=3
kubectl rollout history deployment/api

# ECS — redeploy the previous task definition
aws ecs update-service --cluster prod --service api \
  --task-definition api:41

# Blue-green — flip the router
aws elbv2 modify-listener --listener-arn $ARN \
  --default-actions Type=forward,TargetGroupArn=$BLUE_TG

# Feature flag — no deploy at all
await flags.disable('new-checkout-flow');   # seconds
```

### Automated rollback

```yaml
# GitHub Actions
- name: Deploy
  id: deploy
  run: ./deploy.sh

- name: Verify
  id: verify
  run: ./scripts/health-check.sh --timeout 300

- name: Rollback on failure
  if: failure() && steps.deploy.outcome == 'success'
  run: |
    ./rollback.sh
    curl -X POST $SLACK_WEBHOOK -d '{"text":"🔴 Auto-rolled back ${{ github.sha }}"}'
```

```yaml
# ECS circuit breaker — AWS rolls back automatically
deploymentConfiguration:
  deploymentCircuitBreaker:
    enable: true
    rollback: true
```

### Roll back vs roll forward

| | Roll back | Roll forward |
|---|---|---|
| Speed | Instant | As fast as you can write a fix |
| When | Any production incident | When rollback is impossible (irreversible migration) |
| Risk | Low, known-good state | Higher, untested fix under pressure |

**The rule: roll back first, debug afterwards.** Restore service, then investigate calmly.

### What makes rollback hard

```
❌ Irreversible database migrations (dropped columns)
❌ Data written in a new format that old code can't read
❌ External state changed (emails sent, payments taken)
❌ Cached artifacts of the new version
❌ No versioned artifacts to roll back TO
```

**Interview Tip:** State it plainly: *"Rollback is a design requirement, not an afterthought. Every migration must be backward compatible, every deploy must produce a versioned immutable artifact, and I'd rather roll back in 30 seconds than debug in production for 30 minutes."*

---

# Secrets Management

## How do you handle secrets in CI/CD?

### Answer

```yaml
# ❌ NEVER
env:
  API_KEY: sk-live-abc123          # committed to the repo, in every log

# ✅ Repository/organisation secrets
env:
  API_KEY: ${{ secrets.API_KEY }}  # masked in logs, encrypted at rest

# ✅✅ OIDC — no stored secrets at all (the best option)
permissions:
  id-token: write
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123:role/GitHubActions
      aws-region: ap-south-1
  # Short-lived credentials scoped to this repo AND this branch

# ✅ External secret stores
  - uses: hashicorp/vault-action@v3
    with:
      url: https://vault.example.com
      method: jwt
      secrets: secret/data/prod api_key | API_KEY
```

### The rules

```
1. Never commit secrets     — gitleaks/trufflehog in pre-commit AND CI
2. Prefer OIDC              — short-lived, auto-rotating, no storage
3. Scope narrowly           — per environment, per repo, per branch
4. Rotate regularly         — and immediately on any suspicion
5. Audit access             — who used what, when
6. Never log them           — CI masks known secrets, but derived values leak
7. Separate per environment — a staging leak must not reach production
```

### If a secret leaks

```
1. ROTATE IMMEDIATELY   — the leaked value is compromised forever
2. Revoke the old one
3. Audit for misuse (CloudTrail, access logs)
4. Remove from history (git filter-repo) — but assume it's already been scraped
5. Add scanning so it can't happen again
```

**Interview Tip:** The critical point most people miss: **rewriting Git history does not un-leak a secret.** Public repos are scraped within seconds by bots. Rotation is the only real remediation; history cleanup is cosmetic.

---

# GitOps

## What is GitOps?

### Answer

Git is the **single source of truth** for infrastructure and application state. An agent in the cluster continuously reconciles reality with what's in Git.

```
Traditional (push):
  CI pipeline ──kubectl apply──> Cluster
  ⚠️ CI needs cluster credentials
  ⚠️ Manual kubectl changes drift silently

GitOps (pull):
  Developer ──PR──> Git repo <──watches── ArgoCD/Flux (inside the cluster)
                                              │
                                              └──applies──> Cluster
  ✅ No external credentials needed
  ✅ Drift automatically corrected
  ✅ Git history IS the audit log
  ✅ Rollback = git revert
```

### Repository structure

```
app-repo/              ← application source code
  src/
  Dockerfile
  .github/workflows/   ← builds and pushes the image, then bumps the tag in config-repo

config-repo/           ← declarative desired state
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    staging/
      kustomization.yaml
      patch-replicas.yaml
    production/
      kustomization.yaml
      patch-replicas.yaml
```

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-production
spec:
  project: default
  source:
    repoURL: https://github.com/org/config-repo
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true          # delete resources removed from Git
      selfHeal: true       # revert manual kubectl changes
    syncOptions:
      - CreateNamespace=true
```

### Benefits

- Full audit trail — every change is a commit with an author and a reason
- Rollback is `git revert`
- Disaster recovery — recreate the entire cluster from the repo
- No cluster credentials in CI
- Drift detection and automatic correction

**Interview Tip:** The key architectural insight is **pull vs push**. In GitOps, the cluster pulls its own config, so your CI system never needs cluster credentials. That removes an entire class of security risk — a compromised CI runner can't touch production directly.

---

# Best Practices

## Monorepo pipelines

```yaml
# Only build what changed
- uses: dorny/paths-filter@v3
  id: changes
  with:
    filters: |
      api: ['apps/api/**', 'packages/shared/**']
      web: ['apps/web/**', 'packages/ui/**']

- name: Build API
  if: steps.changes.outputs.api == 'true'
  run: npm run build --workspace=api
```

```bash
# Turborepo / Nx — dependency-aware caching
turbo run build test --filter=...[origin/main]
nx affected --target=build --base=origin/main
# Only rebuilds projects affected by the change, and reuses cached results
```

## Caching

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      **/node_modules
      .next/cache
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-node-
```

```
Cache these:  dependencies, build outputs, Docker layers, test fixtures
Never cache:  secrets, anything with a mutable "latest" tag
Always key on a lockfile hash so a dependency change busts the cache
```

## Versioning

```
Semantic versioning: MAJOR.MINOR.PATCH
  MAJOR — breaking changes
  MINOR — new features, backward compatible
  PATCH — bug fixes

Conventional commits drive automated releases:
  feat: add user export        → MINOR bump
  fix: correct total rounding  → PATCH bump
  feat!: remove v1 API         → MAJOR bump

Tools: semantic-release, changesets, release-please
```

## The pipeline checklist

- [ ] Runs on every PR, not just main
- [ ] Under 10 minutes
- [ ] Fails fast — cheapest checks first
- [ ] Dependencies cached and keyed on the lockfile
- [ ] Build once, deploy the same artifact everywhere
- [ ] Artifacts tagged with the commit SHA (immutable)
- [ ] Security scanning blocks HIGH/CRITICAL
- [ ] Secrets via OIDC, never stored keys
- [ ] Staging deploy + smoke tests before production
- [ ] Production requires approval (or automated canary analysis)
- [ ] Automatic rollback on failed health checks
- [ ] Notifications on failure with a direct link to logs
- [ ] Concurrency control cancels superseded runs
- [ ] Least-privilege token permissions

---

# Rapid Fire

**What is a build artifact?**
The output of a build — a Docker image, a zip, a jar. It should be immutable and versioned by commit SHA.

**Why `npm ci` instead of `npm install` in CI?**
`ci` installs exactly from the lockfile, deletes `node_modules` first, is faster, and fails if `package.json` and the lockfile disagree. Reproducible builds require it.

**What is a self-hosted runner?**
A machine you control running CI jobs. Used for private network access, special hardware, or cost at high volume. ⚠️ Never use them for public repos — a forked PR could run arbitrary code on your infrastructure.

**What is a matrix build?**
Running the same job across multiple versions/OSes in parallel.

**What is fail-fast in a matrix?**
`fail-fast: true` cancels all matrix jobs when one fails. Set `false` when you want to see every failure at once.

**What is a webhook trigger vs polling?**
Webhooks fire instantly on push. Polling checks periodically — wasteful and delayed. Always prefer webhooks.

**What is an environment protection rule?**
Required reviewers, wait timers, or branch restrictions before a job can deploy to that environment.

**What is a smoke test?**
A minimal post-deploy check that the critical path works — health endpoint, login, one core transaction.

**What is drift?**
When actual infrastructure diverges from the declared configuration, usually from manual changes. GitOps self-heal or `terraform plan` detects it.

**What is a deployment ring?**
Progressive rollout by audience: internal → beta users → 1% → 10% → everyone.

**What is a change failure rate?**
The percentage of deployments causing a production incident. A DORA metric; elite performers stay under 15%.

**What is MTTR?**
Mean time to restore service. Improved by fast rollback, good observability, and small changes.

**What is trunk-based development?**
Everyone commits to short-lived branches merged to main within a day or two, with feature flags hiding incomplete work. It's what makes real CI possible.

**What is a feature flag?**
A runtime toggle that separates deploy from release. Deploy code dark, enable for 1% of users, ramp up, and kill instantly if something breaks.

**What is SBOM?**
Software Bill of Materials — a machine-readable inventory of every dependency. Increasingly required for compliance and essential for responding to CVEs like Log4Shell.

**What is supply chain security in CI?**
Pinning action versions to SHAs, verifying signatures, SBOM generation, provenance attestation (SLSA), and dependency scanning.

**Why pin GitHub Actions to a SHA?**
`uses: actions/checkout@v4` follows a mutable tag — if that tag is repointed to malicious code, your pipeline runs it. `@8ade135a41...` is immutable.

**What is a blue-green database problem?**
Two application versions sharing one database. Solved with expand/contract migrations, not by duplicating the database.

**How do you test a pipeline itself?**
`act` for local GitHub Actions runs, a dedicated test repository, or PR-based validation of workflow changes.

**What is caching vs artifacts in GitHub Actions?**
Cache is for speeding up builds (dependencies) and may be evicted. Artifacts are build outputs you intend to download or pass between jobs.

**How do you handle long-running e2e tests?**
Run them in parallel shards, run only the critical path on PRs, and run the full suite nightly or before release.

---

## 📌 Interview Checklist

- [ ] CI vs Continuous Delivery vs Continuous Deployment
- [ ] Why "build once, deploy many"?
- [ ] Write a GitHub Actions workflow from memory
- [ ] Explain OIDC and why it beats stored AWS keys
- [ ] Compare rolling, blue-green and canary — pick one and justify it
- [ ] Explain expand/contract database migrations
- [ ] How do you handle a flaky test?
- [ ] What happens after a secret leaks?
- [ ] What is GitOps and why is pull better than push?
- [ ] Name the four DORA metrics
