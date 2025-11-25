# ROAM Platform Monorepo Structure

```
roam-platform/
│
├── 📦 Root Configuration
│   ├── package.json              # Workspace root, Turbo config
│   ├── turbo.json                # Turborepo pipeline config
│   ├── tsconfig.json             # Root TypeScript config
│   └── vercel.json               # Vercel deployment config
│
├── 🎯 Main Applications (3 Apps)
│   │
│   ├── roam-admin-app/          # Admin Dashboard Application
│   │   ├── api/                  # Vercel Edge Functions
│   │   │   ├── auth/
│   │   │   ├── businesses.ts
│   │   │   ├── notifications/
│   │   │   └── ...
│   │   ├── client/               # React Frontend
│   │   │   ├── components/      # UI Components
│   │   │   │   ├── bookings/
│   │   │   │   ├── businesses/
│   │   │   │   ├── providers/
│   │   │   │   ├── reviews/
│   │   │   │   ├── services/
│   │   │   │   └── ui/          # shadcn/ui components
│   │   │   ├── pages/           # Page Components
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── AdminBookings.tsx
│   │   │   │   ├── AdminBusinesses.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/           # Custom React Hooks
│   │   │   ├── lib/             # Utilities & Config
│   │   │   └── services/        # API Services
│   │   ├── server/              # Express Server
│   │   │   ├── routes/          # API Routes
│   │   │   └── services/
│   │   └── shared/              # Shared Code
│   │
│   ├── roam-provider-app/       # Provider/Business Application
│   │   ├── api/                 # Vercel Edge Functions
│   │   │   ├── auth/
│   │   │   ├── bookings/        # Booking management APIs
│   │   │   │   ├── status-update.ts
│   │   │   │   ├── calendar-invite/
│   │   │   │   └── ...
│   │   │   ├── business/        # Business profile APIs
│   │   │   ├── onboarding/     # Provider onboarding flow
│   │   │   ├── stripe/          # Stripe integration
│   │   │   ├── twilio/          # Twilio SMS/Chat
│   │   │   └── notifications/
│   │   ├── client/              # React Frontend
│   │   │   ├── components/      # UI Components (110+ files)
│   │   │   ├── pages/           # Page Components (81 files)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── components/
│   │   │   │   │       ├── bookings/  # Booking management
│   │   │   │   │       ├── financials/ # Financial dashboard
│   │   │   │   │       └── ...
│   │   │   │   ├── ProviderDashboard.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/           # Custom Hooks
│   │   │   ├── lib/             # Utilities
│   │   │   ├── contexts/        # React Contexts
│   │   │   └── utils/
│   │   ├── server/              # Express Server
│   │   │   ├── routes/
│   │   │   ├── middleware/     # Auth, validation
│   │   │   └── services/
│   │   ├── lib/                 # Shared Libraries
│   │   │   └── notifications/  # Notification service
│   │   └── supabase/           # Supabase Functions
│   │
│   └── roam-customer-app/       # Customer/Marketplace Application
│       ├── api/                 # Vercel Edge Functions
│       │   ├── auth/
│       │   ├── bookings/        # Booking creation/management
│       │   ├── businesses/     # Business search
│       │   ├── stripe/          # Payment processing (15+ endpoints)
│       │   │   ├── create-checkout-session.ts
│       │   │   ├── webhook.ts
│       │   │   └── ...
│       │   ├── twilio-conversations/
│       │   └── notifications/
│       ├── client/              # React Frontend
│       │   ├── components/      # UI Components (105+ files)
│       │   │   ├── CheckoutForm.tsx
│       │   │   ├── TipCheckoutForm.tsx
│       │   │   └── ...
│       │   ├── pages/           # Page Components (63 files)
│       │   │   ├── BusinessResults.tsx
│       │   │   ├── MyBookings.tsx
│       │   │   └── ...
│       │   ├── hooks/           # Custom Hooks
│       │   ├── lib/             # Utilities & API clients
│       │   ├── contexts/        # React Contexts
│       │   └── utils/
│       ├── server/              # Express Server
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── services/
│       └── supabase/           # Supabase Functions
│
├── 📚 Shared Packages
│   │
│   ├── packages/
│   │   ├── shared/              # Core Shared Package ⭐
│   │   │   ├── src/
│   │   │   │   ├── api/         # Unified API clients
│   │   │   │   │   ├── bookings/
│   │   │   │   │   ├── twilio-conversations-api.ts
│   │   │   │   │   └── UnifiedServiceAPI.ts
│   │   │   │   ├── types/       # TypeScript Types (26 files)
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── bookings/
│   │   │   │   │   ├── database/
│   │   │   │   │   └── ...
│   │   │   │   ├── services/    # Service integrations
│   │   │   │   ├── hooks/       # Shared React Hooks
│   │   │   │   │   ├── useConversations.ts
│   │   │   │   │   ├── useUnifiedBookings.ts
│   │   │   │   │   └── useUnifiedServices.ts
│   │   │   │   ├── contexts/    # Shared Contexts
│   │   │   │   ├── config/      # Environment config
│   │   │   │   └── branding/    # Brand assets
│   │   │   └── dist/            # Compiled output
│   │   │
│   │   ├── auth-service/        # Authentication Service
│   │   │   ├── src/
│   │   │   │   ├── controllers/
│   │   │   │   ├── middleware/
│   │   │   │   ├── routes/
│   │   │   │   └── services/
│   │   │
│   │   ├── notification-service/ # Notification Service
│   │   │   ├── src/
│   │   │   │   ├── routes/
│   │   │   │   │   └── smsRoutes.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── smsService.ts
│   │   │   │   └── templates/
│   │   │
│   │   └── payment-service/     # Payment Service
│   │       ├── src/
│   │       │   ├── controllers/
│   │       │   ├── routes/
│   │       │   └── services/
│   │
├── 🗄️ Database & Migrations
│   │
│   ├── supabase/
│   │   └── migrations/          # Database Migrations
│   │       ├── 20250108_*.sql   # Notification templates
│   │       ├── 20250123_*.sql   # Tips views
│   │       ├── 20250124_*.sql   # Financial views
│   │       └── ...
│   │
│   └── migrations/              # Additional migrations
│
├── 🛠️ Development Tools
│   │
│   ├── scripts/                 # Build & Deployment Scripts
│   │   ├── *.sh
│   │   └── *.js
│   │
│   ├── production-tests/       # Production Test Suite
│   │   ├── test:smoke
│   │   ├── test:api
│   │   └── test:e2e
│   │
│   ├── mcp/                     # Model Context Protocol Servers
│   │   └── packages/
│   │
│   └── mcp-send-email/          # Email MCP Server
│
├── 📖 Documentation
│   │
│   └── *.md                     # 50+ Markdown docs
│       ├── API_ARCHITECTURE.md
│       ├── DATABASE_SCHEMA_REFERENCE.md
│       ├── STRIPE_*.md
│       ├── TWILIO_*.md
│       └── ...
│
└── 🚀 Deployment
    ├── apps/roam-admin-app/     # Alternative admin app location
    └── vercel.json              # Vercel configs in each app
```

## Key Architecture Patterns

### 1. **Monorepo Structure**
- **Turborepo** for build orchestration
- **npm workspaces** for dependency management
- **3 main applications** + **shared packages**

### 2. **Application Structure** (Each App)
```
app-name/
├── api/              # Vercel Edge Functions (serverless)
├── client/           # React Frontend (Vite)
├── server/           # Express Server (optional)
└── shared/           # App-specific shared code
```

### 3. **Shared Package Architecture**
- **packages/shared**: Core types, API clients, hooks, contexts
- Used by all 3 applications
- Compiled to `dist/` for consumption

### 4. **API Layer**
- **Vercel Edge Functions**: `/api/*` routes in each app
- **Express Routes**: `/server/routes/*` for complex logic
- **Supabase Functions**: Edge functions in `supabase/functions/`

### 5. **Database**
- **Supabase** as backend
- Migrations in `supabase/migrations/`
- Views for complex queries (tips, financials)

### 6. **Third-Party Integrations**
- **Stripe**: Payment processing (customer & provider apps)
- **Twilio**: SMS & Conversations (all apps)
- **Resend**: Email notifications (provider app)

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase + Vercel Edge Functions
- **Database**: PostgreSQL (via Supabase)
- **Build**: Turborepo
- **Deployment**: Vercel

## File Count Summary

- **roam-admin-app**: ~193 files
- **roam-provider-app**: ~384 files
- **roam-customer-app**: ~304 files
- **packages/shared**: ~93 files
- **Total**: ~1000+ TypeScript/TSX files

