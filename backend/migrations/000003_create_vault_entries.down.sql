-- Drop trigger
DROP TRIGGER IF EXISTS update_vault_entries_updated_at ON vault_entries;

-- Drop index
DROP INDEX IF EXISTS idx_vault_entries_vault_id;

-- Drop table
DROP TABLE IF EXISTS vault_entries;
