-- Fix broken Unicode character ʊ (U+028A) that appears in handbook content
-- where the recurring-assignment icon ↻ (U+21BB) should render.
-- This was introduced by a copy-paste error in the handbook editor.
UPDATE handbook_pages
SET content = REPLACE(content, 'ʊ', '↻')
WHERE content LIKE '%ʊ%';

NOTIFY pgrst, 'reload schema';
