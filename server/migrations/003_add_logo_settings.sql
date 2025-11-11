-- Add logo columns to settings table
-- This allows storing custom logos for branding

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS login_logo TEXT,
ADD COLUMN IF NOT EXISTS header_logo TEXT;

COMMENT ON COLUMN settings.login_logo IS 'Base64 encoded logo image for login page';
COMMENT ON COLUMN settings.header_logo IS 'Base64 encoded logo image for app header';
