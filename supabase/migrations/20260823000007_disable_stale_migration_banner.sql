-- The Firebase-to-Supabase migration is complete. Stop advertising the old
-- account-setup transition on every public page.
UPDATE public.site_settings
SET public_banner_enabled = false,
    public_banner_message = '',
    updated_at = now()
WHERE id = 'singleton'
  AND (
    public_banner_enabled = true
    OR public_banner_message ILIKE '%Firebase%'
    OR public_banner_message ILIKE '%migrat%'
  );
