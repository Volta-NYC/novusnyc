-- Add permissions jsonb column to site_settings for the role permissions matrix.
-- Default grants all permissions to Senior Analyst and above; analysts get a
-- conservative subset; reserve members get none.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{
    "Analyst":         {"interview": false, "reviewSubmissions": false, "email": false, "viewApplicants": false, "manageAssignments": false, "manageShowcase": false},
    "Senior Analyst":  {"interview": false, "reviewSubmissions": false, "email": false, "viewApplicants": false, "manageAssignments": false, "manageShowcase": false},
    "Associate":       {"interview": true,  "reviewSubmissions": true,  "email": true,  "viewApplicants": true,  "manageAssignments": true,  "manageShowcase": true},
    "Reserve":         {"interview": false, "reviewSubmissions": false, "email": false, "viewApplicants": false, "manageAssignments": false, "manageShowcase": false}
  }'::jsonb;
