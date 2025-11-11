-- Add retention policy setting to control backup lifecycle
-- Backups older than the retention period will be automatically deleted

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 30;

COMMENT ON COLUMN settings.retention_days IS 'Number of days to retain backups before automatic deletion (0 = keep forever)';
