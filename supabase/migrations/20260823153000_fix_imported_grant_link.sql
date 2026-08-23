-- The source cell contains four borough-specific links. Keep the first valid
-- destination in the URL field and preserve the rest as a searchable note.
UPDATE public.grant_opportunities
SET url = 'https://www.nypl.org/business/events/new-york-startup-business-plan-competition',
    notes = concat_ws(E'\n', nullif(notes, ''),
      'Additional borough links: Brooklyn Public Library, Queens StartUP, and BX-Factor were listed in the source workbook.')
WHERE id = 'grant_sheet_11';
