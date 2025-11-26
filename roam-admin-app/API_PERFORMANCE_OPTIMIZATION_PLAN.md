# Admin App API Performance Optimization Plan

## Current Performance Issues Identified

### 1. **N+1 Query Problem in Bookings API**
**Issue**: For each booking, we make 2 additional queries (reviews and payments)
- 50 bookings = 1 initial query + 100 additional queries = 101 total queries
- This is extremely inefficient and slow

**Solution**: 
- Use LEFT JOIN in the initial query to fetch reviews and payments
- OR create a comprehensive booking view with all related data

### 2. **Client-Side Aggregation**
**Issue**: Fetching all rows and calculating sums/counts in Node.js
- Example: Fetching all bookings just to count them
- Example: Fetching all rows to sum amounts

**Solution**:
- Use PostgreSQL aggregation functions (COUNT, SUM, AVG)
- Use database views for pre-aggregated data

### 3. **Not Fully Utilizing Database Views**
**Issue**: We created views but still making direct table queries
- `admin_booking_reports_view` - has pre-aggregated booking data
- `admin_user_reports_view` - has user stats
- `admin_business_reports_view` - has business stats
- `admin_service_reports_view` - has service stats
- `admin_financial_overview` - has transaction data
- `admin_financial_summary` - has daily financial summaries

**Solution**: Use these views instead of raw table queries

### 4. **Sequential Queries Instead of Parallel**
**Issue**: Making queries one after another when they could run in parallel
```javascript
// Current - Sequential
const customers = await getCustomers();
const providers = await getProviders();
const bookings = await getBookings();

// Better - Parallel
const [customers, providers, bookings] = await Promise.all([
  getCustomers(),
  getProviders(),
  getBookings()
]);
```

### 5. **Inefficient Count Queries**
**Issue**: Using `select('*')` or `select('created_at')` when we only need counts
```javascript
// Bad - fetches all data
const { data } = await supabase.from('bookings').select('*');
const count = data.length;

// Good - count in database
const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
```

### 6. **No Response Caching**
**Issue**: Recalculating same statistics on every request
**Solution**: 
- Implement Redis caching for frequently accessed data
- Set appropriate TTL (e.g., 5 minutes for dashboard stats)
- Invalidate cache on data changes

### 7. **Missing Database Indexes**
**Issue**: Queries on non-indexed columns are slow
**Check needed for**:
- `bookings.booking_status`
- `bookings.payment_status`
- `bookings.created_at`
- `customer_profiles.is_active`
- `provider_profiles.is_active`
- `business_profiles.verification_status`

## Optimization Priority

### Priority 1: Fix N+1 Query Problem (Biggest Impact)
- Create comprehensive booking view OR use LEFT JOINs
- Expected improvement: 50-100x faster for booking lists

### Priority 2: Use Pre-aggregated Views
- Update reports.ts to use admin_*_reports_view
- Expected improvement: 10-20x faster for dashboard/reports

### Priority 3: Database-Side Aggregation
- Replace client-side .reduce() with SQL SUM/COUNT
- Expected improvement: 5-10x faster for metrics

### Priority 4: Parallel Queries
- Use Promise.all() for independent queries
- Expected improvement: 2-3x faster for pages with multiple data sources

### Priority 5: Add Missing Indexes
- Create indexes on frequently queried columns
- Expected improvement: 2-5x faster for filtered queries

### Priority 6: Implement Caching
- Add Redis or in-memory cache for dashboard stats
- Expected improvement: 100x faster for cached responses

## Specific Optimizations

### Bookings API (`routes/bookings.ts`)
```typescript
// Current: N+1 problem
const enrichedBookings = await Promise.all(
  bookings.map(async (booking) => {
    const review = await supabase.from('reviews')...  // 50 queries
    const payment = await supabase.from('payments')... // 50 queries
  })
);

// Optimized: Single query with JOINs
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    customer_profiles(*),
    provider_profiles(*),
    services(*),
    reviews(overall_rating, review_text, created_at),
    payments(stripe_payment_intent_id, amount_paid, payment_date, refund_amount)
  `)
  .gte('booking_date', dateFrom)
  .lte('booking_date', dateTo);
```

### Reports API (`routes/reports.ts`)
```typescript
// Current: Multiple queries + client aggregation
const { data: customers } = await supabase.from('customer_profiles').select('*');
const { data: providers } = await supabase.from('providers').select('*');
const count = customers.length + providers.length;

// Optimized: Use count queries in parallel
const [customerCount, providerCount] = await Promise.all([
  supabase.from('customer_profiles').select('*', { count: 'exact', head: true }),
  supabase.from('providers').select('*', { count: 'exact', head: true })
]);
const totalUsers = (customerCount.count || 0) + (providerCount.count || 0);
```

### Dashboard Stats
```typescript
// Optimized: Use the new admin_dashboard_stats view
const { data: stats } = await supabase
  .from('admin_dashboard_stats')
  .select('*')
  .single();

// Returns all stats in one query!
```

## Implementation Steps

1. ✅ Create `admin_dashboard_stats` view (DONE)
2. Create `admin_bookings_enriched` view with JOINs
3. Update `bookings.ts` to use new view
4. Update `reports.ts` to use count queries and views
5. Add indexes for frequently filtered columns
6. Implement basic caching (optional but recommended)
7. Add query performance monitoring

## Expected Overall Performance Improvement
- **Dashboard load**: 20-50x faster
- **Bookings list**: 50-100x faster
- **Reports**: 10-30x faster
- **API response times**: From 2-5 seconds to 50-200ms

## Monitoring
Add logging to track:
- Query execution time
- Number of queries per request
- Cache hit rate (if implemented)
- Slow query warnings (>100ms)

