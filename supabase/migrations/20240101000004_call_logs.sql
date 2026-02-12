-- ============================================
-- Call Logs Table for NanoSol CRM
-- Stores call history from SIP dialer
-- ============================================

-- Create call_logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    
    -- Call details
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'failed', 'no_answer', 'busy')),
    duration_seconds INTEGER DEFAULT 0,
    
    -- Outcome tracking
    outcome TEXT, -- 'answered', 'no-answer', 'dnd', 'failed', etc.
    notes TEXT,
    
    -- Recording (if available)
    recording_url TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_call_logs_org ON public.call_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user ON public.call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_contact ON public.call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON public.call_logs(started_at DESC);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own org call logs" ON public.call_logs;
CREATE POLICY "Users can view own org call logs"
ON public.call_logs FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert call logs for own org" ON public.call_logs;
CREATE POLICY "Users can insert call logs for own org"
ON public.call_logs FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update own call logs" ON public.call_logs;
CREATE POLICY "Users can update own call logs"
ON public.call_logs FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Grant permissions
GRANT ALL ON public.call_logs TO authenticated;
