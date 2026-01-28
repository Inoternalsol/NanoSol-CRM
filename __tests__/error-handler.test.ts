/**
 * Unit Tests for lib/error-handler.ts
 */

import { ValidationError } from '../lib/validations/schemas';
import { handleError as handleErrorFn } from '../lib/error-handler';

describe('handleError', () => {
    it('should handle ValidationError', () => {
        const error = new ValidationError('email: Invalid email');
        const result = handleErrorFn(error);

        expect(result.message).toBe('email: Invalid email');
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.status).toBe(400);
    });

    it('should handle standard Error', () => {
        const error = new Error('Something went wrong');
        const result = handleErrorFn(error);

        expect(result.message).toBe('Something went wrong');
        expect(result.code).toBe('INTERNAL_ERROR');
        expect(result.status).toBe(500);
    });

    it('should handle unknown errors', () => {
        const result = handleErrorFn('string error');

        expect(result.message).toBe('An unexpected error occurred');
        expect(result.code).toBe('UNKNOWN_ERROR');
        expect(result.status).toBe(500);
    });

    it('should handle Postgrest-like errors', () => {
        const error = {
            code: '23505',
            message: 'Duplicate key violation',
            details: 'Key already exists',
        };
        const result = handleErrorFn(error);

        expect(result.message).toBe('Duplicate key violation');
        expect(result.code).toBe('23505');
        expect(result.status).toBe(409); // Conflict
    });
});
