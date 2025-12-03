-- Create vault_entries table
CREATE TABLE IF NOT EXISTS vault_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    encrypted_data BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_nonce_length CHECK (octet_length(nonce) = 12)
);

-- Create index on vault_id for faster lookups
CREATE INDEX idx_vault_entries_vault_id ON vault_entries(vault_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_vault_entries_updated_at
    BEFORE UPDATE ON vault_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
