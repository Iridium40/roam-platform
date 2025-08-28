-- Create manual_bank_accounts table for manual bank account entry
CREATE TABLE IF NOT EXISTS manual_bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
    account_number TEXT NOT NULL,
    routing_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    stripe_account_id TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manual_bank_accounts_user_id ON manual_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_bank_accounts_business_id ON manual_bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_manual_bank_accounts_is_default ON manual_bank_accounts(is_default);

-- Enable Row Level Security
ALTER TABLE manual_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own manual bank accounts" ON manual_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual bank accounts" ON manual_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual bank accounts" ON manual_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual bank accounts" ON manual_bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policy for viewing all manual bank accounts
CREATE POLICY "Admins can view all manual bank accounts" ON manual_bank_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manual_bank_accounts_updated_at
    BEFORE UPDATE ON manual_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_bank_accounts_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON manual_bank_accounts TO authenticated;
GRANT SELECT ON manual_bank_accounts TO anon;
