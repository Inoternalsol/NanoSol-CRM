/**
 * Barrel file for backward compatibility
 * 
 * This file re-exports all hooks from domain-specific files to maintain
 * compatibility with existing imports from "@/hooks/use-data"
 * 
 * For new code, prefer importing directly from the domain-specific files:
 * - @/hooks/use-contacts
 * - @/hooks/use-deals
 * - @/hooks/use-calendar
 * - @/hooks/use-email
 * - @/hooks/use-calls
 * - @/hooks/use-settings
 * - @/hooks/use-automations
 */

// Contacts
export {
    useContacts,
    useContactsPaginated,
    useContact,
    useContactStatuses,
    useCreateContact,
    useUpdateContact,
    useDeleteContact,
    useContactByPhone,
    useBulkCreateContacts,
    useCreateContactStatus,
    useUpdateContactStatus,
    useDeleteContactStatus,
    useContactCount,
} from "./use-contacts";

// Re-export pagination types
export type { PaginationParams, PaginatedResult } from "./use-contacts";

// Deals, Tasks, Activities, Pipelines
export {
    useDeals,
    useDealsPaginated,
    useDeal,
    usePipelines,
    useActivities,
    useTasks,
    useCreateDeal,
    useUpdateDeal,
    useDeleteDeal,
    useCreateTask,
    useCompleteTask,
    useCreateActivity,
    useDealStats,
} from "./use-deals";

// Calendar
export {
    useCalendarEvents,
    useCreateCalendarEvent,
} from "./use-calendar";

// Email Templates & Sequences
export {
    useEmailTemplates,
    useEmailSequences,
    useCreateEmailSequence,
    useUpdateEmailSequence,
    useDeleteEmailSequence,
    useCreateEmailTemplate,
    useUpdateEmailTemplate,
    useDeleteEmailTemplate,
    useSequenceEnrollments,
    useEnrollInSequence,
    useUpdateEnrollment,
    useDeleteEnrollment,
    useSMTPConfigs,
    useSaveEmailAccount,
} from "./use-email";

// Call Logs
export {
    useCallLogs,
    useCreateCallLog,
    useUpdateCallLog,
} from "./use-calls";

// Settings (Profiles, Org, SIP, SMTP, API Keys)
export {
    useActiveProfile,
    useProfiles,
    useOrganization,
    useSipProfile,
    useSmtpConfig,
    useApiKeys,
    useUpdateProfile,
    useDeleteProfile,
    useCreateProfile,
    useUpdateOrganization,
    useUpdateSipProfile,
    useUpdateSmtpConfig,
    useUpdateApiKeys,
    useIntegrations,
    useSyncCalendar,
} from "./use-settings";

// Automation Rules
export {
    useAutomationRules,
    useCreateAutomationRule,
    useUpdateAutomationRule,
    useDeleteAutomationRule,
    useToggleAutomationRule,
} from "./use-automations";
