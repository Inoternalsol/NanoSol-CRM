-- Migration: Add Tables for Expansion Phase 2 (Web Forms, API Keys, Notifications)

-- 1. Web to Lead Forms
CREATE TABLE IF NOT EXISTS public.web_forms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source TEXT NOT NULL, -- 'website', 'google_form', 'linkedin', etc.
    redirect_url TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    config JSONB DEFAULT '{}'::jsonb, -- Mappings: { "email": "contact_email", "name": "full_name" }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for web_forms
ALTER TABLE public.web_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's web forms"
    ON public.web_forms FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their organization's web forms"
    ON public.web_forms FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- 2. Organization API Keys
CREATE TABLE IF NOT EXISTS public.organization_api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL, -- SHA256 hash of the key
    key_prefix TEXT NOT NULL, -- 'nk_live_' or similar
    label TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS for api_keys
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's api keys"
    ON public.organization_api_keys FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage api keys"
    ON public.organization_api_keys FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 3. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL, -- 'lead', 'system', 'mention', 'task', 'warning'
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System/Functions can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (TRUE); -- Allow insert, typically handled by server-side logic or triggers

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger to update updated_at for web_forms
CREATE TRIGGER update_web_forms_modtime
    BEFORE UPDATE ON public.web_forms
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
