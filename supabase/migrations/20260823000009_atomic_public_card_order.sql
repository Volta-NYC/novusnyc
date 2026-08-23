-- Save the complete public-card order as one database operation. The previous
-- API issued one UPDATE per card, so a late failure could leave only part of
-- the list reordered.

CREATE OR REPLACE FUNCTION public.set_public_card_order(
  p_surface text,
  p_ordered_ids text[]
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_expected integer;
  v_distinct integer;
  v_id text;
  v_index integer;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_surface NOT IN ('showcase', 'home') OR coalesce(cardinality(p_ordered_ids), 0) = 0 THEN
    RAISE EXCEPTION 'invalid public-card order';
  END IF;

  SELECT count(DISTINCT item) INTO v_distinct FROM unnest(p_ordered_ids) AS item;
  IF v_distinct <> cardinality(p_ordered_ids) THEN
    RAISE EXCEPTION 'public-card order contains duplicate ids';
  END IF;

  SELECT count(*) INTO v_expected
    FROM public.businesses
   WHERE deleted_at IS NULL
     AND showcase_enabled IS TRUE
     AND (p_surface = 'showcase' OR showcase_featured_on_home IS TRUE);
  IF v_expected <> cardinality(p_ordered_ids) THEN
    RAISE EXCEPTION 'public-card order must contain every eligible card';
  END IF;

  FOR v_index IN 1..cardinality(p_ordered_ids) LOOP
    v_id := p_ordered_ids[v_index];
    IF p_surface = 'home' THEN
      UPDATE public.businesses
         SET home_sort_index = v_index * 1000, updated_at = now()
       WHERE id = v_id AND deleted_at IS NULL
         AND showcase_enabled IS TRUE AND showcase_featured_on_home IS TRUE;
    ELSE
      UPDATE public.businesses
         SET showcase_sort_index = v_index * 1000, updated_at = now()
       WHERE id = v_id AND deleted_at IS NULL AND showcase_enabled IS TRUE;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'public card % is not eligible for %', v_id, p_surface;
    END IF;
  END LOOP;

  RETURN cardinality(p_ordered_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_public_card_order(text,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_public_card_order(text,text[]) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
