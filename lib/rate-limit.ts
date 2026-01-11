/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiter using token bucket algorithm.
 * For production with multiple instances, consider using Redis-based solution like @upstash/ratelimit
 */

interface RateLimitConfig {
  interval: number  // Time window in milliseconds
  maxRequests: number  // Maximum requests allowed in the interval
}

interface TokenBucket {
  tokens: number
  lastRefill: number
}

// In-memory storage for rate limit data
const rateLimitStore = new Map<string, TokenBucket>()

// Cleanup old entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - bucket.lastRefill > 3600000) {
      rateLimitStore.delete(key)
    }
  }
}, 600000) // 10 minutes

/**
 * Rate limiter using token bucket algorithm
 * 
 * @param identifier - Unique identifier for the rate limit (usually user ID or IP)
 * @param config - Rate limit configuration
 * @returns Object with success status and retry information
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, maxRequests: 10 } // Default: 10 req/min
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}> {
  const now = Date.now()
  const key = `ratelimit:${identifier}`
  
  let bucket = rateLimitStore.get(key)

  // Initialize bucket if not exists
  if (!bucket) {
    bucket = {
      tokens: config.maxRequests - 1, // Take one token for current request
      lastRefill: now,
    }
    rateLimitStore.set(key, bucket)

    return {
      success: true,
      limit: config.maxRequests,
      remaining: bucket.tokens,
      reset: now + config.interval,
    }
  }

  // Calculate tokens to add based on time passed
  const timePassed = now - bucket.lastRefill
  const tokensToAdd = Math.floor((timePassed / config.interval) * config.maxRequests)

  if (tokensToAdd > 0) {
    // Refill tokens
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  // Check if we have tokens available
  if (bucket.tokens > 0) {
    bucket.tokens -= 1
    rateLimitStore.set(key, bucket)

    return {
      success: true,
      limit: config.maxRequests,
      remaining: bucket.tokens,
      reset: bucket.lastRefill + config.interval,
    }
  }

  // Rate limit exceeded
  const resetTime = bucket.lastRefill + config.interval
  const retryAfter = Math.ceil((resetTime - now) / 1000) // in seconds

  return {
    success: false,
    limit: config.maxRequests,
    remaining: 0,
    reset: resetTime,
    retryAfter,
  }
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try to get IP from headers (works with Vercel/Cloudflare)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  const ip = forwarded?.split(',')[0] || realIp || 'anonymous'
  return `ip:${ip}`
}

/**
 * Preset rate limit configurations for different use cases
 */
export const RateLimitPresets = {
  // Strict: For sensitive operations (create/update/delete)
  strict: { interval: 60000, maxRequests: 5 },       // 5 requests per minute
  
  // Standard: For general API endpoints
  standard: { interval: 60000, maxRequests: 20 },    // 20 requests per minute
  
  // Relaxed: For read operations
  relaxed: { interval: 60000, maxRequests: 60 },     // 60 requests per minute
  
  // Auth: For login/signup attempts
  auth: { interval: 300000, maxRequests: 5 },        // 5 requests per 5 minutes
  
  // Export: For resource-intensive operations
  export: { interval: 300000, maxRequests: 3 },      // 3 requests per 5 minutes
} as const

/**
 * Helper to create rate limit response
 */
export function createRateLimitResponse(result: Awaited<ReturnType<typeof rateLimit>>) {
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  })

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return {
    headers,
    status: 429,
    body: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Please try again in ${result.retryAfter || 60} seconds.`,
      retryAfter: result.retryAfter,
      limit: result.limit,
      reset: new Date(result.reset).toISOString(),
    },
  }
}
