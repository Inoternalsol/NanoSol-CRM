-- Migration: Update Contact Statuses
-- Adds: Reassign, Recovery, Depositor, High potential
-- Standardizes existing labels

-- 1. Insert the new statuses for each organization
INSERT INTO public.contact_statuses (organization_id, name, label, color, "order")
SELECT o.id, s.name, s.label, s.color, s.ord
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('new', 'New', 'gray', 1),
        ('no_answer', 'No Answer', 'orange', 2),
        ('reassign', 'Reassign', 'orange', 3),
        ('recovery', 'Recovery', 'blue', 4),
        ('not_interested', 'Not interested', 'red', 5),
        ('call_back', 'Call back', 'blue', 6),
        ('not_potential', 'Not potential', 'slate', 7),
        ('voice_message', 'Voice message', 'purple', 8),
        ('depositor', 'Depositor', 'green', 9),
        ('high_potential', 'High potential', 'yellow', 10)
) AS s(name, label, color, ord)
ON CONFLICT (organization_id, name) DO UPDATE
SET 
    label = EXCLUDED.label,
    color = EXCLUDED.color,
    "order" = EXCLUDED."order";

-- 2. Cleanup any duplicates or old names if they exist (e.g. 'no_answer_1')
DELETE FROM public.contact_statuses
WHERE name IN ('no_answer_1', 'no_answer_2', 'no_answer_3', 'contacted', 'qualified', 'unqualified', 'customer');

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
