-- Marketing applicants pick one of four focus areas; other tracks leave it null.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS marketing_subtrack text;

-- Populated only when "How they heard" names another person (Friend / Referral).
ALTER TABLE applications ADD COLUMN IF NOT EXISTS referral_name text;
