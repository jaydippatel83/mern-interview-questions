# ☁️ AWS Interview Questions

> EC2 · S3 · IAM · VPC · CloudFront · ALB · Route53 · Lambda · RDS · CloudWatch · Auto Scaling

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [IAM](#iam)
3. [EC2](#ec2)
4. [S3](#s3)
5. [VPC & Networking](#vpc--networking)
6. [Load Balancing & Auto Scaling](#load-balancing--auto-scaling)
7. [Route 53](#route-53)
8. [CloudFront](#cloudfront)
9. [Lambda & Serverless](#lambda--serverless)
10. [Databases](#databases)
11. [Messaging](#messaging)
12. [CloudWatch & Monitoring](#cloudwatch--monitoring)
13. [Containers](#containers)
14. [Cost Optimisation](#cost-optimisation)
15. [Architecture Scenarios](#architecture-scenarios)
16. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What are Regions, Availability Zones and Edge Locations?

### Answer

```
Region (e.g. ap-south-1, Mumbai)
  ├── AZ ap-south-1a  ← one or more physical datacenters
  ├── AZ ap-south-1b  ← separate power, cooling, networking
  └── AZ ap-south-1c  ← < 10ms latency between AZs

Edge Locations (400+)  ← CloudFront caches, much more numerous than regions
```

| | Region | Availability Zone | Edge Location |
|---|---|---|---|
| What | Geographic area | Isolated datacenter(s) in a region | CDN PoP |
| Count | ~33 | 2–6 per region | 400+ |
| Purpose | Data residency, latency | Fault isolation | Content caching |

### Why do we use it?

**Multi-AZ = high availability.** If one AZ loses power, your app keeps running in another. Cross-AZ traffic is fast (< 10ms) and cheap.

**Multi-region = disaster recovery + global latency**, but it's expensive and complex — data replication across regions is slow and costs bandwidth.

### How to choose a region

1. **Latency** — closest to your users
2. **Compliance** — data residency laws (GDPR, Indian data localisation)
3. **Cost** — us-east-1 is usually cheapest, ap-south-1 (Mumbai) is competitive
4. **Service availability** — new services launch in us-east-1 first

**Interview Tip:** Always design multi-AZ; design multi-region only when the business requires it. And know that **us-east-1 is special** — it hosts global service control planes (IAM, CloudFront, Route 53), so an outage there can affect you even if you run elsewhere.

---

## What is the Shared Responsibility Model?

### Answer

| AWS is responsible for | You are responsible for |
|---|---|
| Security **OF** the cloud | Security **IN** the cloud |
| Physical datacenters | Your data and its encryption |
| Hardware, network infrastructure | IAM users, roles and policies |
| Hypervisor, managed service internals | OS patching (on EC2), firewall rules |
| Global infrastructure | Application security, security groups |

The line shifts by service type:

```
EC2 (IaaS)      → you patch the OS, configure the firewall, secure the app
RDS (PaaS)      → AWS patches the DB engine; you handle users, encryption, network
Lambda (FaaS)   → AWS handles everything below your code; you own code + IAM
S3               → AWS secures the infrastructure; YOU control bucket policies
```

**Interview Tip:** Nearly every famous "AWS breach" was actually a **public S3 bucket** or **leaked IAM keys** — customer-side mistakes, not AWS failures. That's the model in one sentence.

---

# IAM

## Explain IAM users, groups, roles and policies.

### Answer

| Concept | What it is | Use for |
|---|---|---|
| **User** | A person or app with long-lived credentials | Humans (ideally via SSO instead) |
| **Group** | A collection of users sharing policies | Organising permissions by job function |
| **Role** | Temporary credentials assumed by anything | **EC2, Lambda, cross-account, federated users** |
| **Policy** | JSON document defining permissions | Attached to users, groups, roles, resources |

### Example policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadWriteOwnFolder",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-bucket/${aws:username}/*"
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringNotEquals": { "s3:x-amz-server-side-encryption": "AES256" }
      }
    },
    {
      "Sid": "RequireMFA",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" } }
    }
  ]
}
```

### Policy evaluation logic

```
1. Explicit DENY   → always wins, nothing overrides it
2. Explicit ALLOW  → permitted
3. Default         → implicit DENY
```

### Why roles beat access keys

```js
// ❌ NEVER — hardcoded or env-var credentials on EC2
const s3 = new S3Client({
  credentials: { accessKeyId: 'AKIA…', secretAccessKey: '…' }
});

// ✅ Attach an IAM role to the instance/Lambda/task
const s3 = new S3Client({ region: 'ap-south-1' });
// The SDK automatically picks up temporary rotating credentials
// from the instance metadata service (IMDSv2)
```

### Best practices

1. Never use the root account — enable MFA and lock it away
2. **Least privilege** — start with nothing, add what's needed
3. Roles over users; temporary credentials over long-lived keys
4. IAM Identity Center (SSO) for human access
5. Permission boundaries and SCPs to cap what any role can do
6. Rotate keys and audit with IAM Access Analyzer + CloudTrail

**Interview Tip:** The single most common real-world AWS security failure is long-lived access keys committed to a Git repository. Say: *"I use IAM roles everywhere — EC2 instance profiles, Lambda execution roles, IRSA for EKS, and OIDC for GitHub Actions. There should be zero static keys in a modern setup."* OIDC for CI is a strong detail.

---

# EC2

## What are the EC2 instance types and purchasing options?

### Answer

**Instance families**

| Family | Optimised for | Examples |
|---|---|---|
| **T** (t3, t4g) | Burstable, general purpose | Dev, low-traffic web servers |
| **M** (m6i, m7g) | Balanced | App servers, small databases |
| **C** (c6i, c7g) | Compute | Batch processing, gaming, HPC |
| **R** (r6i) | Memory | In-memory caches, large databases |
| **X, z** | Extreme memory | SAP HANA, huge in-memory workloads |
| **I, D** | Storage (NVMe) | NoSQL, data warehouses |
| **G, P, Inf** | GPU / ML accelerators | Training, inference, rendering |

`g` suffix = Graviton (ARM) — typically **20–40% better price/performance**.

**Purchasing options**

| Option | Discount | Commitment | Use for |
|---|---|---|---|
| On-Demand | 0% | None | Unpredictable, short-term |
| **Savings Plans** | up to 72% | 1 or 3 years of $/hour | Steady baseline load ⭐ |
| Reserved Instances | up to 72% | 1 or 3 years, specific type | Legacy of Savings Plans |
| **Spot** | up to 90% | None, 2-min interruption notice | Batch, CI, stateless workers ⭐ |
| Dedicated Host | — | Physical server | Licensing, compliance |

### T-instance CPU credits — a real trap

```
t3.micro earns credits when idle and spends them when busy.
Run out of credits → throttled to a baseline (~10% of a vCPU) → the app crawls.

Unlimited mode: keeps performance but charges for surplus credits.
Watch the CPUCreditBalance CloudWatch metric.
```

**Interview Tip:** Spot + Savings Plans is the standard cost architecture: a Savings Plan covers the baseline, Spot handles bursts and batch work. Mention Graviton — moving to ARM instances is often a free 20% saving with a rebuild.

---

## What is user data, metadata and an instance profile?

```bash
#!/bin/bash
# User data — runs ONCE on first boot as root
dnf update -y
dnf install -y nodejs nginx
systemctl enable --now nginx
aws s3 cp s3://my-bucket/app.tar.gz /opt/ && tar -xzf /opt/app.tar.gz -C /opt/
```

```bash
# Instance Metadata Service v2 (IMDSv2 — token required, prevents SSRF attacks)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id
```

**Interview Tip:** Always enforce IMDSv2. The 2019 Capital One breach used SSRF against IMDSv1 to steal instance-role credentials and read S3 buckets — a genuinely famous case worth citing.

---

# S3

## Explain S3 storage classes and features.

### Answer

| Class | Retrieval | Min duration | Use for |
|---|---|---|---|
| **Standard** | ms | — | Active data |
| **Intelligent-Tiering** ⭐ | ms | — | Unknown/changing patterns (auto-moves) |
| Standard-IA | ms | 30 days | Backups, older data |
| One Zone-IA | ms | 30 days | Reproducible data (single AZ) |
| Glacier Instant | ms | 90 days | Archives needing instant access |
| Glacier Flexible | min–hours | 90 days | Long-term archive |
| Glacier Deep Archive | 12 hours | 180 days | Compliance, 7–10 year retention |

```json
// Lifecycle policy — move data automatically
{
  "Rules": [{
    "Id": "archive-old-logs",
    "Status": "Enabled",
    "Filter": { "Prefix": "logs/" },
    "Transitions": [
      { "Days": 30,  "StorageClass": "STANDARD_IA" },
      { "Days": 90,  "StorageClass": "GLACIER" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 2555 },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}
```

### Key features

```
Versioning         — keep every version; protects against accidental delete/overwrite
MFA Delete         — require MFA to permanently delete
Object Lock        — WORM compliance, cannot be deleted even by root
Replication        — CRR (cross-region) / SRR (same-region)
Encryption         — SSE-S3, SSE-KMS, SSE-C, or client-side
Transfer Accel.    — upload via edge locations
Multipart Upload   — required > 5GB, recommended > 100MB
Presigned URLs     — time-limited direct access without credentials
Event Notifications— trigger Lambda/SQS/SNS on object create/delete
S3 Select          — SQL over a single object, retrieve only matching rows
```

### Presigned URLs — the upload pattern you should know

```js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Backend generates a URL; the browser uploads DIRECTLY to S3
app.post('/upload-url', requireAuth, async (req, res) => {
  const key = `uploads/${req.user.id}/${crypto.randomUUID()}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      ContentType: req.body.contentType,
      ServerSideEncryption: 'AES256',
    }),
    { expiresIn: 300 }
  );

  res.json({ uploadUrl: url, key });
});
// ✅ The file never touches your server — no bandwidth cost, no memory pressure,
//    no Lambda timeout, and it works for multi-GB files
```

### Securing a bucket

```json
// Block ALL public access at the account and bucket level
{
  "BlockPublicAcls": true,
  "IgnorePublicAcls": true,
  "BlockPublicPolicy": true,
  "RestrictPublicBuckets": true
}
```

```json
// Serve public content via CloudFront OAC, not a public bucket
{
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::123456789:distribution/EDFDVBD6EXAMPLE"
    }
  }
}
```

**Interview Tip:** S3 has offered **strong read-after-write consistency** for all operations since December 2020. Many candidates still describe the old eventual-consistency behaviour for overwrites — knowing it changed shows current knowledge.

**Common Mistakes:** Making a bucket public for a website instead of using CloudFront + OAC. Also: forgetting `AbortIncompleteMultipartUpload` in lifecycle rules — failed uploads silently accumulate and you pay for them forever.

---

# VPC & Networking

## Explain VPC architecture.

### Answer

```
VPC 10.0.0.0/16  (65,536 IPs)
│
├── Public Subnet  10.0.1.0/24  (AZ-a) ──┐
│     ├── ALB                            │──> Internet Gateway ──> Internet
│     └── NAT Gateway ───────────────────┘
│
├── Public Subnet  10.0.2.0/24  (AZ-b)
│
├── Private Subnet 10.0.11.0/24 (AZ-a)
│     └── EC2 app servers ──> NAT Gateway ──> Internet (outbound only)
│
├── Private Subnet 10.0.12.0/24 (AZ-b)
│
└── Isolated Subnet 10.0.21.0/24
      └── RDS  (no internet route at all)
```

**A subnet is "public" if its route table has a route to an Internet Gateway.** That's the entire definition.

### Security Groups vs NACLs

| | Security Group | Network ACL |
|---|---|---|
| Level | Instance (ENI) | Subnet |
| **Stateful** | ✅ Yes — return traffic auto-allowed | ❌ No — need explicit outbound rules |
| Rules | Allow only | Allow **and** Deny |
| Evaluation | All rules evaluated | Numbered, first match wins |
| Default | Deny all inbound, allow all outbound | Allow all |

```
Typical layering:
  ALB SG        → allow 443 from 0.0.0.0/0
  App SG        → allow 3000 FROM the ALB security group  ← reference SGs, not IPs
  DB SG         → allow 5432 FROM the App security group
```

### VPC connectivity options

| Service | Purpose |
|---|---|
| **Internet Gateway** | Public internet access, both directions |
| **NAT Gateway** | Outbound-only internet for private subnets (managed, AZ-scoped) |
| **VPC Endpoint (Gateway)** | Private access to S3/DynamoDB — **free**, no NAT charges |
| **VPC Endpoint (Interface)** | Private access to other AWS services via PrivateLink |
| **VPC Peering** | Connect two VPCs (non-transitive) |
| **Transit Gateway** | Hub connecting many VPCs and on-prem |
| **Site-to-Site VPN / Direct Connect** | On-premises connectivity |

**Interview Tip:** Two cost details that show real experience:
1. **NAT Gateway is expensive** — ~$32/month per gateway plus $0.045/GB processed. Teams routinely find NAT data-processing charges are their biggest surprise bill.
2. **S3 Gateway Endpoints are free** and eliminate NAT charges for S3 traffic entirely. Adding one is often the fastest AWS cost win available.

**Common Mistakes:** Putting databases in a public subnet; opening a security group to `0.0.0.0/0` on port 22 or the database port; using one NAT Gateway across AZs (cross-AZ data charges plus a single point of failure).

---

# Load Balancing & Auto Scaling

## What are the AWS load balancer types?

### Answer

| | ALB (Application) | NLB (Network) | GWLB (Gateway) |
|---|---|---|---|
| Layer | 7 (HTTP/HTTPS) | 4 (TCP/UDP/TLS) | 3 |
| Routing | Path, host, header, query, method | IP + port | — |
| Performance | High | **Ultra low latency, millions of req/s** | — |
| Static IP | No (use DNS) | ✅ Yes / Elastic IP | — |
| WebSockets | ✅ | ✅ | — |
| Preserves source IP | Via `X-Forwarded-For` | ✅ Natively | ✅ |
| Targets | Instances, IPs, Lambda, containers | Instances, IPs, ALB | Appliances |
| Use for | Web apps, microservices, containers | Extreme performance, TCP, static IP needed | Firewalls, IDS |

```
ALB routing rules:
  /api/*     → api-target-group
  /static/*  → s3-via-cloudfront
  Host: admin.example.com → admin-target-group
  Header: X-Version=beta  → canary-target-group    ← weighted canary deploys
```

### Auto Scaling

```json
{
  "MinSize": 2,
  "DesiredCapacity": 4,
  "MaxSize": 20,
  "HealthCheckType": "ELB",
  "HealthCheckGracePeriod": 300,
  "TargetGroupARNs": ["arn:aws:elasticloadbalancing:..."],
  "VPCZoneIdentifier": "subnet-a,subnet-b,subnet-c"
}
```

| Policy | How it works | Best for |
|---|---|---|
| **Target tracking** ⭐ | Keep a metric at a target (e.g. CPU at 60%) | Almost everything |
| Step scaling | Add N instances per alarm threshold | Fine-grained control |
| Simple scaling | Add N on an alarm (with cooldown) | Legacy |
| Scheduled | Scale at known times | Predictable daily patterns |
| Predictive | ML forecasts load and pre-scales | Cyclical traffic |

```
Target tracking on CPU 60%:
  CPU rises to 80% → add instances
  CPU falls to 30% → remove instances
  ✅ Self-tuning, no thresholds to guess
```

**Interview Tip:** For a web app fronted by an ALB, `ALBRequestCountPerTarget` is often a better scaling metric than CPU — it scales on actual demand rather than a lagging indicator. Also always set `HealthCheckType: ELB` (not EC2) so an instance that's running but not serving traffic gets replaced.

**Common Mistakes:** Scaling faster than the application can warm up (set a grace period); scaling on CPU when the bottleneck is a database connection pool.

---

# Route 53

## What are the Route 53 routing policies?

### Answer

| Policy | Behaviour | Use for |
|---|---|---|
| **Simple** | One record, one or more IPs | Basic |
| **Weighted** | Split by percentage | A/B tests, canary releases, gradual migration |
| **Latency-based** | Route to the lowest-latency region | Global apps |
| **Failover** | Primary + secondary with health checks | Disaster recovery |
| **Geolocation** | Route by user's country/continent | Compliance, localised content |
| **Geoproximity** | By geographic distance, with a bias | Fine-tuned traffic shifting |
| **Multivalue answer** | Up to 8 healthy records, client picks | Cheap DNS-level load balancing |

### Record types

```
A       → IPv4 address
AAAA    → IPv6
CNAME   → alias to another domain (❌ NOT allowed at the zone apex)
ALIAS   → AWS-specific; works at the apex, free queries, health-aware  ⭐
MX      → mail servers
TXT     → SPF, DKIM, domain verification
NS      → nameservers
CAA     → which CAs may issue certificates
```

**Interview Tip:** The apex-domain problem is a classic: DNS forbids a CNAME at the zone apex (`example.com`), but ALB/CloudFront only give you a DNS name, not an IP. Route 53's **ALIAS** record solves it — and it's free, unlike a CNAME query.

---

# CloudFront

## How does CloudFront work?

### Answer

```
User (Mumbai) → Edge Location (Mumbai) ──cache hit──> instant response
                     │ cache miss
                     ▼
              Regional Edge Cache
                     │ miss
                     ▼
                  Origin (S3 / ALB / any HTTP server)
```

### Key concepts

```
Cache behaviours  — different rules per path pattern (/api/* vs /static/*)
Cache key         — what makes a request unique (URL + selected headers/cookies/query)
TTL               — min/default/max, respecting or overriding origin Cache-Control
OAC               — Origin Access Control: only CloudFront can read the S3 bucket
Signed URLs       — time-limited access to private content
Invalidation      — purge cached objects (first 1,000 paths/month free)
Field-level encryption — encrypt sensitive form fields at the edge
```

### Cache-key discipline

```
❌ Forwarding all headers, cookies and query strings
   → almost every request becomes unique → ~0% hit rate → you're just adding latency

✅ Forward only what actually changes the response
   Static assets: forward nothing, cache for a year (filenames are hashed)
   API:           forward Authorization, cache for 0
```

### Lambda@Edge vs CloudFront Functions

| | CloudFront Functions | Lambda@Edge |
|---|---|---|
| Runtime | JavaScript (restricted) | Node.js / Python |
| Max duration | < 1 ms | 5s (viewer) / 30s (origin) |
| Network access | ❌ | ✅ |
| Cost | ~1/6th | Higher |
| Triggers | Viewer request/response | All four |
| Use for | Header manipulation, redirects, URL rewrites, A/B cookies | Auth, dynamic origin selection, image resizing |

**Interview Tip:** A CDN in front of an API is worth mentioning even for dynamic content — CloudFront terminates TLS at the edge and keeps a warm connection to the origin, which cuts round trips even at a 0% cache hit rate.

---

# Lambda & Serverless

## How does Lambda work and what are its limits?

### Answer

```js
export const handler = async (event, context) => {
  console.log('Request ID:', context.awsRequestId);
  console.log('Remaining ms:', context.getRemainingTimeInMillis());

  const body = JSON.parse(event.body ?? '{}');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
```

### Limits

```
Memory:              128 MB – 10,240 MB   (CPU scales WITH memory)
Timeout:             15 minutes max
Payload:             6 MB sync, 256 KB async
Deployment package:  50 MB zipped, 250 MB unzipped, 10 GB container image
/tmp storage:        512 MB – 10 GB
Concurrency:         1,000 per region by default (raisable)
Env vars:            4 KB total
```

### Cold starts

```
Cold start = download code → start runtime → run init code → invoke handler
             ~100ms (Node) to several seconds (Java, or a VPC-attached function)

Reduce them:
  ✅ Smaller deployment packages
  ✅ Move heavy work OUTSIDE the handler (runs once per container)
  ✅ Provisioned Concurrency for latency-critical paths
  ✅ SnapStart (Java)
  ✅ Node/Python over Java/.NET
  ✅ arm64 (Graviton) — cheaper and often faster
```

```js
// ✅ Initialise OUTSIDE the handler — reused across warm invocations
const db = new DatabaseClient(process.env.DATABASE_URL);
const s3 = new S3Client({});

export const handler = async (event) => {
  return db.query('SELECT 1');    // connection already established
};
```

### The Lambda + RDS connection problem

```
1,000 concurrent Lambdas → 1,000 database connections → RDS dies

Solutions:
  ✅ RDS Proxy — pools and multiplexes connections
  ✅ Aurora Serverless with the Data API (HTTP, no persistent connections)
  ✅ Reserved concurrency to cap the function
  ✅ DynamoDB instead (HTTP-based, no connection limits)
```

### When Lambda is and isn't right

✅ Event-driven work, spiky/unpredictable traffic, glue between services, cron jobs, image processing, webhooks
❌ Long-running processes (>15 min), consistently high steady traffic (containers are cheaper), sub-10ms latency requirements, WebSocket servers

**Interview Tip:** Cost crossover is a great point: Lambda is dramatically cheaper for spiky traffic and dramatically **more expensive** for steady high load. At sustained high throughput, Fargate or EC2 wins on cost. Knowing that Lambda isn't automatically cheaper is a senior signal.

---

# Databases

## Which AWS database should you choose?

### Answer

| Service | Type | Use for |
|---|---|---|
| **RDS** | Managed relational (Postgres, MySQL, MariaDB, Oracle, SQL Server) | Standard relational workloads |
| **Aurora** | AWS-built MySQL/Postgres-compatible | 3–5× MySQL throughput, 6-way replication, auto-scaling storage |
| **Aurora Serverless v2** | Auto-scaling Aurora | Variable/unpredictable load |
| **DynamoDB** | Managed NoSQL key-value/document | Single-digit ms at any scale, serverless |
| **ElastiCache** | Managed Redis / Memcached | Caching, sessions |
| **DocumentDB** | MongoDB-compatible | Existing Mongo workloads |
| **Redshift** | Data warehouse (columnar) | Analytics, BI |
| **OpenSearch** | Search + log analytics | Full text, observability |
| **Timestream** | Time series | IoT, metrics |
| **Neptune** | Graph | Social, fraud, recommendations |

### RDS essentials

```
Multi-AZ           — synchronous standby in another AZ, automatic failover (~60s)
                     ⚠️ It's for HA, NOT read scaling — the standby serves no traffic
Read Replicas      — asynchronous, up to 15, can be cross-region, promotable
Automated backups  — up to 35 days, point-in-time recovery
Snapshots          — manual, kept until deleted
Parameter groups   — engine configuration
Performance Insights — query-level performance analysis
```

### DynamoDB fundamentals

```js
// Single-table design — the DynamoDB way
{
  PK: "USER#123",      SK: "PROFILE",        name: "Jaydip"
}
{
  PK: "USER#123",      SK: "ORDER#2026-01",  total: 2499
}
{
  PK: "ORDER#456",     SK: "ITEM#1",         product: "Laptop"
}

// One query gets the user AND all their orders:
//   PK = "USER#123"  → returns every item with that partition key
```

```
Partition key    — determines the physical partition; must have HIGH CARDINALITY
Sort key         — orders items within a partition; enables range queries
GSI              — different PK/SK, eventually consistent, own capacity
LSI              — same PK, different SK, must be created with the table
Capacity         — on-demand (pay per request) or provisioned (+ auto scaling)
DynamoDB Streams — change data capture → Lambda triggers
TTL              — automatic expiry of items
```

**Interview Tip:** The most-asked DynamoDB question is the **hot partition** problem — a poor partition key (like a date, or a `status` field) sends all traffic to one partition and you get throttled regardless of provisioned capacity. And unlike SQL, you must design the table around your access patterns *first*.

---

# Messaging

## SQS vs SNS vs EventBridge vs Kinesis

### Answer

| | SQS | SNS | EventBridge | Kinesis |
|---|---|---|---|---|
| Pattern | Queue (1:1) | Pub/Sub (1:many) | Event bus + routing | Streaming |
| Consumers | One per message | All subscribers | Rule-based targets | Multiple, replayable |
| Ordering | FIFO queues only | No | No | Per shard |
| Retention | 14 days | None | 24h archive | 1–365 days |
| Replay | No | No | Archive + replay | ✅ Yes |
| Use for | Task queues, decoupling | Fan-out notifications | Event-driven architecture, SaaS integrations | Analytics, real-time processing |

```
Common pattern — SNS fan-out to multiple SQS queues:

  Order placed → SNS topic ──┬─> SQS: email queue    → Lambda
                             ├─> SQS: inventory queue → ECS worker
                             └─> SQS: analytics queue → Kinesis Firehose

  ✅ Each consumer gets its own queue → independent retries, independent scaling,
     and a slow consumer can't block the others
```

### SQS details

```
Standard FIFO
  Throughput:   nearly unlimited      | 300 msg/s (3,000 batched)
  Ordering:     best effort           | strict per message group
  Delivery:     at-least-once         | exactly-once processing
  
Visibility timeout  — how long a message is hidden after being received
Long polling        — WaitTimeSeconds: 20 → fewer empty receives, lower cost
DLQ                 — after maxReceiveCount failures, move here and alert
```

**Interview Tip:** Visibility timeout must exceed your processing time. If it doesn't, the message becomes visible again mid-processing and a second worker picks it up — causing duplicate work that people spend days debugging.

---

# CloudWatch & Monitoring

```
Metrics    — numeric time series (CPU, request count, custom business metrics)
Logs       — log groups → log streams; query with Logs Insights
Alarms     — thresholds → SNS → PagerDuty/Slack/Lambda
Dashboards — visualisation
Events/EventBridge — scheduled and reactive triggers
X-Ray      — distributed tracing across services
Synthetics — canary scripts testing endpoints from outside
```

```sql
-- CloudWatch Logs Insights — find the slowest API calls
fields @timestamp, @message, duration
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
| limit 100
```

```js
// Custom business metrics — often more valuable than infrastructure metrics
await cloudwatch.putMetricData({
  Namespace: 'MyApp/Orders',
  MetricData: [{
    MetricName: 'CheckoutFailures',
    Value: 1,
    Unit: 'Count',
    Dimensions: [{ Name: 'Reason', Value: 'PaymentDeclined' }],
  }],
});
```

**Interview Tip:** Alert on **business symptoms** rather than infrastructure: "checkout success rate dropped below 95%" catches problems that "CPU > 80%" never will — and it won't page you at 3am for a healthy autoscaling event.

---

# Containers

## ECS vs EKS vs Fargate

### Answer

| | ECS | EKS | Fargate |
|---|---|---|---|
| What | AWS's own orchestrator | Managed Kubernetes | Serverless compute engine |
| Complexity | Low | High | Lowest |
| Portability | AWS-only | Standard Kubernetes | Works with ECS or EKS |
| Control plane cost | Free | ~$73/month | — |
| Use for | AWS-native teams | Multi-cloud, existing K8s expertise | No server management |

```
ECS on EC2      → you manage the instances, cheaper at scale, more control
ECS on Fargate  → no instances to manage, pay per vCPU/GB-second, simplest ⭐
EKS on Fargate  → Kubernetes API without node management
```

**Interview Tip:** For a small-to-mid team already on AWS, **ECS on Fargate** is usually the pragmatic answer — you get containers without operating Kubernetes. Choose EKS when you need portability, an existing K8s ecosystem (Helm, operators), or the team already has the expertise.

---

# Cost Optimisation

## How do you reduce an AWS bill?

### Answer

```
1. RIGHT-SIZE
   Most instances are over-provisioned. Use Compute Optimizer.

2. COMMIT
   Savings Plans for baseline load — up to 72% off.

3. SPOT
   Batch jobs, CI runners, stateless workers — up to 90% off.

4. GRAVITON (arm64)
   ~20–40% better price/performance for a rebuild.

5. STORAGE TIERING
   S3 Intelligent-Tiering; lifecycle to Glacier; delete old snapshots and
   unattached EBS volumes (a classic hidden cost).

6. DATA TRANSFER  ← the most underestimated line item
   Same-AZ:         free
   Cross-AZ:        $0.01/GB each way
   Cross-region:    $0.02/GB
   To internet:     $0.09/GB
   Via CloudFront:  cheaper than direct S3/EC2 egress
   VPC Gateway Endpoint for S3/DynamoDB:  FREE — removes NAT charges

7. NAT GATEWAY
   ~$32/month each + $0.045/GB processed. Use VPC endpoints; consider a
   NAT instance for dev environments.

8. TURN OFF DEV ENVIRONMENTS
   Scheduled scale-to-zero nights and weekends = ~65% saving on non-prod.

9. LOGS
   CloudWatch Logs ingestion is $0.50/GB. Set retention; don't log debug in prod.

10. TAGGING + BUDGETS
    Cost allocation tags, AWS Budgets with alerts, Cost Anomaly Detection.
```

**Interview Tip:** Data transfer and NAT Gateway charges are where most surprise bills come from, and they're rarely the first thing people mention. Leading with them shows you've actually owned an AWS bill.

---

# Architecture Scenarios

## Design a highly available web application on AWS

```
                     Route 53 (ALIAS, health checks)
                            │
                     CloudFront (CDN + WAF)
                            │
              ┌─────────────┴─────────────┐
              │      Application LB       │  (public subnets, multi-AZ)
              └─────────────┬─────────────┘
        ┌─────────────┬─────┴───────┬─────────────┐
        ▼             ▼             ▼             ▼
   ┌────────┐   ┌────────┐    ┌────────┐    ┌────────┐
   │ ECS/EC2│   │ ECS/EC2│    │ ECS/EC2│    │ ECS/EC2│   (private subnets)
   │  AZ-a  │   │  AZ-a  │    │  AZ-b  │    │  AZ-b  │   Auto Scaling Group
   └───┬────┘   └───┬────┘    └───┬────┘    └───┬────┘
       └────────────┴─────┬───────┴─────────────┘
              ┌───────────┴──────────┐
              ▼                      ▼
      ┌──────────────┐      ┌────────────────┐
      │ ElastiCache  │      │  RDS Multi-AZ  │   (isolated subnets)
      │   (Redis)    │      │  + Read Replica│
      └──────────────┘      └────────────────┘
              │
      ┌───────▼────────┐
      │   S3 (assets)  │  ← via CloudFront OAC
      └────────────────┘

Async: SQS → Lambda/ECS workers
Secrets: Secrets Manager / Parameter Store
Monitoring: CloudWatch + X-Ray + alarms → SNS
```

### The reasoning to state out loud

- **Multi-AZ everywhere** — ALB, ASG and RDS all span at least two AZs
- **Private subnets** for compute, **isolated** for data — nothing in a public subnet except the ALB and NAT
- **Security groups reference each other**, not IP ranges
- **Stateless app servers** — sessions in Redis, uploads to S3
- **CloudFront** offloads static content and terminates TLS at the edge
- **Auto Scaling** on request count per target with ELB health checks
- **Secrets in Secrets Manager**, injected at runtime, never in the image

---

## Design a serverless image processing pipeline

```
Browser ──presigned URL──> S3 (uploads/)
                             │ ObjectCreated event
                             ▼
                        ┌─────────┐
                        │   SQS   │  ← buffer, retry, DLQ
                        └────┬────┘
                             ▼
                    ┌─────────────────┐
                    │     Lambda      │  resize, watermark, convert to WebP/AVIF
                    └────────┬────────┘
                             ▼
                    S3 (processed/) ──> CloudFront ──> users
                             │
                             ▼
                        DynamoDB (metadata)
```

**Why SQS between S3 and Lambda?** S3 → Lambda directly gives you limited retry control and no buffering. SQS adds a DLQ, controlled concurrency, and protection against a burst of 10,000 uploads overwhelming downstream systems.

---

# Rapid Fire

**What is the difference between EBS and EFS and instance store?**
EBS = network block storage attached to one instance (persistent). EFS = shared NFS across many instances. Instance store = physical NVMe on the host, **lost on stop/terminate**.

**What is an AMI?**
A machine image — OS + config + software. Golden AMIs (built with Packer) make instance launches fast and reproducible.

**What is Elastic Beanstalk?**
PaaS that provisions EC2, ALB, ASG and monitoring from your code. Good for quick deploys; limited control.

**What is CloudFormation vs Terraform vs CDK?**
CloudFormation = AWS-native IaC (YAML/JSON). Terraform = multi-cloud, HCL, huge provider ecosystem. CDK = write infrastructure in TypeScript/Python, compiles to CloudFormation.

**What is AWS Systems Manager?**
Session Manager (SSH without open ports or key pairs), Parameter Store (config/secrets), Patch Manager, Run Command.

**What is Secrets Manager vs Parameter Store?**
Secrets Manager: automatic rotation, higher cost. Parameter Store: free standard tier, no rotation. Use Parameter Store for config, Secrets Manager for credentials that must rotate.

**What is KMS?**
Managed encryption keys. AWS-managed keys are free; customer-managed keys give you control over policy, rotation and cross-account access.

**What is WAF vs Shield?**
WAF filters HTTP requests (SQL injection, XSS, rate rules, geo blocking). Shield protects against DDoS — Standard is free and automatic, Advanced adds cost protection and a response team.

**What is CloudTrail vs CloudWatch?**
CloudTrail = **who did what** (API audit log). CloudWatch = **how is it performing** (metrics and logs).

**What is a VPC endpoint and why does it save money?**
Private connectivity to AWS services without traversing the internet. Gateway endpoints (S3, DynamoDB) are free and eliminate NAT data-processing charges.

**What is Aurora Serverless v2?**
Aurora that scales capacity in fine-grained increments in seconds, down to 0.5 ACU. Good for variable workloads.

**What is Step Functions?**
Visual workflow orchestration for Lambda and other services — retries, parallel branches, error handling, and long-running state machines without writing coordination code.

**What is the difference between horizontal and vertical scaling on RDS?**
Vertical = change the instance class (brief downtime unless Multi-AZ). Horizontal = read replicas for reads; sharding at the application layer for writes.

**How do you achieve zero-downtime deployment?**
Blue-green with ALB target group swapping, or ECS rolling updates with health checks and a circuit breaker for automatic rollback.

**What is an SCP?**
Service Control Policy — an AWS Organizations guardrail that caps what any account can do, regardless of IAM permissions.

**What is the Well-Architected Framework?**
Six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability.

**How do you handle secrets in ECS/Lambda?**
Reference Secrets Manager or Parameter Store ARNs in the task definition or function config — AWS injects them at runtime. Never bake secrets into images.

**What is cross-region replication and when do you need it?**
S3 CRR or Aurora Global Database for disaster recovery, compliance, or global read latency. Adds cost and complexity — only when genuinely required.

**What is the difference between an ALB target group health check and an ASG health check?**
Set the ASG's health check type to `ELB` so an instance failing HTTP health checks is replaced, not just removed from rotation.

---

## 📌 Interview Checklist

- [ ] Explain the Shared Responsibility Model with a concrete example
- [ ] Why IAM roles instead of access keys?
- [ ] Design a multi-AZ VPC and explain what makes a subnet public
- [ ] Security Groups vs NACLs — the stateful difference
- [ ] Why is Multi-AZ RDS not read scaling?
- [ ] Explain S3 presigned URLs and why they beat proxying uploads
- [ ] What causes Lambda cold starts and how do you reduce them?
- [ ] Why does Lambda + RDS need RDS Proxy?
- [ ] Name the five biggest AWS cost drivers you'd check first
- [ ] Design a highly available web app and justify each AZ decision
