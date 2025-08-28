-- Create plaid_bank_connections table for Plaid integration
CREATE TABLE IF NOT EXISTS plaid_bank_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    plaid_access_token TEXT,
    plaid_item_id TEXT,
    plaid_account_id TEXT,
    institution_id TEXT,
    institution_name TEXT,
    account_name TEXT,
    account_mask TEXT,
    account_type TEXT,
    account_subtype TEXT,
    verification_status TEXT,
    routing_numbers TEXT[],
    account_number_mask TEXT,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_bank_connections_user_id ON plaid_bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_bank_connections_business_id ON plaid_bank_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_plaid_bank_connections_plaid_item_id ON plaid_bank_connections(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_bank_connections_is_active ON plaid_bank_connections(is_active);

-- Enable Row Level Security
ALTER TABLE plaid_bank_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own plaid connections" ON plaid_bank_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plaid connections" ON plaid_bank_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plaid connections" ON plaid_bank_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plaid connections" ON plaid_bank_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policy for viewing all plaid connections
CREATE POLICY "Admins can view all plaid connections" ON plaid_bank_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_plaid_bank_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plaid_bank_connections_updated_at
    BEFORE UPDATE ON plaid_bank_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_plaid_bank_connections_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_bank_connections TO authenticated;
GRANT SELECT ON plaid_bank_connections TO anon;
