-- Drop trigger
DROP TRIGGER IF EXISTS update_vaults_updated_at ON vaults;

-- Drop index
DROP INDEX IF EXISTS idx_vaults_user_id;

-- Drop table
DROP TABLE IF EXISTS vaults;
