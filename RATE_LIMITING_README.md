# 🛡️ Rate Limiting Implementation

## Overview

Rate limiting telah diimplementasikan di semua API endpoints untuk mencegah abuse dan melindungi server dari request spam atau DDoS attacks.

## How It Works

Menggunakan **Token Bucket Algorithm** dengan in-memory storage:
- Setiap user mendapat "token bucket" dengan jumlah token tertentu
- Setiap request mengambil 1 token
- Tokens di-refill seiring waktu
- Jika tokens habis, request ditolak dengan HTTP 429

## Rate Limit Presets

| Preset | Interval | Max Requests | Use Case |
|--------|----------|--------------|----------|
| **Strict** | 1 minute | 5 requests | Create/Update/Delete operations |
| **Standard** | 1 minute | 20 requests | General API endpoints |
| **Relaxed** | 1 minute | 60 requests | Read operations (GET) |
| **Auth** | 5 minutes | 5 requests | Login/Signup/Initialize |
| **Export** | 5 minutes | 3 requests | Resource-intensive operations (PDF/CSV) |

## Protected Endpoints

### Transactions
- `GET /api/transactions` - Relaxed (60/min)
- `POST /api/transactions` - Strict (5/min)
- `PUT /api/transactions/[id]` - Strict (5/min)
- `DELETE /api/transactions/[id]` - Strict (5/min)

### Accounts
- `GET /api/accounts` - Relaxed (60/min)
- `POST /api/accounts` - Strict (5/min)
- `PUT /api/accounts/[id]` - Strict (5/min)
- `DELETE /api/accounts/[id]` - Strict (5/min)

### User
- `POST /api/user/initialize` - Auth (5/5min)

### Reports
- `GET /api/reports/export` - Export (3/5min)

## Response Headers

When rate limit is applied, response includes:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 2026-01-11T10:30:00.000Z
```

When rate limit is exceeded:

```
HTTP 429 Too Many Requests
Retry-After: 45

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45,
  "limit": 5,
  "reset": "2026-01-11T10:30:00.000Z"
}
```

## Frontend Handling

Handle rate limit errors in your API calls:

```typescript
async function createTransaction(data) {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (response.status === 429) {
    const error = await response.json()
    toast.error(`Too many requests. Please wait ${error.retryAfter} seconds.`)
    return null
  }

  return await response.json()
}
```

## Identifier Strategy

Rate limits are tracked per:
1. **User ID** (when authenticated)
2. **IP Address** (when not authenticated or as fallback)

```typescript
// Priority: User ID > IP Address
const identifier = user ? `user:${user.id}` : `ip:${ipAddress}`
```

## Memory Management

- In-memory store automatically cleans up old entries every 10 minutes
- Entries older than 1 hour are removed
- No persistent storage required for MVP

## Production Considerations

### Current Implementation (In-Memory)
✅ **Pros:**
- Simple, no external dependencies
- Fast, low latency
- Good for single-server deployments

⚠️ **Cons:**
- Not shared across multiple server instances
- Resets on server restart
- Limited by server memory

### Recommended for Production (Redis)

For production with multiple instances, upgrade to Redis-based solution:

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
})

const { success, limit, reset, remaining } = await ratelimit.limit(
  identifier
)
```

## Testing Rate Limits

### Manual Test in Browser Console

```javascript
// Test rate limit by making multiple requests
async function testRateLimit() {
  for (let i = 0; i < 10; i++) {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INCOME',
        amount: 1000,
        accountId: 'your-account-id',
        categoryId: 'your-category-id',
        date: new Date().toISOString()
      })
    })
    
    console.log(`Request ${i + 1}:`, response.status, 
                response.headers.get('X-RateLimit-Remaining'))
    
    if (response.status === 429) {
      const data = await response.json()
      console.log('Rate limited!', data)
      break
    }
  }
}

testRateLimit()
```

### Expected Output

```
Request 1: 201 4
Request 2: 201 3
Request 3: 201 2
Request 4: 201 1
Request 5: 201 0
Request 6: 429 0
Rate limited! {
  error: "RATE_LIMIT_EXCEEDED",
  message: "Too many requests. Please try again in 60 seconds.",
  retryAfter: 60
}
```

## Customization

To adjust rate limits, edit `lib/rate-limit.ts`:

```typescript
export const RateLimitPresets = {
  strict: { interval: 60000, maxRequests: 10 },    // Changed from 5 to 10
  // ...
}
```

Or create custom limits per endpoint:

```typescript
const rateLimitResult = await rateLimit(
  getClientIdentifier(request, user.id),
  { interval: 30000, maxRequests: 3 }  // 3 requests per 30 seconds
)
```

## Monitoring

Track rate limit violations:

```typescript
// Add to rate-limit.ts
if (!rateLimitResult.success) {
  // Log to monitoring service
  console.warn('[Rate Limit]', {
    identifier,
    endpoint: request.url,
    retryAfter: rateLimitResult.retryAfter
  })
}
```

## Troubleshooting

### Rate limit too strict
Increase `maxRequests` or `interval` in presets

### Rate limit too lenient
Decrease `maxRequests` or use stricter preset

### False positives (legitimate users blocked)
Consider whitelisting specific users or increasing limits for premium users

### Memory leak concerns
Current implementation has automatic cleanup. Monitor with:

```typescript
console.log('Rate limit store size:', rateLimitStore.size)
```

## Security Best Practices

1. ✅ **Always check authentication first** before rate limiting
2. ✅ **Use User ID as primary identifier** (not just IP)
3. ✅ **Different limits for different operations** (read vs write)
4. ✅ **Return proper HTTP 429 status** with Retry-After header
5. ✅ **Log rate limit violations** for monitoring
6. ⚠️ **Consider adding CAPTCHA** for repeated violations
7. ⚠️ **Implement exponential backoff** for severe cases

## Next Steps

- [ ] Add rate limit violation logging to Sentry
- [ ] Implement CAPTCHA after X violations
- [ ] Create admin panel to view rate limit stats
- [ ] Upgrade to Redis for production scaling
- [ ] Add rate limit bypass for premium users
- [ ] Implement IP-based blocking for severe abuse

---

**Status:** ✅ Implemented and Ready for Production

**Last Updated:** January 11, 2026
