/**
 * Unit Tests for lib/utils.ts
 */

import { cn, formatCurrency, formatDate, formatDateTime, generateId, truncate, sleep, debounce } from '../lib/utils';

describe('cn (classnames utility)', () => {
    it('should merge class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge Tailwind classes correctly', () => {
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle undefined and null', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
});

describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
        expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle zero', () => {
        expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
        expect(formatCurrency(-500)).toBe('-$500.00');
    });

    it('should handle large numbers', () => {
        expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should support different currencies', () => {
        expect(formatCurrency(100, 'EUR')).toMatch(/€|EUR/);
    });
});

describe('formatDate', () => {
    it('should format Date object', () => {
        const date = new Date('2024-01-15');
        const formatted = formatDate(date);
        expect(formatted).toMatch(/Jan.*15.*2024/);
    });

    it('should format date string', () => {
        const formatted = formatDate('2024-06-20');
        expect(formatted).toMatch(/Jun.*20.*2024/);
    });
});

describe('formatDateTime', () => {
    it('should format date with time', () => {
        const date = new Date('2024-01-15T14:30:00');
        const formatted = formatDateTime(date);
        expect(formatted).toMatch(/Jan.*15.*2024/);
        expect(formatted).toMatch(/2:30|14:30/);
    });
});

describe('generateId', () => {
    it('should generate a string', () => {
        const id = generateId();
        expect(typeof id).toBe('string');
    });

    it('should generate unique ids', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()));
        expect(ids.size).toBe(100);
    });

    it('should generate ids of expected length', () => {
        const id = generateId();
        expect(id.length).toBe(7);
    });
});

describe('truncate', () => {
    it('should truncate long strings', () => {
        expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
        expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('should handle exact length', () => {
        expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
        expect(truncate('', 5)).toBe('');
    });
});

describe('sleep', () => {
    it('should resolve after specified time', async () => {
        const start = Date.now();
        await sleep(100);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });

    it('should return a promise', () => {
        expect(sleep(10)).toBeInstanceOf(Promise);
    });
});

describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('arg1', 'arg2');
        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    afterEach(() => {
        jest.clearAllTimers();
    });
});
