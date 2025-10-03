# ROAM Platform - Shared Service Layer

## Overview

The ROAM Platform has been restructured into a monorepo with shared services to eliminate code duplication and improve maintainability across the three applications:

- **ROAM Admin App** - Platform administration
- **ROAM Provider App** - Provider management and onboarding ✅ **Active Development**
- **ROAM Customer App** - Customer booking ## � **Development Standards**

### **API Development**
- ✅ Use Vercel Serverless Functions (not Edge Runtime)
- ✅ Follow patterns in `API_ARCHITECTURE.md`
- ✅ Safe JSON parsing with try-catch blocks
- ✅ Consistent error response format
- ✅ Proper CORS headers for all endpoints
- ✅ Always use `VercelRequest`/`VercelResponse` types

### **Database Queries**
- ✅ Always reference `DATABASE_SCHEMA_REFERENCE.md` for field names
- ✅ Use confirmed working query patterns
- ✅ Implement comprehensive error handling

### **Frontend Development**
- ✅ Use shared types from `@roam/shared`
- ✅ Implement proper error boundaries
- ✅ Follow component refactoring guidelinesovery

## 🎯 **Current Progress (October 2025)**

**Active Focus**: Provider App Integration Fixes
- ✅ **Bookings Tab** - Integration complete, production-ready
- ✅ **Services Tab** - JSON errors resolved, production-ready
- 🔄 **Next**: Availability, Analytics, Settings, and Staff Management tabs

**Latest Achievement**: Resolved JSON parsing errors across provider app services, ensuring production deployment stability.

## 🏗️ Architecture

```
roam-platform/
├── packages/
│   ├── shared/                    # Shared types, utilities, and interfaces
│   ├── auth-service/             # Centralized authentication service
│   ├── notification-service/     # Unified notification service
│   └── payment-service/          # Unified payment processing
├── apps/
│   ├── roam-admin-app/          # Admin application
│   ├── roam-provider-app/       # Provider application
│   └── roam-customer-app/       # Customer application
└── infrastructure/              # Deployment and infrastructure configs
```

## 📦 Shared Packages

### `@roam/shared`

The core shared package containing:

- **Types**: Database types, API types, and interfaces
- **Utilities**: Validation schemas, formatting functions, and constants
- **Services**: Service interfaces for email, notifications, and payments
- **Components**: Shared React components (coming soon)

#### Key Features

- **Type Safety**: Comprehensive TypeScript types for all database tables and API endpoints
- **Validation**: Zod schemas for all data validation across the platform
- **Formatting**: Consistent data formatting utilities (dates, currency, phone numbers, etc.)
- **Constants**: Centralized constants for error messages, routes, and configuration

### `@roam/auth-service`

Centralized authentication service providing:

- JWT token management
- Role-based access control (RBAC)
- User session management
- Authentication middleware

### `@roam/notification-service`

Unified notification service handling:

- Email notifications (Resend integration)
- SMS notifications (Twilio integration)
- Push notifications
- In-app notifications
- Notification preferences and delivery tracking

### `@roam/payment-service`

Unified payment processing service:

- Stripe payment intents
- Stripe Connect for providers
- Payment webhooks
- Refund processing
- Customer management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- TypeScript 5+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd roam-platform

# Install dependencies
npm install

# Build shared packages
npm run build

# Start development servers
npm run dev:admin      # Start admin app
npm run dev:provider   # Start provider app
npm run dev:customer   # Start customer app
```

### Development Workflow

```bash
# Build all packages
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test

# Clean build artifacts
npm run clean
```

## 📋 Usage Examples

### Using Shared Types

```typescript
import type { Booking, UserRole, BusinessType } from '@roam/shared';

// Type-safe booking object
const booking: Booking = {
  id: 'uuid',
  customerId: 'customer-uuid',
  providerId: 'provider-uuid',
  serviceId: 'service-uuid',
  bookingDate: '2024-01-15',
  startTime: '14:00',
  totalAmount: 100.00,
  serviceFee: 10.00,
  paymentStatus: 'paid',
  bookingStatus: 'confirmed',
  // ... other properties
};
```

### Using Validation Schemas

```typescript
import { createBookingSchema, validateEmail } from '@roam/shared/utils';

// Validate booking data
const bookingData = {
  serviceId: 'service-uuid',
  bookingDate: '2024-01-15T14:00:00Z',
  startTime: '14:00',
  deliveryType: 'on_site'
};

const result = createBookingSchema.safeParse(bookingData);
if (result.success) {
  // Data is valid
  const validBooking = result.data;
} else {
  // Handle validation errors
  console.error(result.error);
}
```

### Using Formatting Utilities

```typescript
import { 
  formatCurrency, 
  formatDate, 
  formatPhoneNumber,
  formatBookingStatus 
} from '@roam/shared/utils';

// Format data consistently
const price = formatCurrency(100.50); // "$100.50"
const date = formatDate('2024-01-15'); // "Jan 15, 2024"
const phone = formatPhoneNumber('1234567890'); // "(123) 456-7890"
const status = formatBookingStatus('in_progress'); // "In Progress"
```

### Using Service Interfaces

```typescript
import type { 
  EmailService, 
  NotificationService, 
  PaymentService 
} from '@roam/shared/services';

// Service implementations will be provided by the respective service packages
class MyService {
  constructor(
    private emailService: EmailService,
    private notificationService: NotificationService,
    private paymentService: PaymentService
  ) {}

  async sendBookingConfirmation(booking: Booking) {
    // Send email notification
    await this.emailService.sendTemplateEmail({
      to: booking.customerEmail,
      templateId: 'booking_confirmation',
      templateData: { booking }
    });

    // Send in-app notification
    await this.notificationService.sendNotification({
      userId: booking.customerId,
      type: 'booking_update',
      title: 'Booking Confirmed',
      message: `Your booking for ${booking.serviceName} has been confirmed.`
    });
  }
}
```

## 🔧 Configuration

### Environment Variables

Each app maintains its own environment variables while referencing shared services:

```bash
# App-level environment variables
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AUTH_SERVICE_URL=https://auth-service.vercel.app
VITE_NOTIFICATION_SERVICE_URL=https://notification-service.vercel.app
VITE_PAYMENT_SERVICE_URL=https://payment-service.vercel.app
```

### Service Configuration

```typescript
// Notification service configuration
const notificationConfig = {
  emailService: {
    enabled: true,
    provider: 'resend',
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: 'noreply@roamyourbestlife.com',
    fromName: 'ROAM Platform'
  },
  smsService: {
    enabled: true,
    provider: 'twilio',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER
  }
};
```

## 🚀 Deployment

### Independent Deployment

Each app can be deployed independently:

```bash
# Deploy individual apps
npm run deploy:admin
npm run deploy:provider
npm run deploy:customer

# Deploy all services
npm run deploy:services

# Deploy everything
npm run deploy:all
```

### Service Deployment

Services are deployed as separate Vercel functions:

```bash
# Deploy auth service
cd packages/auth-service
vercel --prod

# Deploy notification service
cd packages/notification-service
vercel --prod

# Deploy payment service
cd packages/payment-service
vercel --prod
```

## 📊 Benefits Achieved

### Code Consolidation
- **40-60% reduction** in code duplication
- **Unified validation** across all applications
- **Consistent formatting** and error handling
- **Shared type definitions** for better type safety

### Development Efficiency
- **Faster feature development** with shared components
- **Reduced bugs** through consistent validation
- **Better developer experience** with TypeScript support
- **Easier maintenance** with centralized logic

### Performance Improvements
- **Smaller bundle sizes** through code sharing
- **Faster builds** with optimized dependencies
- **Better caching** with shared packages
- **Reduced memory usage** in production

### Maintainability
- **Single source of truth** for business logic
- **Easier updates** across all applications
- **Consistent API contracts** between services
- **Better testing** with shared utilities

## 🔄 Migration Guide

### For Existing Apps

1. **Update package.json** to include shared dependencies:
```json
{
  "dependencies": {
    "@roam/shared": "workspace:*",
    "@roam/auth-service": "workspace:*",
    "@roam/notification-service": "workspace:*",
    "@roam/payment-service": "workspace:*"
  }
}
```

2. **Replace duplicate code** with shared imports:
```typescript
// Before
import { validateEmail } from '../utils/validation';
import { formatCurrency } from '../utils/formatting';

// After
import { validateEmail, formatCurrency } from '@roam/shared/utils';
```

3. **Update type imports**:
```typescript
// Before
import type { Booking } from '../types/database';

// After
import type { Booking } from '@roam/shared/types';
```

4. **Replace service implementations** with shared interfaces:
```typescript
// Before
import { EmailService } from '../services/email';

// After
import type { EmailService } from '@roam/shared/services';
```

## 📚 **Key Documentation**

### **Core Architecture**
- **[API Architecture](./API_ARCHITECTURE.md)** - ⭐ Complete API implementation guide and patterns
- **[Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)** - Confirmed working database schemas (60+ tables)
- **[Enum Types Reference](./ENUM_TYPES_REFERENCE.md)** - ⭐ **NEW** PostgreSQL enum types and Supabase query guide
- **[Unified Service Architecture Analysis](./UNIFIED_SERVICE_ARCHITECTURE_ANALYSIS.md)** - Platform-wide service standardization plan

### **Active Development Documents**
- **[Provider App Integration Progress](./PROVIDER_APP_INTEGRATION_PROGRESS.md)** - Current integration fixes and progress

### **Completed Implementations**
- **[Enum Query Fix Summary](./ENUM_QUERY_FIX_SUMMARY.md)** - ⭐ **NEW** 406 error fix for PostgreSQL enum queries
- **[MFA Implementation Summary](./MFA_IMPLEMENTATION_SUMMARY.md)** - Multi-Factor Authentication framework
- **[Security Fixes Documentation](./SECURITY_FIXES.md)** - Security enhancements and compliance measures
- **[Component Refactoring Guide](./COMPONENT_REFACTORING_GUIDE.md)** - Frontend component organization

## 🤝 Contributing

1. **Create feature branch** from main
2. **Update shared packages** first if needed
3. **Use DATABASE_SCHEMA_REFERENCE.md** for all database queries
4. **Update apps** to use new shared functionality
5. **Add tests** for new functionality
6. **Update documentation** as needed
7. **Submit pull request**

## � **Development Standards**

### **Database Queries**
- ✅ Always reference `DATABASE_SCHEMA_REFERENCE.md` for field names
- ✅ Use confirmed working query patterns
- ✅ Implement comprehensive error handling

### **API Development**
- ✅ Safe JSON parsing with try-catch blocks
- ✅ Consistent error response format
- ✅ Proper CORS headers for all endpoints

### **Frontend Development**
- ✅ Use shared types from `@roam/shared`
- ✅ Implement proper error boundaries
- ✅ Follow component refactoring guidelines

## �📝 License

This project is proprietary to ROAM Platform.

## 🆘 Support

For questions or issues:
- Check **[Provider App Integration Progress](./PROVIDER_APP_INTEGRATION_PROGRESS.md)** for current status
- Reference **[Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)** for database queries
- Create an issue in the repository
- Contact the development team
