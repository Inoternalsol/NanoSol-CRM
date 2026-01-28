/**
 * Unit Tests for lib/rate-limit.ts
 */

import { checkRateLimit, getRateLimitHeaders } from '../lib/rate-limit';

describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
        const key = `test-${Date.now()}`;
        const result = checkRateLimit(key, { maxRequests: 5, windowMs: 1000 });

        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(4);
    });

    it('should track request count', () => {
        const key = `test-count-${Date.now()}`;
        const config = { maxRequests: 3, windowMs: 1000 };

        checkRateLimit(key, config);
        checkRateLimit(key, config);
        const result = checkRateLimit(key, config);

        expect(result.remaining).toBe(0);
        expect(result.limited).toBe(false);
    });

    it('should limit when exceeding max requests', () => {
        const key = `test-limit-${Date.now()}`;
        const config = { maxRequests: 2, windowMs: 1000 };

        checkRateLimit(key, config);
        checkRateLimit(key, config);
        const result = checkRateLimit(key, config);

        expect(result.limited).toBe(true);
        expect(result.remaining).toBe(0);
    });

    it('should use key prefix', () => {
        const key = `test-prefix-${Date.now()}`;
        const result1 = checkRateLimit(key, { keyPrefix: 'api', maxRequests: 5 });
        const result2 = checkRateLimit(key, { keyPrefix: 'auth', maxRequests: 5 });

        // Both should show 4 remaining (separate tracking)
        expect(result1.remaining).toBe(4);
        expect(result2.remaining).toBe(4);
    });
});

describe('getRateLimitHeaders', () => {
    it('should return correct headers', () => {
        const headers = getRateLimitHeaders(50, 30000, 100);

        expect(headers['X-RateLimit-Limit']).toBe('100');
        expect(headers['X-RateLimit-Remaining']).toBe('50');
        expect(headers['X-RateLimit-Reset']).toBeDefined();
    });
});
