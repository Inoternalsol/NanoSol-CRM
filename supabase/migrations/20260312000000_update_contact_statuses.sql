-- Update contact statuses to: New, Not interested, Call back, No Answer, Not potential, Voice message
-- This migration replaces the old default statuses and maps existing contact records.

-- 1. Delete old default statuses from contact_statuses table for all organizations
DELETE FROM public.contact_statuses
WHERE name IN ('contacted', 'qualified', 'unqualified', 'customer');

-- 2. Insert the new statuses for each organization (skip 'new' since it already exists)
INSERT INTO public.contact_statuses (organization_id, name, label, color, "order")
SELECT o.id, s.name, s.label, s.color, s.ord
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('not_interested', 'Not interested', 'red', 2),
        ('call_back', 'Call back', 'blue', 3),
        ('no_answer', 'No Answer', 'orange', 4),
        ('not_potential', 'Not potential', 'slate', 5),
        ('voice_message', 'Voice message', 'purple', 6)
) AS s(name, label, color, ord)
ON CONFLICT (organization_id, name) DO NOTHING;

-- 3. Update existing 'new' status order to 1 for consistency
UPDATE public.contact_statuses
SET "order" = 1
WHERE name = 'new';

-- 4. Map old contact status values on the contacts table to 'new'
-- (contacts with old statuses like 'contacted', 'qualified' etc. get reset to 'new')
UPDATE public.contacts
SET status = 'new'
WHERE status IN ('contacted', 'qualified', 'unqualified', 'customer');

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
