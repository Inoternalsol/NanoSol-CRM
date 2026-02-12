-- Fix Missing Tables and Columns (contact_statuses, sip_profiles)
-- 1. Create contact_statuses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contact_statuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT 'gray',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- RLS for contact_statuses
ALTER TABLE public.contact_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_statuses_select" ON public.contact_statuses;
CREATE POLICY "contact_statuses_select" ON public.contact_statuses FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "contact_statuses_manage" ON public.contact_statuses;
CREATE POLICY "contact_statuses_manage" ON public.contact_statuses FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- 2. Add missing columns to sip_profiles (Idempotent)
DO $$
BEGIN
    -- Add name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sip_profiles' AND column_name='name') THEN
        ALTER TABLE public.sip_profiles ADD COLUMN name TEXT DEFAULT 'Default SIP Account';
    END IF;

    -- Add is_default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sip_profiles' AND column_name='is_default') THEN
        ALTER TABLE public.sip_profiles ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add websocket_server
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sip_profiles' AND column_name='websocket_server') THEN
        ALTER TABLE public.sip_profiles ADD COLUMN websocket_server TEXT;
    END IF;

    -- Add updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sip_profiles' AND column_name='updated_at') THEN
        ALTER TABLE public.sip_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Update Trigger for SIP Profiles (Idempotent)
CREATE OR REPLACE FUNCTION update_sip_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sip_profiles_updated_at ON sip_profiles;
CREATE TRIGGER trigger_sip_profiles_updated_at
    BEFORE UPDATE ON sip_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_sip_profile_updated_at();

-- 4. Ensure Single Default SIP Trigger (Idempotent)
CREATE OR REPLACE FUNCTION ensure_single_default_sip()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this account as default, unset others for this user
    IF NEW.is_default = TRUE THEN
        UPDATE sip_profiles 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_sip ON sip_profiles;
CREATE TRIGGER trigger_ensure_single_default_sip
    BEFORE INSERT OR UPDATE ON sip_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_sip();