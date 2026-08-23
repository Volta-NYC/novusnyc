-- A row used to mean both "claimed" and "sent". A worker crash after insert
-- suppressed that recipient forever. Claims now expire and delivery is marked
-- only after the mail provider confirms a send.

ALTER TABLE public.automation_deliveries
  ALTER COLUMN sent_at DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_error text;

UPDATE public.automation_deliveries
   SET status = 'sent', claimed_at = coalesce(sent_at, claimed_at)
 WHERE sent_at IS NOT NULL AND status = 'claimed';

CREATE OR REPLACE FUNCTION public.claim_automation_delivery(
  p_id text, p_automation_id text, p_subject_key text, p_recipient text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_claimed boolean := false;
BEGIN
  INSERT INTO public.automation_deliveries
    (id, automation_id, subject_key, recipient, status, claimed_at, sent_at, attempts, last_error)
  VALUES (p_id, p_automation_id, p_subject_key, p_recipient, 'claimed', now(), NULL, 1, NULL)
  ON CONFLICT (automation_id, subject_key, recipient) DO UPDATE SET
    status = 'claimed', claimed_at = now(), sent_at = NULL,
    attempts = automation_deliveries.attempts + 1, last_error = NULL
  WHERE automation_deliveries.status = 'failed'
     OR (automation_deliveries.status = 'claimed'
         AND automation_deliveries.claimed_at < now() - interval '15 minutes')
  RETURNING true INTO v_claimed;
  RETURN coalesce(v_claimed, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_automation_delivery(text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_automation_delivery(text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
