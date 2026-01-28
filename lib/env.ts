/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at build/runtime.
 * Throws clear errors if configuration is missing.
 */

import { z } from "zod";

const envSchema = z.object({
    // Supabase (required)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

    // Optional integrations
    OPENAI_API_KEY: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),

    // App config
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Optional: Sentry
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

// Parse and validate environment variables
function validateEnv() {
    const parsed = envSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    });

    if (!parsed.success) {
        const flattened = parsed.error.flatten();
        console.error("❌ Invalid environment variables:");
        Object.entries(flattened.fieldErrors).forEach(([field, errors]) => {
            console.error(`  - ${field}: ${(errors as string[]).join(', ')}`);
        });

        if (process.env.NODE_ENV === "production") {
            throw new Error("Invalid environment configuration");
        }
    }

    return parsed.data;
}

// Export validated environment
export const env = validateEnv();

// Type-safe access to environment variables
export type Env = z.infer<typeof envSchema>;
