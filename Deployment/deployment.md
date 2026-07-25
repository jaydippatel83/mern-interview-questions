# 🚀 Deployment Interview Questions

> Nginx · PM2 · SSL/Certbot · VPS · Ubuntu · DNS · Reverse proxy · Environment variables · Caching

---

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [VPS Setup](#vps-setup)
3. [Nginx](#nginx)
4. [PM2](#pm2)
5. [SSL & Certbot](#ssl--certbot)
6. [DNS](#dns)
7. [Environment Variables](#environment-variables)
8. [Caching & Performance](#caching--performance)
9. [Zero-Downtime Deployment](#zero-downtime-deployment)
10. [Monitoring & Logs](#monitoring--logs)
11. [Security Hardening](#security-hardening)
12. [Rapid Fire](#rapid-fire)

---

# Deployment Options

## Where can you deploy a MERN application?

### Answer

| Option | Control | Cost | Ops burden | Best for |
|---|---|---|---|---|
| **VPS** (DigitalOcean, Linode, EC2) | Full | $5–50/mo | High | Learning, full control, predictable cost |
| **PaaS** (Render, Railway, Fly.io, Heroku) | Medium | $7–50/mo | Low | Small teams shipping fast |
| **Serverless** (Vercel, Netlify, Lambda) | Low | Pay-per-use | Lowest | Frontend, spiky APIs |
| **Containers** (ECS, Cloud Run, K8s) | High | Variable | Medium–High | Microservices, scale |

### A typical MERN split

```
Frontend (React/Next.js)  → Vercel / Netlify / CloudFront + S3
Backend (Node/Express)    → Render / Railway / EC2 / ECS
Database (MongoDB)        → MongoDB Atlas   ← managed, don't self-host
Cache (Redis)             → Upstash / ElastiCache
Files                     → S3 / Cloudinary
```

**Interview Tip:** *"I'd never self-host the database unless there's a compliance reason."* Managed database services handle backups, failover, patching and monitoring — the operational work that actually bites you at 3am. That answer shows judgement about where to spend your effort.

---

# VPS Setup

## Walk through setting up a production Ubuntu server.

```bash
# ============ 1. INITIAL ACCESS ============
ssh root@your-server-ip

# ============ 2. UPDATE ============
apt update && apt upgrade -y
apt install -y curl git build-essential ufw fail2ban unattended-upgrades

# ============ 3. CREATE A NON-ROOT USER ============
adduser deploy
usermod -aG sudo deploy

# Copy SSH keys to the new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# ============ 4. HARDEN SSH ============
nano /etc/ssh/sshd_config
```

```
Port 2222                          # non-standard port cuts bot noise
PermitRootLogin no                 # ⭐ critical
PasswordAuthentication no          # ⭐ critical — keys only
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers deploy
ClientAliveInterval 300
X11Forwarding no
```

```bash
systemctl restart sshd
# ⚠️ Open a SECOND terminal and verify you can still log in BEFORE closing this one

# ============ 5. FIREWALL ============
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp     # SSH (your custom port!)
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw enable
ufw status verbose
# ⚠️ Do NOT open 3000 or 27017 — those stay behind Nginx/localhost

# ============ 6. FAIL2BAN ============
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled  = true
port     = 2222
maxretry = 3
bantime  = 3600
findtime = 600
EOF
systemctl restart fail2ban
fail2ban-client status sshd

# ============ 7. AUTOMATIC SECURITY UPDATES ============
dpkg-reconfigure --priority=low unattended-upgrades

# ============ 8. SWAP (for small droplets) ============
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10

# ============ 9. NODE.JS (via nvm as the deploy user) ============
su - deploy
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20

# ============ 10. NGINX + PM2 ============
sudo apt install -y nginx
npm install -g pm2

# ============ 11. TIMEZONE & NTP ============
sudo timedatectl set-timezone Asia/Kolkata
sudo timedatectl set-ntp on
```

**Interview Tip:** The three non-negotiables: **disable root login, disable password auth, enable a firewall.** A fresh cloud server gets brute-forced within minutes of being online — `fail2ban` logs will show you hundreds of attempts on day one.

**Common Mistakes:** Restarting sshd after a config change and logging out without testing — locking yourself out permanently. Always keep a second session open.

---

# Nginx

## Write a production Nginx configuration.

```nginx
# /etc/nginx/nginx.conf — global
user www-data;
worker_processes auto;                    # one per CPU core
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    # ---------- Basics ----------
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;                    # hide the Nginx version

    client_max_body_size 20M;             # max upload size
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ---------- Logging ----------
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" rt=$request_time '
                    'uct="$upstream_connect_time" urt="$upstream_response_time"';
    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log warn;

    # ---------- Compression ----------
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json
               application/javascript application/xml+rss
               application/atom+xml image/svg+xml;

    # Brotli is better if the module is available
    # brotli on;
    # brotli_comp_level 6;

    # ---------- Rate limiting ----------
    limit_req_zone  $binary_remote_addr zone=general:10m rate=30r/s;
    limit_req_zone  $binary_remote_addr zone=login:10m   rate=1r/s;
    limit_conn_zone $binary_remote_addr zone=perip:10m;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

```nginx
# /etc/nginx/sites-available/myapp

# ---------- Upstream with keepalive ----------
upstream nodejs_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;                        # reuse connections to Node
}

# ---------- HTTP → HTTPS redirect ----------
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;           # keep this for cert renewal
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ---------- Main HTTPS server ----------
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name example.com www.example.com;

    # ---------- SSL ----------
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # ---------- Security headers ----------
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self'" always;

    root /var/www/myapp/dist;
    index index.html;

    # ---------- Static assets — long cache ----------
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # ---------- SPA fallback ----------
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";     # index.html must NOT be cached
    }

    # ---------- API reverse proxy ----------
    location /api/ {
        limit_req zone=general burst=20 nodelay;
        limit_conn perip 20;

        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header Connection        "";     # required for keepalive

        proxy_connect_timeout 5s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;
    }

    # ---------- Stricter limit on auth ----------
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://nodejs_backend;
        include /etc/nginx/proxy_params;
    }

    # ---------- WebSocket ----------
    location /socket.io/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;      # ⭐ required
        proxy_set_header Connection "upgrade";          # ⭐ required
        proxy_set_header Host       $host;
        proxy_read_timeout 86400;                       # long-lived connections
    }

    # ---------- Server-Sent Events ----------
    location /api/stream {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;                # ⭐ SSE breaks with buffering on
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400;
    }

    # ---------- Block hidden files ----------
    location ~ /\.(?!well-known) {
        deny all;
    }

    # ---------- Health check ----------
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

```bash
nginx -t                          # ⭐ ALWAYS test before reloading
systemctl reload nginx            # graceful — no dropped connections
systemctl restart nginx           # drops connections; avoid in production

ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
```

**Interview Tip:** The WebSocket headers (`Upgrade` and `Connection: upgrade`) and `proxy_buffering off` for SSE are the two Nginx details that come up constantly in real deployments — a Socket.io app "works locally but not in production" is nearly always the missing upgrade headers.

**Common Mistakes:** Forgetting `X-Forwarded-For` and `X-Forwarded-Proto` — without them, Express's `req.ip` returns `127.0.0.1` (breaking rate limiting) and `req.protocol` returns `http` (breaking secure cookie logic). You also need `app.set('trust proxy', 1)` in Express.

---

# PM2

## How do you run Node.js in production with PM2?

### Answer

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/server.js',

      instances: 'max',              // one per CPU core
      exec_mode: 'cluster',          // ⭐ enables clustering + zero-downtime reload

      env: { NODE_ENV: 'development', PORT: 3000 },
      env_production: { NODE_ENV: 'production', PORT: 3000 },

      // Memory
      max_memory_restart: '500M',    // restart if it leaks past this
      node_args: '--max-old-space-size=460',

      // Logs
      error_file: '/var/log/pm2/api-error.log',
      out_file: '/var/log/pm2/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart behaviour
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',             // must stay up this long to count as "started"
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,

      // Graceful shutdown
      kill_timeout: 5000,            // SIGTERM → wait 5s → SIGKILL
      listen_timeout: 8000,
      wait_ready: true,              // wait for process.send('ready')

      // Don't watch files in production
      watch: false,
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 2,
      exec_mode: 'fork',             // workers don't need cluster mode
      cron_restart: '0 3 * * *',     // restart nightly
    },
  ],
};
```

```js
// server.js — cooperate with PM2
const server = app.listen(PORT, () => {
  if (process.send) process.send('ready');    // tells PM2 we're actually ready
});

process.on('SIGINT', gracefulShutdown);       // PM2 sends SIGINT on reload
process.on('SIGTERM', gracefulShutdown);

async function gracefulShutdown() {
  server.close(async () => {
    await mongoose.connection.close();
    await redis.quit();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
```

```bash
# Commands
pm2 start ecosystem.config.js --env production
pm2 reload api              # ⭐ ZERO-DOWNTIME — restarts workers one at a time
pm2 restart api             # ⚠️ kills all, then starts — brief downtime
pm2 stop api
pm2 delete api

pm2 list
pm2 logs api --lines 100
pm2 monit                   # live dashboard
pm2 describe api
pm2 flush                   # clear logs

# Survive a server reboot
pm2 startup                 # prints a command — run it with sudo
pm2 save                    # save the current process list

# Log rotation — essential, or logs will fill the disk
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### `reload` vs `restart` — the key distinction

```
pm2 restart  → SIGKILL all workers, then start new ones
               ⚠️ Downtime while nothing is listening

pm2 reload   → For each worker: start a new one, wait for 'ready',
               then gracefully stop the old one
               ✅ Zero downtime — requires cluster mode
```

**Interview Tip:** `wait_ready: true` plus `process.send('ready')` is what makes `pm2 reload` genuinely zero-downtime. Without it, PM2 assumes the process is ready the moment it starts — before the server is actually listening — and requests hit a dead worker.

**Common Mistakes:** Forgetting `pm2 save` and `pm2 startup`, so the app doesn't come back after a reboot. Also: no log rotation, which fills the disk and takes down the whole server.

---

# SSL & Certbot

## How do you set up free HTTPS with Let's Encrypt?

```bash
# ============ INSTALL ============
sudo apt install -y certbot python3-certbot-nginx

# ============ ISSUE A CERTIFICATE ============
# Nginx plugin — automatically edits your config
sudo certbot --nginx -d example.com -d www.example.com

# Standalone (Nginx must be stopped)
sudo certbot certonly --standalone -d example.com

# Webroot (Nginx stays running) ⭐ preferred
sudo certbot certonly --webroot -w /var/www/certbot -d example.com

# Wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges dns -d "*.example.com"

# DNS plugin — fully automated wildcards
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.example.com" -d example.com

# ============ AUTO-RENEWAL ============
sudo certbot renew --dry-run        # test it works
systemctl status certbot.timer      # the systemd timer runs it twice daily

# Manual cron alternative
0 3 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"

# ============ INSPECT ============
sudo certbot certificates
openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -noout -dates
```

### Key facts

```
Validity:      90 days (short by design — forces automation)
Renewal:       attempted when 30 days remain
Rate limits:   50 certificates per registered domain per week
               5 duplicate certificates per week  ← easy to hit while testing
Staging:       --dry-run or --test-cert while experimenting
```

### Testing your SSL configuration

```bash
# Grade your setup: https://www.ssllabs.com/ssltest/
# Target: A or A+

curl -vI https://example.com 2>&1 | grep -i "SSL\|TLS"
openssl s_client -connect example.com:443 -servername example.com
```

### Getting an A+

```nginx
ssl_protocols TLSv1.2 TLSv1.3;              # no TLS 1.0/1.1
ssl_prefer_server_ciphers off;               # let modern clients choose
ssl_stapling on;                             # OCSP stapling
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

**Interview Tip:** The most common Certbot failure is renewal breaking silently because the webroot path changed or port 80 got blocked. Certificates then expire and the site goes down with a browser security warning. **Always monitor certificate expiry** as an alert, don't just trust the timer.

---

# DNS

## How does DNS work for a deployment?

### Answer

```
Browser → OS cache → Resolver (ISP/1.1.1.1) → Root (.) → TLD (.com) → Authoritative NS
                                                                          │
                                                          returns the A record
```

### Record types you need

```
Type    Name              Value                    Purpose
─────────────────────────────────────────────────────────────────────
A       example.com       203.0.113.10             IPv4
AAAA    example.com       2001:db8::1              IPv6
CNAME   www               example.com              alias (NOT at the apex)
ALIAS   example.com       lb.aws.com               apex alias (provider-specific)
MX      example.com       10 mail.google.com       email routing
TXT     example.com       "v=spf1 include:_spf..." SPF — anti-spoofing
TXT     _dmarc            "v=DMARC1; p=quarantine" DMARC
CAA     example.com       0 issue "letsencrypt.org" which CAs may issue certs
NS      example.com       ns1.provider.com         delegation
```

### TTL strategy

```
Normal operations:  3600s (1 hour)  — good caching
Before a migration: 300s (5 min)    — lower it 24–48 HOURS in advance
After a migration:  back to 3600s

⚠️ Lowering the TTL right before a cutover does nothing — resolvers are
   already caching the OLD long TTL. You must lower it in advance.
```

### Verification

```bash
dig example.com A +short
dig example.com MX
dig @8.8.8.8 example.com          # query a specific resolver
dig +trace example.com            # full resolution path
nslookup example.com
host example.com

# Check propagation globally: https://dnschecker.org
```

### The apex/CNAME problem

```
❌ CNAME at the zone apex is forbidden by the DNS spec
   example.com  CNAME  myapp.herokuapp.com    ← invalid

✅ Solutions:
   - ALIAS/ANAME record (Route 53, Cloudflare, DNSimple)
   - Cloudflare CNAME flattening
   - Point the apex to an A record and use www as the canonical domain
```

**Interview Tip:** The TTL-in-advance point is the practical DNS answer. Teams routinely lower the TTL an hour before a migration, then wonder why traffic keeps hitting the old server for hours — because resolvers cached the previous 24-hour TTL before the change.

---

# Environment Variables

## How do you manage configuration across environments?

```bash
# .env.example — COMMIT this (documentation for the team)
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/myapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-min-32-characters
AWS_REGION=ap-south-1

# .env — NEVER commit (add to .gitignore)
```

```js
// config/index.js — validate at BOOT, fail loudly
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().transform((s) => s.split(',')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);         // ⭐ crash at startup, not at 3am on a code path
}

export const config = parsed.data;
```

### Where to store secrets

| Method | Security | Use for |
|---|---|---|
| `.env` file on the server (chmod 600) | Low–Medium | Small VPS deployments |
| Platform env vars (Render, Vercel) | Medium | PaaS |
| AWS Secrets Manager / Parameter Store | High | AWS workloads |
| HashiCorp Vault | Highest | Enterprise, dynamic secrets |
| Docker/K8s secrets | Medium | Container platforms |

```bash
# On a VPS
sudo chown deploy:deploy /var/www/myapp/.env
sudo chmod 600 /var/www/myapp/.env         # only the owner can read it
```

```js
// ⚠️ Frontend "env vars" are NOT secret
// VITE_*, NEXT_PUBLIC_*, REACT_APP_* are INLINED into the JS bundle at build time.
// Anyone can read them in DevTools. Never put an API secret there.
```

**Interview Tip:** Validating config at boot with Zod is a strong, concrete practice: a missing `DATABASE_URL` should crash the process on startup where you'll see it immediately, not produce a confusing `undefined` error under production load hours later.

---

# Caching & Performance

## What caching layers exist in a deployment?

```
Browser  →  CDN  →  Nginx  →  Application  →  Redis  →  Database
```

```nginx
# ---------- Browser caching via Nginx ----------
# Hashed static assets — cache forever
location ~* \.[0-9a-f]{8}\.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# index.html — never cache (it references the hashed assets)
location = /index.html {
    add_header Cache-Control "no-cache, must-revalidate";
}

# ---------- Nginx proxy cache for API responses ----------
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m
                 max_size=1g inactive=60m use_temp_path=off;

location /api/public/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
    proxy_cache_background_update on;      # serve stale while refreshing
    proxy_cache_lock on;                   # only ONE request rebuilds the cache
    add_header X-Cache-Status $upstream_cache_status;   # HIT/MISS/STALE

    proxy_pass http://nodejs_backend;
}
```

```js
// ---------- Application-level HTTP caching ----------
app.get('/api/products', async (req, res) => {
  const products = await getProducts();

  const etag = crypto.createHash('md5').update(JSON.stringify(products)).digest('hex');
  res.set('ETag', `"${etag}"`);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

  if (req.get('If-None-Match') === `"${etag}"`) {
    return res.status(304).end();          // no body — saves bandwidth
  }

  res.json(products);
});
```

### Performance checklist

```
✅ Gzip/Brotli compression enabled
✅ HTTP/2 enabled
✅ Static assets: content-hashed filenames + 1-year immutable cache
✅ index.html: no-cache
✅ CDN in front of static assets
✅ Keepalive between Nginx and Node
✅ Redis for hot data
✅ Database indexes on every filter/sort/join column
✅ Connection pooling
✅ Images: WebP/AVIF, correct dimensions, lazy loaded
```

**Interview Tip:** `proxy_cache_lock on` is the Nginx answer to cache stampede — when a cached entry expires, only one request goes to the origin while the rest wait. Combined with `proxy_cache_use_stale`, your site stays up even when the backend is down.

---

# Zero-Downtime Deployment

## How do you deploy without dropping requests?

```bash
#!/bin/bash
# deploy.sh — atomic symlink deployment
set -euo pipefail

APP_DIR=/var/www/myapp
RELEASES=$APP_DIR/releases
SHARED=$APP_DIR/shared
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE=$RELEASES/$TIMESTAMP

echo "▶ Creating release $TIMESTAMP"
mkdir -p "$RELEASE"

# 1. Fetch the code
git clone --depth 1 --branch main git@github.com:user/repo.git "$RELEASE"
cd "$RELEASE"

# 2. Link shared resources (persist across releases)
ln -sfn "$SHARED/.env" "$RELEASE/.env"
ln -sfn "$SHARED/uploads" "$RELEASE/uploads"
ln -sfn "$SHARED/node_modules" "$RELEASE/node_modules"

# 3. Build
npm ci --omit=dev
npm run build

# 4. Migrate (must be backward compatible!)
npm run migrate

# 5. Atomic switch — a symlink swap is instantaneous
ln -sfn "$RELEASE" "$APP_DIR/current"

# 6. Zero-downtime reload
pm2 reload ecosystem.config.js --env production --update-env

# 7. Health check with retry
for i in {1..30}; do
  if curl -sf http://localhost:3000/health > /dev/null; then
    echo "✅ Healthy"
    break
  fi
  [ $i -eq 30 ] && { echo "❌ Health check failed"; exit 1; }
  sleep 2
done

# 8. Reload Nginx (picks up any new static assets)
sudo nginx -t && sudo systemctl reload nginx

# 9. Keep the last 5 releases for rollback
cd "$RELEASES" && ls -t | tail -n +6 | xargs -r rm -rf

echo "🚀 Deployed $TIMESTAMP"
```

```bash
#!/bin/bash
# rollback.sh
PREVIOUS=$(ls -t /var/www/myapp/releases | sed -n '2p')
ln -sfn "/var/www/myapp/releases/$PREVIOUS" /var/www/myapp/current
pm2 reload all
echo "↩️  Rolled back to $PREVIOUS"
```

### The directory layout

```
/var/www/myapp/
├── current -> releases/20260725120000    ← symlink; swapping it is atomic
├── releases/
│   ├── 20260725120000/
│   ├── 20260724093000/
│   └── 20260723150000/
└── shared/                                ← survives every deploy
    ├── .env
    ├── uploads/
    └── logs/
```

### Why this works

- The symlink swap is **atomic** — there's no moment where the directory is half-updated
- `pm2 reload` restarts workers one at a time, so something is always listening
- Old releases stay on disk, so rollback is a symlink change plus a reload
- Shared directories mean uploads and config survive deploys

**Interview Tip:** This is the Capistrano pattern, and it's still the right answer for VPS deployments. The three critical pieces: **atomic symlink switch**, **shared directory for state**, and **health check before declaring success**.

---

# Monitoring & Logs

```bash
# ---------- System ----------
htop                              # CPU/memory per process
df -h                             # disk usage — a full disk kills everything
du -sh /var/log/*                 # find what's eating disk
free -h
iostat -x 2
netstat -tulpn | grep LISTEN

# ---------- Application ----------
pm2 monit
pm2 logs --lines 200
journalctl -u nginx -f
tail -f /var/log/nginx/error.log

# ---------- Log analysis ----------
# Top IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head

# Slowest requests (with the log_format above)
awk '{print $NF, $7}' /var/log/nginx/access.log | sort -rn | head -20

# Error rate
grep -c ' 5[0-9][0-9] ' /var/log/nginx/access.log
```

```
# ---------- Log rotation ----------
# /etc/logrotate.d/myapp
/var/log/pm2/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### What to monitor

```
Uptime:       UptimeRobot, Better Uptime, Pingdom (external checks)
Errors:       Sentry — with source maps uploaded so stack traces are readable
Metrics:      Prometheus + Grafana, or Datadog/New Relic
Logs:         Loki, ELK, or a managed service
Certificates: expiry alerts ⭐ (a surprisingly common outage cause)
Disk:         alert at 80% — a full disk breaks everything silently
```

**Interview Tip:** Two things that take down small deployments and are trivially preventable: **a full disk** (usually from unrotated logs) and **an expired SSL certificate**. Both should have alerts before they cause an incident.

---

# Security Hardening

```bash
# ---------- Checklist ----------
✅ Root login and password auth disabled
✅ SSH on a non-standard port, key-only
✅ UFW: only 80, 443, and your SSH port
✅ fail2ban on SSH (and Nginx if exposed)
✅ Automatic security updates enabled
✅ Node runs as a non-root user
✅ App binds to 127.0.0.1, only Nginx is public
✅ MongoDB/Redis bound to localhost, NEVER 0.0.0.0
✅ .env chmod 600
✅ Security headers set in Nginx
✅ Rate limiting at Nginx AND the application
✅ HTTPS everywhere with HSTS
✅ Regular backups, and restores TESTED
```

```bash
# ---------- Database binding — the most common catastrophic mistake ----------
# /etc/mongod.conf
net:
  port: 27017
  bindIp: 127.0.0.1        # ⭐ NEVER 0.0.0.0 without auth + firewall

# /etc/redis/redis.conf
bind 127.0.0.1 ::1
requirepass a-long-random-password
protected-mode yes
rename-command FLUSHALL ""
rename-command CONFIG ""
```

```bash
# ---------- Backups ----------
#!/bin/bash
# /usr/local/bin/backup.sh
set -euo pipefail
DATE=$(date +%F)

mongodump --uri="$DATABASE_URL" --archive=/tmp/db-$DATE.gz --gzip
aws s3 cp /tmp/db-$DATE.gz s3://my-backups/mongo/
rm /tmp/db-$DATE.gz

tar czf /tmp/uploads-$DATE.tar.gz /var/www/myapp/shared/uploads
aws s3 cp /tmp/uploads-$DATE.tar.gz s3://my-backups/uploads/
rm /tmp/uploads-$DATE.tar.gz

# Cron: 0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

**Interview Tip:** An exposed MongoDB with no authentication is one of the most common real-world data breaches — there are entire ransomware campaigns that scan for port 27017 and wipe databases. `bindIp: 127.0.0.1` plus a firewall is the answer. And say this: **"a backup you haven't restored is not a backup."**

---

# Rapid Fire

**What is a reverse proxy and why use one in front of Node?**
It sits between clients and your app: TLS termination, static file serving, compression, rate limiting, load balancing across PM2 workers, and protection from slow-client attacks. Node shouldn't do any of that.

**Why not run Node on port 80 directly?**
Ports below 1024 require root. Running your app as root is a serious risk, and you'd also lose everything Nginx gives you.

**What is `pm2 reload` vs `restart`?**
`reload` restarts cluster workers one at a time (zero downtime). `restart` kills everything then starts fresh (brief downtime).

**How do you keep Node running after closing SSH?**
PM2 (with `pm2 startup` + `pm2 save`), or a systemd service. Never `nohup`/`screen` in production.

**What is a systemd service file?**
The native Linux way to manage a daemon — auto-restart, boot startup, log integration, resource limits.

**What is `X-Forwarded-For`?**
The header a proxy adds with the original client IP. Express needs `app.set('trust proxy', 1)` to read it, or `req.ip` returns the proxy's IP and rate limiting breaks.

**What is HSTS?**
`Strict-Transport-Security` tells browsers to only ever connect over HTTPS for the given duration, preventing SSL-stripping attacks.

**What is CORS in deployment?**
The browser blocks cross-origin requests unless the server allows them. If your frontend and API are on different domains, configure an explicit origin allowlist — or serve both from the same origin via Nginx and avoid CORS entirely.

**How do you handle file uploads on a VPS?**
Small: local disk in a shared directory + `client_max_body_size` in Nginx. Better: upload directly to S3 with a presigned URL so the file never touches your server.

**What is a health check endpoint?**
`/health` for liveness (the process responds), `/ready` for readiness (dependencies are reachable). Load balancers use them to route traffic.

**How do you deploy a MERN app to a single VPS?**
Nginx serves the built React files and reverse-proxies `/api` to Node running under PM2, with MongoDB on localhost or Atlas, and Certbot for TLS.

**What is the difference between `systemctl reload` and `restart` for Nginx?**
`reload` re-reads the config gracefully without dropping connections. `restart` stops and starts, dropping in-flight requests.

**Why does my SPA 404 on refresh?**
The server looks for a real file at that path. Fix with `try_files $uri $uri/ /index.html`.

**What is a bastion/jump host?**
A single hardened server that's the only SSH entry point; everything else is only reachable from it.

**How do you rotate logs?**
`logrotate` for system logs, `pm2-logrotate` for PM2. Without it, logs fill the disk and take the server down.

**How much RAM does a small MERN app need?**
1–2 GB is workable for a small deployment with swap configured. Node alone typically uses 100–300MB; MongoDB wants more, which is a good reason to use Atlas.

**What is blue-green on a single VPS?**
Run two PM2 apps on different ports and switch the Nginx upstream. Effective, though `pm2 reload` is usually sufficient.

**How do you handle scheduled jobs?**
System cron, `pm2 cron_restart`, or a proper queue with BullMQ. For multiple servers, use a distributed lock so the job runs once.

**What is `ufw` vs `iptables`?**
`ufw` is a friendly front-end for `iptables`. Use `ufw` unless you need advanced rules.

**How do you check what's using a port?**
`sudo lsof -i :3000` or `sudo netstat -tulpn | grep 3000`.

---

## 📌 Interview Checklist

- [ ] Walk through hardening a fresh Ubuntu server
- [ ] Write an Nginx reverse proxy config from memory
- [ ] Why do WebSockets need special Nginx headers?
- [ ] `pm2 reload` vs `restart` — explain zero downtime
- [ ] How does Let's Encrypt renewal work, and how does it break?
- [ ] Why lower DNS TTL *before* a migration?
- [ ] Explain the symlink release pattern
- [ ] Where do you store secrets on a VPS, and with what permissions?
- [ ] Why must MongoDB bind to 127.0.0.1?
- [ ] Name two things that silently take down small deployments
