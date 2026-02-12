/**
 * Zod Validation Schemas for API Routes
 * 
 * Centralized validation schemas for all API inputs.
 * Use these schemas to validate request bodies before processing.
 */

import { z } from "zod";

// ============================================
// CONTACT SCHEMAS
// ============================================

export const createContactSchema = z.object({
    organization_id: z.string().uuid(),
    first_name: z.string().min(1, "First name is required").max(100),
    last_name: z.string().max(100).nullable().optional(),
    email: z.string().email("Invalid email").nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    company: z.string().max(200).nullable().optional(),
    job_title: z.string().max(100).nullable().optional(),
    status: z.string().default("new"),
    lead_score: z.number().int().min(0).max(100).default(0),
    tags: z.array(z.string()).default([]),
    custom_fields: z.record(z.string(), z.unknown()).default({}),
});

export const updateContactSchema = createContactSchema.partial().extend({
    id: z.string().uuid(),
});

// ============================================
// DEAL SCHEMAS
// ============================================

export const createDealSchema = z.object({
    organization_id: z.string().uuid(),
    contact_id: z.string().uuid().nullable().optional(),
    name: z.string().min(1, "Deal name is required").max(200),
    value: z.number().min(0).default(0),
    stage: z.enum(["lead", "qualified", "proposal", "negotiation", "closed-won", "closed-lost"]).default("lead"),
    probability: z.number().min(0).max(100).default(0),
    expected_close_date: z.string().datetime().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export const updateDealSchema = createDealSchema.partial().extend({
    id: z.string().uuid(),
});

// ============================================
// TASK SCHEMAS
// ============================================

export const createTaskSchema = z.object({
    organization_id: z.string().uuid(),
    title: z.string().min(1, "Task title is required").max(200),
    description: z.string().nullable().optional(),
    due_date: z.string().datetime().nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
    assigned_to_id: z.string().uuid().nullable().optional(),
    contact_id: z.string().uuid().nullable().optional(),
    deal_id: z.string().uuid().nullable().optional(),
});

// ============================================
// EMAIL SCHEMAS
// ============================================

export const createEmailTemplateSchema = z.object({
    organization_id: z.string().uuid(),
    name: z.string().min(1, "Template name is required").max(100),
    subject: z.string().min(1, "Subject is required").max(200),
    body: z.string().min(1, "Body is required"),
    variables: z.array(z.string()).default([]),
});

export const createEmailSequenceSchema = z.object({
    organization_id: z.string().uuid(),
    name: z.string().min(1, "Sequence name is required").max(100),
    steps: z.array(z.object({
        template_id: z.string().uuid(),
        delay_days: z.number().int().min(0),
        order: z.number().int().min(0),
    })).default([]),
    is_active: z.boolean().default(true),
});

// ============================================
// AUTOMATION SCHEMAS
// ============================================

export const createAutomationSchema = z.object({
    organization_id: z.string().uuid(),
    name: z.string().min(1, "Automation name is required").max(100),
    trigger_type: z.string().min(1),
    action_type: z.string().min(1),
    trigger_config: z.record(z.string(), z.unknown()).default({}),
    action_config: z.record(z.string(), z.unknown()).default({}),
    is_active: z.boolean().default(true),
});

// ============================================
// CALL LOG SCHEMAS
// ============================================

export const createCallLogSchema = z.object({
    organization_id: z.string().uuid(),
    user_id: z.string().uuid(),
    contact_id: z.string().uuid().nullable().optional(),
    direction: z.enum(["inbound", "outbound"]),
    status: z.enum(["completed", "missed", "failed", "no_answer", "busy"]),
    duration_seconds: z.number().int().min(0).default(0),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().nullable().optional(),
    recording_url: z.string().url().nullable().optional(),
    notes: z.string().nullable().optional(),
    sentiment: z.enum(["positive", "neutral", "negative"]).nullable().optional(),
});

// ============================================
// TEAM SCHEMAS
// ============================================

export const createTeamMemberSchema = z.object({
    organization_id: z.string().uuid(),
    email: z.string().email("Invalid email"),
    full_name: z.string().min(1, "Name is required").max(100),
    role: z.enum(["admin", "manager", "agent"]).default("agent"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
    id: z.string().uuid(),
    full_name: z.string().max(100).optional(),
    avatar_url: z.string().url().nullable().optional(),
    role: z.enum(["admin", "manager", "agent"]).optional(),
});

// ============================================
// COPILOT SCHEMAS
// ============================================

export const copilotMessageSchema = z.object({
    message: z.string().min(1, "Message is required").max(2000),
    context: z.object({
        current_page: z.string().optional(),
        selected_contact_id: z.string().uuid().nullable().optional(),
        selected_deal_id: z.string().uuid().nullable().optional(),
    }).optional(),
});

// ============================================
// API KEYS SCHEMAS
// ============================================

export const updateApiKeysSchema = z.object({
    organization_id: z.string().uuid(),
    openai_key_encrypted: z.string().nullable().optional(),
    gemini_key_encrypted: z.string().nullable().optional(),
    qwen_key_encrypted: z.string().nullable().optional(),
    kimi_key_encrypted: z.string().nullable().optional(),
    active_provider: z.enum(["openai", "gemini", "qwen", "kimi"]).optional(),
});

// ============================================
// HELPER FUNCTION
// ============================================

/**
 * Validate request body against a Zod schema
 * Returns parsed data or throws formatted error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const flattened = result.error.flatten();
        const fieldErrors = Object.entries(flattened.fieldErrors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join('; ');
        throw new ValidationError(fieldErrors || 'Validation failed');
    }
    return result.data;
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
