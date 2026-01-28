/**
 * Rate Limiting Middleware
 * 
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, use Redis-based limiting.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
    maxRequests: number;     // Max requests per window
    windowMs: number;        // Time window in milliseconds
    keyPrefix?: string;      // Optional prefix for the key
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
};

/**
 * Check if a request should be rate limited
 * 
 * @param key - Unique identifier for the client (usually IP or user ID)
 * @param config - Rate limit configuration
 * @returns Object with limited status and remaining requests
 */
export function checkRateLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
): { limited: boolean; remaining: number; resetIn: number } {
    const { maxRequests, windowMs, keyPrefix } = { ...DEFAULT_CONFIG, ...config };
    const fullKey = keyPrefix ? `${keyPrefix}:${key}` : key;
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
        cleanupExpired();
    }

    const entry = rateLimitStore.get(fullKey);

    if (!entry || now > entry.resetTime) {
        // Create new entry
        rateLimitStore.set(fullKey, {
            count: 1,
            resetTime: now + windowMs,
        });
        return { limited: false, remaining: maxRequests - 1, resetIn: windowMs };
    }

    // Increment existing entry
    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetIn = entry.resetTime - now;

    if (entry.count > maxRequests) {
        return { limited: true, remaining: 0, resetIn };
    }

    return { limited: false, remaining, resetIn };
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(
    remaining: number,
    resetIn: number,
    limit: number
): Record<string, string> {
    return {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + resetIn / 1000).toString(),
    };
}

/**
 * Rate limit an API route
 * Returns a Response if rate limited, or null if allowed
 */
export function rateLimit(
    request: Request,
    config: Partial<RateLimitConfig> = {}
): Response | null {
    const { maxRequests = DEFAULT_CONFIG.maxRequests, windowMs = DEFAULT_CONFIG.windowMs } = config;

    // Get client IP from headers (Vercel/Cloudflare)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    const { limited, remaining, resetIn } = checkRateLimit(ip, config);
    const headers = getRateLimitHeaders(remaining, resetIn, maxRequests);

    if (limited) {
        return new Response(
            JSON.stringify({
                error: "Too many requests",
                message: `Rate limit exceeded. Please try again in ${Math.ceil(resetIn / 1000)} seconds.`,
            }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    ...headers,
                    "Retry-After": Math.ceil(resetIn / 1000).toString(),
                },
            }
        );
    }

    return null;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Stricter rate limit for auth endpoints
 */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    keyPrefix: "auth",
};

/**
 * Standard API rate limit
 */
export const API_RATE_LIMIT: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    keyPrefix: "api",
};
