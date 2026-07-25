# 🐳 Docker Interview Questions

> Images · Containers · Layers · Dockerfile · Compose · Networking · Volumes · Kubernetes basics

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Images & Layers](#images--layers)
3. [Dockerfile](#dockerfile)
4. [Multi-Stage Builds](#multi-stage-builds)
5. [Containers](#containers)
6. [Networking](#networking)
7. [Volumes & Storage](#volumes--storage)
8. [Docker Compose](#docker-compose)
9. [Security](#security)
10. [Optimisation](#optimisation)
11. [Kubernetes Basics](#kubernetes-basics)
12. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is Docker and how is it different from a VM?

### Answer

Docker packages an application with its dependencies into a **container** — an isolated process on the host that shares the host kernel.

```
     VIRTUAL MACHINES                    CONTAINERS
  ┌──────┬──────┬──────┐           ┌──────┬──────┬──────┐
  │ App  │ App  │ App  │           │ App  │ App  │ App  │
  ├──────┼──────┼──────┤           ├──────┼──────┼──────┤
  │ Bins │ Bins │ Bins │           │ Bins │ Bins │ Bins │
  ├──────┼──────┼──────┤           └──────┴──────┴──────┘
  │Guest │Guest │Guest │           ┌────────────────────┐
  │  OS  │  OS  │  OS  │  ~GBs     │   Docker Engine    │  ~MBs
  ├──────┴──────┴──────┤           ├────────────────────┤
  │     Hypervisor     │           │      Host OS       │
  ├────────────────────┤           ├────────────────────┤
  │      Host OS       │           │      Hardware      │
  └────────────────────┘           └────────────────────┘
```

| | VM | Container |
|---|---|---|
| Isolation | Hardware-level (strong) | Process-level (kernel namespaces) |
| Size | GBs | MBs |
| Boot time | Minutes | **Milliseconds** |
| OS | Full guest OS per VM | Shares the host kernel |
| Density | ~10s per host | ~100s per host |
| Portability | Heavy images | Lightweight, layered |

### The underlying Linux primitives

```
Namespaces  → isolation: PID, network, mount, UTS, IPC, user, cgroup
cgroups     → resource limits: CPU, memory, I/O, network
UnionFS     → layered, copy-on-write filesystem
```

### Why do we use it?

**"It works on my machine" becomes "it works everywhere."** The image contains the exact runtime, libraries and OS packages — dev, CI and production run identical bits.

**Interview Tip:** The key distinction to state: containers **share the host kernel**, VMs each run their own. That single fact explains the size, speed and isolation-strength differences. It also explains why a Linux container can't run natively on Windows without a Linux VM underneath (which is what Docker Desktop does).

---

## What is the difference between an image and a container?

### Answer

- **Image** — an immutable, read-only template (a class)
- **Container** — a running instance with a thin writable layer on top (an object)

```
Image  (read-only layers)
  ├── Layer 3: COPY . .
  ├── Layer 2: RUN npm ci
  └── Layer 1: FROM node:20-alpine

Container = Image + a writable layer
  ┌─────────────────────┐
  │  Writable layer     │  ← all changes go here; DELETED when the container is removed
  ├─────────────────────┤
  │  Read-only layers   │  ← shared between all containers from this image
  └─────────────────────┘
```

```bash
docker images                # list images
docker ps                    # running containers
docker ps -a                 # all containers, including stopped
docker run image             # create + start a container from an image
docker commit container img  # ⚠️ create an image from a container (avoid — use a Dockerfile)
```

**Interview Tip:** Ten containers from one image share the read-only layers on disk — that's why running many containers of the same app costs almost nothing extra in storage.

**Common Mistakes:** Storing data in the container's writable layer. Remove the container and the data is gone. Use volumes.

---

# Images & Layers

## How does the Docker layer cache work?

### Answer

Each Dockerfile instruction creates a layer. On rebuild, Docker reuses cached layers **until it hits a change** — then every layer after it is rebuilt.

```dockerfile
# ❌ BAD — any source change invalidates npm ci (a 60-second rebuild every time)
FROM node:20-alpine
WORKDIR /app
COPY . .                    ← changes on EVERY commit
RUN npm ci                  ← cache busted every time
CMD ["node", "server.js"]

# ✅ GOOD — dependencies cached separately from source
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./       ← changes rarely
RUN npm ci                  ← cached until package.json changes
COPY . .                    ← changes often, but it's the LAST expensive step
CMD ["node", "server.js"]
```

### The rules

1. **Order from least to most frequently changing**
2. `COPY package*.json` before `COPY . .` — the single highest-impact optimisation
3. Combine related `RUN` commands with `&&` to reduce layers
4. Clean up in the **same** layer — deleting in a later layer doesn't shrink the image

```dockerfile
# ❌ The apt cache is still in layer 1 — the image is bigger even though the files are "gone"
RUN apt-get update && apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ✅ Same layer — the cache never gets committed
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

### Cache mounts (BuildKit) — even better

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
# The npm cache persists across builds WITHOUT being baked into the image
```

**Interview Tip:** "Copy the manifest, install dependencies, then copy the source" is the answer to "how do you speed up Docker builds?" Follow it with BuildKit cache mounts to show depth.

---

## What is a `.dockerignore` and why does it matter?

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
dist
build
coverage
.vscode
.idea
*.md
Dockerfile
docker-compose*.yml
.github
```

### Why do we use it?

1. **Speed** — the entire build context is sent to the daemon. Without ignoring `node_modules` and `.git`, you may ship hundreds of MB per build.
2. **Cache correctness** — a changed `.git` file would otherwise bust `COPY . .`
3. **Security** — prevents `.env` and credentials being baked into the image

**Interview Tip:** Copying host `node_modules` into a Linux container is a classic bug — native modules compiled for macOS silently break inside the container. `.dockerignore` prevents it.

---

# Dockerfile

## Explain the main Dockerfile instructions.

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base          # base image (+ named stage)

LABEL maintainer="jaydip@example.com"
LABEL org.opencontainers.image.source="https://github.com/user/repo"

WORKDIR /app                         # sets cwd, creates it if missing

ARG NODE_ENV=production              # BUILD-time variable
ENV NODE_ENV=$NODE_ENV               # RUNTIME variable (persists in the image)

COPY package*.json ./                # copy from build context
ADD https://x.com/f.tar.gz /tmp/     # COPY + URL fetch + auto-extract (prefer COPY)

RUN npm ci --omit=dev                # execute at BUILD time, creates a layer

USER node                            # drop root privileges

EXPOSE 3000                          # documentation only — does NOT publish the port

VOLUME /app/data                     # declare a mount point

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node healthcheck.js || exit 1

STOPSIGNAL SIGTERM

ENTRYPOINT ["node"]                  # the fixed executable
CMD ["server.js"]                    # default arguments (overridable)
```

### `CMD` vs `ENTRYPOINT`

| | Behaviour | Overridden by `docker run` args? |
|---|---|---|
| `CMD` | Default command | **Yes, replaced** |
| `ENTRYPOINT` | Fixed executable | No (only with `--entrypoint`) |
| Both | ENTRYPOINT + CMD as its args | CMD is replaced, ENTRYPOINT stays |

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]

# docker run myapp              → node server.js
# docker run myapp worker.js    → node worker.js     ← CMD replaced
```

### Shell form vs exec form — a real production issue

```dockerfile
CMD node server.js          # SHELL form → runs as: /bin/sh -c "node server.js"
                            # ❌ node becomes PID 2; signals go to the shell, not node
                            # ❌ SIGTERM is NOT forwarded → no graceful shutdown
                            # ❌ Docker waits 10s then SIGKILLs → dropped requests

CMD ["node", "server.js"]   # EXEC form → node is PID 1
                            # ✅ receives SIGTERM directly
```

**Interview Tip:** Always use the **exec form** (JSON array). The signal-handling difference is why containers "hang for 10 seconds on stop" and why deploys drop connections. This is one of the most practically important Docker details.

---

## What is the PID 1 problem?

### Answer

PID 1 in Linux has special responsibilities: reaping zombie processes and handling signals. Node.js as PID 1 doesn't reap children, and if you use the shell form it never receives SIGTERM.

```dockerfile
# ✅ Solution 1: dumb-init / tini as PID 1
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# ✅ Solution 2: Docker's built-in init
# docker run --init myapp

# ✅ Solution 3: handle signals in your app (still required regardless)
```

```js
// Your app must handle SIGTERM for zero-downtime deploys
process.on('SIGTERM', async () => {
  server.close(async () => {          // stop accepting new connections
    await db.end();                   // finish in-flight work
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
});
```

**Interview Tip:** Connect it to Kubernetes: on a rolling update, K8s sends SIGTERM and waits `terminationGracePeriodSeconds` (default 30s) before SIGKILL. Without signal handling, every deploy drops in-flight requests.

---

# Multi-Stage Builds

## What is a multi-stage build and why use it?

### Answer

Multiple `FROM` statements where later stages copy only the artifacts they need — build tools stay out of the final image.

```dockerfile
# syntax=docker/dockerfile:1

# ---------- Stage 1: dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- Stage 2: build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build          # TypeScript, bundling, etc.

# ---------- Stage 3: production dependencies only ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---------- Stage 4: runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init \
 && addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001

ENV NODE_ENV=production

COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder   --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder   --chown=nodejs:nodejs /app/package.json ./

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### The impact

```
Single stage with build tools:  1.2 GB
Multi-stage, production only:   180 MB
Distroless / alpine + minimal:   80 MB
```

Smaller images mean faster pulls, faster deploys, faster autoscaling and **a much smaller attack surface**.

### Frontend example — build then serve with Nginx

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# Final image: ~25 MB, and Node/npm are nowhere in it
```

**Interview Tip:** Beyond size, the security argument is stronger: your production image shouldn't contain npm, compilers, git or a shell. Mention **distroless** images (`gcr.io/distroless/nodejs20`) — no shell at all, which stops an attacker who gets code execution from doing much.

---

# Containers

## Essential container commands

```bash
# Run
docker run -d \                       # detached
  --name myapp \
  -p 3000:3000 \                      # hostPort:containerPort
  -e NODE_ENV=production \
  --env-file .env \
  -v $(pwd)/data:/app/data \          # bind mount
  --restart unless-stopped \
  --memory 512m --cpus 1.5 \          # resource limits
  --network mynetwork \
  --health-cmd "curl -f http://localhost:3000/health" \
  myimage:tag

# Inspect
docker ps -a
docker logs -f --tail 100 myapp
docker inspect myapp
docker stats                          # live resource usage
docker top myapp
docker port myapp

# Interact
docker exec -it myapp sh              # shell INSIDE a running container
docker exec myapp env
docker cp myapp:/app/log.txt ./       # copy files out

# Lifecycle
docker stop myapp                     # SIGTERM, then SIGKILL after 10s
docker stop -t 30 myapp               # give it 30 seconds
docker kill myapp                     # SIGKILL immediately
docker restart myapp
docker rm -f myapp

# Cleanup
docker system df                      # what's using disk
docker system prune -a --volumes      # ⚠️ removes everything unused
docker image prune -a
docker container prune
docker volume prune
```

### Resource limits — always set them

```bash
--memory 512m              # hard limit; exceeding it = OOMKilled (exit code 137)
--memory-reservation 256m  # soft limit
--cpus 1.5                 # 1.5 CPU cores
--pids-limit 100           # prevent fork bombs
```

```js
// ⚠️ Node doesn't see the cgroup limit by default in older versions
// Container has 512MB, but Node's heap default may assume the HOST's memory
// → Node happily allocates past the limit → OOMKilled with no JS error
// Fix:
// NODE_OPTIONS="--max-old-space-size=384"    (leave headroom below the container limit)
```

**Interview Tip:** Exit code **137** = SIGKILL, almost always the OOM killer. Exit code **143** = SIGTERM (graceful). Knowing those two numbers instantly diagnoses most container crashes.

---

# Networking

## What are the Docker network types?

### Answer

| Driver | Behaviour | Use for |
|---|---|---|
| **bridge** (default) | Private network on the host, needs port mapping | Single-host apps |
| **host** | Shares the host's network stack, no isolation | Maximum performance, Linux only |
| **none** | No networking | Isolated batch jobs |
| **overlay** | Multi-host networking | Swarm / distributed |
| **macvlan** | Container gets its own MAC/IP on the LAN | Legacy apps needing real IPs |

```bash
docker network create mynetwork
docker network create --driver bridge --subnet 172.20.0.0/16 mynet
docker network ls
docker network inspect mynetwork
docker network connect mynetwork mycontainer
```

### Container-to-container communication

```bash
# ✅ On a user-defined network, containers resolve each other BY NAME
docker network create app-net
docker run -d --name postgres --network app-net postgres:16
docker run -d --name api --network app-net myapi

# Inside the api container:
#   DATABASE_URL=postgres://user:pass@postgres:5432/db
#                                     ^^^^^^^^ the container NAME resolves via
#                                              Docker's embedded DNS

# ❌ The DEFAULT bridge network has no DNS — only legacy --link (deprecated)
```

### Common connection mistakes

```
❌ localhost inside a container refers to the CONTAINER itself, not the host
✅ Use the service/container name on a shared network
✅ To reach the host from a container: host.docker.internal (Mac/Windows)
                                       or the docker0 gateway IP (Linux)

❌ -p 3000:3000 but the app binds to 127.0.0.1
✅ The app must bind to 0.0.0.0 to accept traffic from outside the container
```

**Interview Tip:** "My app can't connect to the database" is the most common Docker support question, and the answer is nearly always one of those three. The `0.0.0.0` binding issue in particular catches everyone once.

---

# Volumes & Storage

## What are the storage options?

### Answer

| Type | Managed by | Location | Use for |
|---|---|---|---|
| **Named volume** | Docker | `/var/lib/docker/volumes/` | **Production data** ⭐ |
| **Bind mount** | You | Any host path | Development source code |
| **tmpfs** | Docker | Host RAM only | Secrets, temp files |

```bash
# Named volume — portable, backed up as a unit, works with volume drivers
docker volume create pgdata
docker run -v pgdata:/var/lib/postgresql/data postgres:16

# Bind mount — live-reload during development
docker run -v $(pwd):/app -v /app/node_modules node:20 npm run dev
#             ^^^^^^^^^^^^^ host source     ^^^^^^^^^^^^^^^^^ anonymous volume
#             The second mount SHADOWS host node_modules so the container
#             keeps its own Linux-compiled dependencies

# Read-only
docker run -v $(pwd)/config:/app/config:ro myapp

# tmpfs — never written to disk
docker run --tmpfs /app/tmp:rw,size=64m myapp
```

### Backing up a volume

```bash
docker run --rm \
  -v pgdata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/pgdata-$(date +%F).tar.gz -C /data .
```

**Interview Tip:** The `-v /app/node_modules` anonymous-volume trick is the standard fix for the "I mounted my source and now node_modules is broken" problem. It's a very practical answer that shows you've actually developed in containers.

---

# Docker Compose

## How do you use Docker Compose?

```yaml
# compose.yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: development           # build only up to this stage
      args:
        NODE_ENV: development
    ports:
      - "3000:3000"
      - "9229:9229"                 # Node debugger
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://postgres:postgres@db:5432/app
      REDIS_URL: redis://cache:6379
    env_file:
      - .env
    volumes:
      - .:/app                      # live reload
      - /app/node_modules           # keep the container's node_modules
    depends_on:
      db:
        condition: service_healthy  # ⭐ wait until the DB is actually READY
      cache:
        condition: service_started
    restart: unless-stopped
    networks: [backend]
    develop:
      watch:                        # Compose Watch — sync/rebuild on file change
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks: [backend]

  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    networks: [backend]

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: [api]
    networks: [backend]

volumes:
  pgdata:
  redisdata:

networks:
  backend:
    driver: bridge
```

```bash
docker compose up -d
docker compose up --build
docker compose logs -f api
docker compose exec api sh
docker compose ps
docker compose down            # stop + remove containers/networks
docker compose down -v         # ⚠️ also removes volumes (deletes your data)
docker compose watch           # live sync/rebuild

# Override for different environments
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

**Interview Tip:** `depends_on` alone only waits for the container to **start**, not to be ready to accept connections. Your API will crash on startup because Postgres is still initialising. The fix is `condition: service_healthy` with a `healthcheck` — this catches almost everyone the first time.

---

# Security

## How do you secure Docker containers?

### Answer

```dockerfile
# 1. NEVER run as root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# 2. Pin base image versions — and prefer digests for reproducibility
FROM node:20.11.1-alpine3.19
FROM node@sha256:abc123...            # immutable

# 3. Minimal base images
FROM node:20-alpine                   # ~50MB vs ~350MB for the full image
FROM gcr.io/distroless/nodejs20       # no shell, no package manager

# 4. Never bake secrets into layers
# ❌ ENV API_KEY=secret          ← visible in `docker history` FOREVER
# ❌ COPY .env .                 ← in a layer even if you delete it later
# ✅ BuildKit secret mounts:
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
# ✅ Runtime: inject via environment or a secrets manager
```

```bash
# 5. Runtime hardening
docker run \
  --read-only \                            # immutable filesystem
  --tmpfs /tmp \
  --cap-drop ALL \                         # drop all Linux capabilities
  --cap-add NET_BIND_SERVICE \             # add back only what's needed
  --security-opt no-new-privileges \       # block privilege escalation
  --user 1001:1001 \
  --memory 512m --cpus 1 --pids-limit 100 \
  myapp

# 6. Scan for vulnerabilities
docker scout cves myimage:tag
trivy image myimage:tag
grype myimage:tag

# 7. Sign and verify images
docker trust sign myimage:tag
cosign sign --key cosign.key myimage:tag
```

### The security checklist

- [ ] Non-root user
- [ ] Minimal/distroless base image
- [ ] Pinned versions (ideally digests)
- [ ] No secrets in the image (`docker history` reveals everything)
- [ ] Read-only root filesystem
- [ ] Dropped capabilities
- [ ] Resource limits set
- [ ] Images scanned in CI, build fails on HIGH/CRITICAL
- [ ] Docker socket never mounted into a container
- [ ] Base images rebuilt regularly for OS patches

**Interview Tip:** The biggest single risk: **mounting `/var/run/docker.sock` into a container is equivalent to giving it root on the host.** Any container with the Docker socket can start a privileged container mounting the host filesystem. It's common in CI setups and it's a full compromise path.

---

# Optimisation

## How do you make Docker images smaller and builds faster?

```dockerfile
# 1. Alpine or distroless base
FROM node:20-alpine              # 50MB   (vs node:20 at ~350MB)
FROM gcr.io/distroless/nodejs20  # 110MB, no shell

# 2. Multi-stage — build tools never reach production

# 3. Combine RUN commands, clean in the SAME layer
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && npm ci \
 && apk del .build-deps

# 4. Production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# 5. .dockerignore

# 6. BuildKit cache mounts
RUN --mount=type=cache,target=/root/.npm npm ci

# 7. Order layers by change frequency
```

```bash
# Build with BuildKit + inline cache for CI
DOCKER_BUILDKIT=1 docker build \
  --cache-from myregistry/app:latest \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t myregistry/app:$SHA .

# Multi-platform builds
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:tag --push .

# Analyse what's taking space
docker history myimage:tag --no-trunc
dive myimage:tag                 # interactive layer explorer
```

### Alpine caveats

```
✅ Tiny (5MB base)
⚠️ musl libc instead of glibc — some native modules fail or behave differently
⚠️ DNS resolution differences have caused real production issues
⚠️ Python/native builds need extra packages

If you hit weird native-module errors, try node:20-slim (Debian) instead.
```

**Interview Tip:** Alpine isn't automatically the right answer. `node:20-slim` (Debian-based, ~80MB) avoids musl compatibility issues while still being small. Knowing that tradeoff beats blindly recommending Alpine.

---

# Kubernetes Basics

## What are the core Kubernetes objects?

### Answer

```
Pod          — smallest unit; one or more containers sharing network + storage
ReplicaSet   — maintains N identical pods
Deployment   — manages ReplicaSets, handles rolling updates and rollbacks ⭐
Service      — stable network endpoint + load balancing across pods
Ingress      — HTTP routing from outside the cluster
ConfigMap    — non-sensitive configuration
Secret       — sensitive data (base64-encoded, NOT encrypted by default)
Namespace    — logical isolation
StatefulSet  — stable identity + storage (databases)
DaemonSet    — one pod per node (log collectors, monitoring agents)
Job/CronJob  — run-to-completion and scheduled tasks
HPA          — horizontal pod autoscaler
PVC          — persistent volume claim
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels: { app: api }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # zero-downtime
  template:
    metadata:
      labels: { app: api }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: myregistry/api:v1.2.3
          ports: [{ containerPort: 3000 }]

          resources:
            requests: { memory: "256Mi", cpu: "250m" }   # scheduling guarantee
            limits:   { memory: "512Mi", cpu: "1000m" }  # hard cap

          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef: { name: db-secret, key: url }
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef: { name: app-config, key: log_level }

          livenessProbe:                  # restart if this fails
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 15
            periodSeconds: 20

          readinessProbe:                 # remove from the Service if this fails
            httpGet: { path: /ready, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 5

          startupProbe:                   # for slow-starting apps
            httpGet: { path: /health, port: 3000 }
            failureThreshold: 30
            periodSeconds: 10

          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities: { drop: ["ALL"] }
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector: { app: api }
  ports: [{ port: 80, targetPort: 3000 }]
```

### Service types

| Type | Exposes | Use for |
|---|---|---|
| `ClusterIP` | Inside the cluster only | Internal services (default) |
| `NodePort` | A port on every node | Dev/testing |
| `LoadBalancer` | Cloud load balancer | Production external access |
| `ExternalName` | DNS CNAME | Referencing external services |

### Liveness vs Readiness — the distinction that matters

```
LIVENESS  fails → the container is RESTARTED
                  Use for: deadlocks, unrecoverable states
                  ⚠️ If it checks a dependency (the DB), a DB outage
                     restarts every pod in a loop — making things worse

READINESS fails → the pod is REMOVED FROM THE SERVICE (not restarted)
                  Use for: still warming up, dependency temporarily down
                  ✅ Traffic stops, the pod recovers, traffic resumes
```

```bash
kubectl get pods -w
kubectl describe pod mypod              # events — the first place to look
kubectl logs -f mypod --previous        # logs from the CRASHED container
kubectl exec -it mypod -- sh
kubectl rollout status deployment/api
kubectl rollout undo deployment/api     # instant rollback
kubectl scale deployment/api --replicas=5
kubectl top pods
```

**Interview Tip:** The liveness-probe-checking-the-database mistake is a genuinely famous outage pattern: the database blips, every pod's liveness probe fails, Kubernetes restarts all of them simultaneously, and the restart storm overwhelms the recovering database. **Liveness = "is this process healthy?" Readiness = "can it serve traffic right now?"**

---

# Rapid Fire

**What is the difference between `docker run` and `docker start`?**
`run` creates and starts a new container from an image. `start` restarts an existing stopped container.

**What is the difference between `COPY` and `ADD`?**
`COPY` copies files. `ADD` also fetches URLs and auto-extracts tar archives. Prefer `COPY` — `ADD`'s magic behaviour causes surprises.

**What is `EXPOSE` actually doing?**
Documentation and metadata only. It does not publish anything — you still need `-p` or `--publish`.

**What is the difference between `docker stop` and `docker kill`?**
`stop` sends SIGTERM then SIGKILL after the grace period. `kill` sends SIGKILL immediately.

**What is a dangling image?**
An untagged image (`<none>:<none>`) left behind when a tag moves to a new build. Clean with `docker image prune`.

**What is Docker Hub rate limiting?**
Anonymous pulls are limited (100 per 6 hours per IP). In CI, authenticate or mirror to your own registry, or builds will randomly fail.

**How do you debug a container that exits immediately?**
`docker logs <id>` first. If there's no output, override the entrypoint: `docker run -it --entrypoint sh myimage`.

**What is a distroless image?**
An image containing only your app and its runtime — no shell, no package manager, no coreutils. Minimal attack surface, harder to debug.

**What is BuildKit?**
Docker's modern build engine: parallel stages, cache mounts, secret mounts, and better caching. Default in recent versions.

**What is `docker buildx`?**
Extended build capabilities — multi-platform (amd64 + arm64) images from one command.

**What is the difference between Docker Swarm and Kubernetes?**
Swarm is simple and built into Docker but effectively unmaintained. Kubernetes is complex but is the industry standard with a vast ecosystem.

**What is a container registry?**
Storage for images: Docker Hub, Amazon ECR, Google Artifact Registry, GitHub Container Registry, Harbor.

**How do you handle database migrations in containers?**
Run them as a separate init container or a Kubernetes Job before the app starts — never inside the app's startup path across N replicas.

**How do you do zero-downtime deploys with containers?**
Rolling updates with `maxUnavailable: 0`, readiness probes, `preStop` hooks, and SIGTERM handling in the app.

**What is a sidecar container?**
A helper container in the same pod — log shipper, service mesh proxy, config reloader.

**What is an init container?**
Runs to completion before the app containers start — migrations, waiting for dependencies, fetching config.

**What causes exit code 137?**
SIGKILL, almost always the OOM killer. Raise the memory limit or fix the leak.

**What causes exit code 143?**
SIGTERM — a normal graceful shutdown.

**Why is my container's filesystem full?**
Logs written inside the container. Configure log rotation (`--log-opt max-size=10m --log-opt max-file=3`) or log to stdout and let the platform handle it.

**How do you pass build-time vs runtime configuration?**
`ARG` for build time (not present at runtime), `ENV` for runtime. Never put secrets in either — they're visible in `docker history`.

**What is the OCI?**
The Open Container Initiative — the standard for image and runtime formats, which is why Podman, containerd and CRI-O can all run "Docker" images.

**What is Podman?**
A daemonless, rootless container engine that's Docker-CLI compatible. Better security posture by default.

---

## 📌 Interview Checklist

- [ ] Containers vs VMs — explain via the shared kernel
- [ ] How does layer caching work, and how do you order a Dockerfile?
- [ ] Why does `CMD node app.js` break graceful shutdown?
- [ ] Write a production multi-stage Dockerfile from memory
- [ ] Named volumes vs bind mounts
- [ ] Why can't my container reach the database on `localhost`?
- [ ] Name five container security hardening steps
- [ ] What does exit code 137 mean?
- [ ] Liveness vs readiness probes — and why the difference matters
- [ ] Why is mounting the Docker socket dangerous?
