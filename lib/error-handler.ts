/**
 * Centralized Error Handler
 * 
 * Provides consistent error handling across the application.
 */

import { PostgrestError } from "@supabase/supabase-js";
import { ValidationError } from "./validations/schemas";

export type AppError = {
    message: string;
    code?: string;
    status: number;
    details?: string;
};

/**
 * Convert any error to a standardized AppError format
 */
export function handleError(error: unknown): AppError {
    // Supabase/Postgres errors
    if (isPostgrestError(error)) {
        return {
            message: error.message,
            code: error.code,
            status: getStatusFromCode(error.code),
            details: error.details || error.hint,
        };
    }

    // Validation errors
    if (error instanceof ValidationError) {
        return {
            message: error.message,
            code: "VALIDATION_ERROR",
            status: 400,
        };
    }

    // Standard Error objects
    if (error instanceof Error) {
        return {
            message: error.message,
            code: "INTERNAL_ERROR",
            status: 500,
        };
    }

    // Unknown errors
    return {
        message: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
        status: 500,
    };
}

/**
 * Type guard for Postgrest errors
 */
function isPostgrestError(error: unknown): error is PostgrestError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error
    );
}

/**
 * Map Postgres error codes to HTTP status codes
 */
function getStatusFromCode(code: string): number {
    const codeMap: Record<string, number> = {
        "23505": 409, // Unique violation
        "23503": 400, // Foreign key violation
        "23502": 400, // Not null violation
        "22P02": 400, // Invalid text representation
        "42501": 403, // Insufficient privilege
        "PGRST116": 404, // Not found
    };
    return codeMap[code] || 500;
}

/**
 * Create a JSON error response for API routes
 */
export function errorResponse(error: unknown): Response {
    const appError = handleError(error);
    return Response.json(
        {
            error: appError.message,
            code: appError.code,
            details: appError.details,
        },
        { status: appError.status }
    );
}

/**
 * Log error to console (and future monitoring service)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
    const appError = handleError(error);

    console.error("[ERROR]", {
        ...appError,
        context,
        timestamp: new Date().toISOString(),
    });

    // TODO: Send to Sentry or other monitoring service
    // if (typeof window === 'undefined') {
    //     Sentry.captureException(error, { extra: context });
    // }
}
