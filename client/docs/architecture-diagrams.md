# Oncore Architecture Diagrams

## Current State (Web MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                           │
│                                                              │
│  Next.js App (localhost:3000 or vercel.app)                │
│  ├─ React Components                                        │
│  ├─ Server Actions (lib/actions/)                          │
│  └─ Service Layer (lib/services/) ← NEW!                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Postgres Database                                    │  │
│  │  ├─ Tables (shows, venues, advancing_sessions)       │  │
│  │  ├─ RLS Policies (security)                          │  │
│  │  └─ RPC Functions (complex logic) ← NEW!             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication                                       │  │
│  │  └─ JWT tokens, session management                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Storage                                              │  │
│  │  └─ File uploads (PDFs, documents)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Realtime                                             │  │
│  │  └─ WebSocket connections for live updates           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno) ← NEW!                        │  │
│  │  ├─ stripe-webhook (payment processing)              │  │
│  │  ├─ send-email (notifications)                       │  │
│  │  └─ generate-advancing-pdf (reports)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Webhooks
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ├─ Stripe (payments)                                       │
│  ├─ Resend (email)                                          │
│  └─ Vercel (hosting)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Future State (Web + Mobile)

```
┌────────────────────────────────┐  ┌────────────────────────┐
│      Next.js Web App           │  │   Flutter Mobile App   │
│      (Browser/Vercel)          │  │   (iOS/Android)        │
│                                │  │                        │
│  ├─ Server Actions             │  │  ├─ Dart Code          │
│  ├─ Service Layer ─────────────┼──┼──┤ (Same queries!)     │
│  └─ UI Components              │  │  └─ UI Widgets         │
└───────────────┬────────────────┘  └───────────┬────────────┘
                │                               │
                │           BOTH USE            │
                │        SAME BACKEND           │
                └───────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │        SUPABASE BACKEND                   │
        │                                           │
        │  ┌─────────────────────────────────────┐ │
        │  │  Postgres + RLS                     │ │
        │  │  (Shared data, shared security)     │ │
        │  └─────────────────────────────────────┘ │
        │                                           │
        │  ┌─────────────────────────────────────┐ │
        │  │  RPC Functions                      │ │
        │  │  (Web & mobile call identically)    │ │
        │  └─────────────────────────────────────┘ │
        │                                           │
        │  ┌─────────────────────────────────────┐ │
        │  │  Edge Functions                     │ │
        │  │  (Web & mobile call via HTTP)       │ │
        │  └─────────────────────────────────────┘ │
        │                                           │
        │  ┌─────────────────────────────────────┐ │
        │  │  Realtime                           │ │
        │  │  (Live updates on both platforms)   │ │
        │  └─────────────────────────────────────┘ │
        └───────────────────────────────────────────┘
```

---

## Request Flow Examples

### Example 1: User Creates a Show

**Web (Next.js):**
```
1. User fills form → clicks "Create Show"
2. Component calls Server Action: createShow(formData)
3. Server Action calls ShowService.createShow()
4. Service queries: supabase.from('shows').insert()
5. Supabase validates with RLS policy
6. Database inserts row
7. Response returns to browser
8. UI updates

Timeline: ~100ms
```

**Mobile (Flutter):**
```
1. User fills form → taps "Create Show"
2. Widget calls: supabase.from('shows').insert()
3. Supabase validates with RLS policy (SAME policy!)
4. Database inserts row
5. Response returns to app
6. UI updates

Timeline: ~80ms (fewer hops!)
```

---

### Example 2: Create Advancing Session (Complex)

**Web (Next.js):**
```
1. User clicks "New Advancing Session"
2. Server Action calls: AdvancingService.createSession()
3. Service calls RPC: supabase.rpc('create_advancing_session')
4. Database function executes:
   - Generates access code
   - Creates session
   - Creates hospitality
   - Creates technical
   - Creates production
   - Logs activity
   (All in ONE atomic transaction)
5. Returns session with access code
6. UI shows "Session created: ABC123"

Timeline: ~150ms
```

**Mobile (Flutter):**
```
1. User taps "New Advancing Session"
2. App calls: supabase.rpc('create_advancing_session')
3. Database function executes (SAME function!)
4. Returns session with access code
5. UI shows "Session created: ABC123"

Timeline: ~120ms
```

**Key Point:** Both platforms call the SAME database function!

---

### Example 3: Stripe Payment Webhook

```
┌─────────────┐
│   Stripe    │
└──────┬──────┘
       │ Webhook: "payment_succeeded"
       │
       ▼
┌─────────────────────────────────┐
│  Edge Function                  │
│  (stripe-webhook)               │
│                                 │
│  1. Verify webhook signature    │
│  2. Parse event                 │
│  3. Update subscription         │
│     in database                 │
└─────────┬───────────────────────┘
          │
          ▼
    ┌─────────────┐
    │  Database   │
    │  Updates    │
    └──────┬──────┘
           │
           ▼ Real-time update
    ┌──────────────────┐
    │  Web + Mobile    │
    │  Both see new    │
    │  subscription    │
    │  status          │
    └──────────────────┘
```

---

## Data Flow: Real-time Updates

```
┌──────────────────┐              ┌──────────────────┐
│   Band Member    │              │   Venue Staff    │
│   (Web App)      │              │   (Mobile App)   │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         │ 1. Updates hospitality          │
         │    guest_count = 15             │
         ▼                                 │
┌──────────────────────────────────────────────────┐
│              Supabase Database                    │
│  hospitality table updated                       │
└────────┬─────────────────────────┬────────────────┘
         │                         │
         │ 2. Realtime broadcast   │
         ▼                         ▼
┌──────────────────┐       ┌──────────────────┐
│   Band Member    │       │   Venue Staff    │
│   Sees update    │       │   Sees update    │
│   instantly      │       │   instantly      │
└──────────────────┘       └──────────────────┘

Latency: ~50-100ms for both platforms
```

---

## Architecture Layers (Detailed)

```
┌─────────────────────────────────────────────────────────────┐
│                        LAYER 1                               │
│                    CLIENT APPS                               │
│                                                              │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │  Next.js Web        │      │  Flutter Mobile     │      │
│  │  ─────────────      │      │  ─────────────      │      │
│  │  • UI Components    │      │  • UI Widgets       │      │
│  │  • Server Actions   │      │  • State Mgmt       │      │
│  │  • Service Layer    │◄─────┤  • Service Calls    │      │
│  └─────────────────────┘      └─────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        LAYER 2                               │
│                   SERVICE LAYER (SHARED)                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ ShowService  │  │ AdvancingS.  │  │ OrganizationS.  │  │
│  │              │  │              │  │                 │  │
│  │ Platform-    │  │ Platform-    │  │ Platform-       │  │
│  │ agnostic     │  │ agnostic     │  │ agnostic        │  │
│  │ queries      │  │ queries      │  │ queries         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        LAYER 3                               │
│                    SUPABASE API                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  REST API (auto-generated from schema)             │    │
│  │  • GET /shows?org_id=eq.123                        │    │
│  │  • POST /shows                                     │    │
│  │  • RPC /create_advancing_session                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        LAYER 4                               │
│                   DATABASE LAYER                             │
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │   Tables      │  │  RLS Policies │  │  RPC Functions │ │
│  │   ────────    │  │  ────────────  │  │  ────────────  │ │
│  │  • shows      │  │  • org access │  │  • create_*    │ │
│  │  • venues     │  │  • user auth  │  │  • submit_*    │ │
│  │  • sessions   │  │  • row-level  │  │  • verify_*    │ │
│  └───────────────┘  └───────────────┘  └────────────────┘ │
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │  Auth         │  │   Storage     │  │   Realtime     │ │
│  │  ────────     │  │   ───────     │  │   ────────     │ │
│  │  • JWT        │  │  • Files      │  │  • WebSocket   │ │
│  │  • Sessions   │  │  • CDN        │  │  • Broadcast   │ │
│  └───────────────┘  └───────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        LAYER 5                               │
│                   EDGE FUNCTIONS                             │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Stripe    │  │    Email    │  │   PDF Generation │   │
│  │  Webhook    │  │   Sender    │  │                  │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                        │
│  Stripe • Resend • Vercel • etc                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Flow (Row-Level Security)

```
┌─────────────────┐
│   User Request  │
│  "Get shows"    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Supabase receives request      │
│  with JWT token                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Extracts user_id from JWT      │
│  auth.uid() = "user-123"        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  Executes query with RLS:                           │
│                                                      │
│  SELECT * FROM shows                                │
│  WHERE org_id = 'org-456'                          │
│    AND EXISTS (                                     │
│      SELECT 1 FROM org_members                      │
│      WHERE org_members.org_id = shows.org_id        │
│        AND org_members.user_id = auth.uid()         │
│    )                                                │
│                                                      │
│  If user is NOT a member → Returns empty            │
│  If user IS a member → Returns shows                │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Returns data   │
│  to client      │
└─────────────────┘
```

**Key Point:** Security is enforced at the DATABASE level, not application level. This means:
- ✅ Can't be bypassed
- ✅ Works for web AND mobile automatically
- ✅ No middleware needed
- ✅ Faster (one query instead of multiple auth checks)

---

## Cost Breakdown (10,000 Active Users)

### Hybrid Architecture (Your Setup)
```
┌────────────────────────────────────────────┐
│  Supabase Pro                              │
│  ├─ Database (8GB RAM, 100GB storage)     │  $25/month
│  ├─ Auth (unlimited users)                │  $0
│  ├─ Storage (100GB)                       │  $10/month
│  ├─ Bandwidth (100GB egress)              │  $9/month
│  └─ Edge Functions (1M invocations)       │  $0 (free tier)
├────────────────────────────────────────────┤
│  Vercel Pro                                │  $20/month
│  └─ Next.js hosting                        │
├────────────────────────────────────────────┤
│  Resend                                    │  $20/month
│  └─ Email sending (50k emails)            │
└────────────────────────────────────────────┘
Total: $84/month

Managed by Supabase/Vercel:
✅ SSL certificates
✅ Database backups
✅ Monitoring
✅ DDoS protection
✅ Global CDN
✅ Auto-scaling
```

### Custom Server Alternative
```
┌────────────────────────────────────────────┐
│  AWS ECS (API Server)                      │  $300/month
│  ├─ 4 containers (t3.medium)              │
│  └─ Load balancer                          │
├────────────────────────────────────────────┤
│  RDS Postgres                              │  $150/month
│  └─ db.t3.large with backups              │
├────────────────────────────────────────────┤
│  ElastiCache Redis                         │  $50/month
├────────────────────────────────────────────┤
│  S3 + CloudFront                           │  $75/month
├────────────────────────────────────────────┤
│  Datadog Monitoring                        │  $100/month
├────────────────────────────────────────────┤
│  Vercel Pro                                │  $20/month
└────────────────────────────────────────────┘
Total: $695/month

You manage:
❌ Database backups (cron jobs)
❌ SSL certificates (Let's Encrypt)
❌ Scaling policies
❌ Security patches
❌ Connection pooling
❌ Cache invalidation
❌ Monitoring alerts
```

**Savings: $611/month = $7,332/year** 💰

---

These diagrams show how everything connects. The key insight: **Web and mobile share the same backend, but mobile has fewer hops (faster!)**
