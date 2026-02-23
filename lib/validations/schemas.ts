/**
 * Zod Validation Schemas for API Routes
 * 
 * Centralized validation schemas for all API inputs.
 * Use these schemas to validate request bodies before processing.
 */

import { z } from "zod";

// ============================================
// VALIDATION HELPERS
// ============================================

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
