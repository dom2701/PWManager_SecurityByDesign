-- Create mfa_secrets table
CREATE TABLE IF NOT EXISTS mfa_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    totp_secret_encrypted BYTEA NOT NULL,
    backup_codes_encrypted BYTEA,
    method VARCHAR(50) DEFAULT 'totp',
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_mfa_secrets_user_id ON mfa_secrets(user_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_mfa_secrets_updated_at
    BEFORE UPDATE ON mfa_secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
