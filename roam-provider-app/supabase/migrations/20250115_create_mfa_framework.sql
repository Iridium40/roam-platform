-- MFA Framework Implementation for HIPAA Compliance
-- This migration creates the necessary tables for Multi-Factor Authentication

-- Create MFA methods enum
CREATE TYPE mfa_method_type AS ENUM (
    'totp',     -- Time-based One-Time Password (Google Authenticator, Authy)
    'sms',      -- SMS-based verification
    'email',    -- Email-based verification
    'backup'    -- Backup codes
);

-- Create MFA status enum
CREATE TYPE mfa_status_type AS ENUM (
    'pending',      -- MFA setup initiated but not completed
    'active',       -- MFA is active and required
    'disabled',     -- MFA is disabled
    'locked'        -- MFA is temporarily locked due to failed attempts
);

-- Create MFA factors table (extends Supabase auth.mfa_factors)
CREATE TABLE public.mfa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    factor_id UUID NOT NULL, -- References Supabase auth.mfa_factors.id
    method mfa_method_type NOT NULL,
    friendly_name TEXT, -- User-friendly name for the factor
    secret TEXT, -- Encrypted secret for TOTP
    backup_codes TEXT[], -- Array of backup codes (encrypted)
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verification_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one primary factor per user
    UNIQUE(user_id, is_primary) WHERE is_primary = true,
    
    -- Ensure unique factor_id per user
    UNIQUE(user_id, factor_id)
);

-- Create MFA challenges table (extends Supabase auth.mfa_challenges)
CREATE TABLE public.mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL, -- References Supabase auth.mfa_challenges.id
    factor_id UUID NOT NULL REFERENCES public.mfa_factors(id) ON DELETE CASCADE,
    method mfa_method_type NOT NULL,
    code TEXT, -- The verification code sent/generated
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MFA sessions table for tracking MFA-completed sessions
CREATE TABLE public.mfa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL, -- References Supabase auth.sessions.id
    factor_id UUID NOT NULL REFERENCES public.mfa_factors(id) ON DELETE CASCADE,
    mfa_completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MFA settings table for user MFA preferences
CREATE TABLE public.mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_required BOOLEAN DEFAULT true, -- Whether MFA is required for this user
    remember_device_days INTEGER DEFAULT 30, -- Days to remember device
    backup_codes_enabled BOOLEAN DEFAULT true,
    backup_codes_count INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_mfa_factors_user_id ON public.mfa_factors(user_id);
CREATE INDEX idx_mfa_factors_method ON public.mfa_factors(method);
CREATE INDEX idx_mfa_factors_is_primary ON public.mfa_factors(is_primary) WHERE is_primary = true;
CREATE INDEX idx_mfa_challenges_user_id ON public.mfa_challenges(user_id);
CREATE INDEX idx_mfa_challenges_expires_at ON public.mfa_challenges(expires_at);
CREATE INDEX idx_mfa_sessions_user_id ON public.mfa_sessions(user_id);
CREATE INDEX idx_mfa_sessions_session_id ON public.mfa_sessions(session_id);
CREATE INDEX idx_mfa_settings_user_id ON public.mfa_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mfa_factors
CREATE POLICY "Users can view their own MFA factors" ON public.mfa_factors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA factors" ON public.mfa_factors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA factors" ON public.mfa_factors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MFA factors" ON public.mfa_factors
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mfa_challenges
CREATE POLICY "Users can view their own MFA challenges" ON public.mfa_challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA challenges" ON public.mfa_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA challenges" ON public.mfa_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for mfa_sessions
CREATE POLICY "Users can view their own MFA sessions" ON public.mfa_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA sessions" ON public.mfa_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MFA sessions" ON public.mfa_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mfa_settings
CREATE POLICY "Users can view their own MFA settings" ON public.mfa_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA settings" ON public.mfa_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings" ON public.mfa_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies for viewing all MFA data
CREATE POLICY "Admins can view all MFA data" ON public.mfa_factors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

CREATE POLICY "Admins can view all MFA challenges" ON public.mfa_challenges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

CREATE POLICY "Admins can view all MFA sessions" ON public.mfa_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

CREATE POLICY "Admins can view all MFA settings" ON public.mfa_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Create triggers for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_mfa_factors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mfa_factors_updated_at
    BEFORE UPDATE ON public.mfa_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_mfa_factors_updated_at();

CREATE OR REPLACE FUNCTION update_mfa_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mfa_settings_updated_at
    BEFORE UPDATE ON public.mfa_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_mfa_settings_updated_at();

-- Helper functions for MFA operations
CREATE OR REPLACE FUNCTION get_user_mfa_status(check_user_id UUID)
RETURNS TABLE(
    mfa_enabled BOOLEAN,
    mfa_required BOOLEAN,
    primary_factor_id UUID,
    primary_method mfa_method_type,
    backup_codes_enabled BOOLEAN,
    backup_codes_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.mfa_enabled,
        ms.mfa_required,
        mf.id as primary_factor_id,
        mf.method as primary_method,
        ms.backup_codes_enabled,
        ms.backup_codes_count
    FROM public.mfa_settings ms
    LEFT JOIN public.mfa_factors mf ON ms.user_id = mf.user_id AND mf.is_primary = true
    WHERE ms.user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has completed MFA for current session
CREATE OR REPLACE FUNCTION has_mfa_completed_for_session(check_user_id UUID, check_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.mfa_sessions ms
        WHERE ms.user_id = check_user_id 
        AND ms.session_id = check_session_id
        AND ms.expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired MFA challenges
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.mfa_challenges 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired MFA sessions
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.mfa_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mfa_challenges TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.mfa_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mfa_settings TO authenticated;

GRANT SELECT ON public.mfa_factors TO anon;
GRANT SELECT ON public.mfa_challenges TO anon;
GRANT SELECT ON public.mfa_sessions TO anon;
GRANT SELECT ON public.mfa_settings TO anon;

-- Comments
COMMENT ON TABLE public.mfa_factors IS 'MFA factors for user authentication';
COMMENT ON TABLE public.mfa_challenges IS 'MFA verification challenges';
COMMENT ON TABLE public.mfa_sessions IS 'MFA-completed sessions tracking';
COMMENT ON TABLE public.mfa_settings IS 'User MFA preferences and settings';
COMMENT ON FUNCTION get_user_mfa_status IS 'Get MFA status for a user';
COMMENT ON FUNCTION has_mfa_completed_for_session IS 'Check if user has completed MFA for current session';
COMMENT ON FUNCTION cleanup_expired_mfa_challenges IS 'Clean up expired MFA challenges';
COMMENT ON FUNCTION cleanup_expired_mfa_sessions IS 'Clean up expired MFA sessions';
