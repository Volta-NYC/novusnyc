-- RETURNS TABLE creates PL/pgSQL output variables named member_id/action.
-- Qualify the member_notes conflict target by constraint so member_id cannot
-- be mistaken for the output variable.
DO $migration$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.promote_application_transaction(text,text,jsonb,text,text,text,text,text,text)'::regprocedure
  ) INTO v_definition;
  EXECUTE replace(
    v_definition,
    'ON CONFLICT (member_id) DO UPDATE',
    'ON CONFLICT ON CONSTRAINT member_notes_pkey DO UPDATE'
  );
END
$migration$;
