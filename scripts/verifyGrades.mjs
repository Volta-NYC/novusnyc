import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i+1).replace(/^"|"$/g,'')]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data } = await sb.from('team').select('id,name,grade,school').order('name');

const outOfRange = data.filter(m => {
  if (!m.grade) return false;
  const y = parseInt((m.grade.match(/(\d{4})/) || [])[1]);
  return isNaN(y) || y < 2026 || y > 2030;
});

const noGrade = data.filter(m => !m.grade);

const collegeKeywords = ['university', 'community college', 'cuny', 'suny', 'nyu', 'columbia', 'fordham', 'baruch'];
const possibleCollege = data.filter(m => {
  const s = (m.school || '').toLowerCase();
  return collegeKeywords.some(k => s.includes(k));
});

console.log(`Total members: ${data.length}`);
console.log(`With grade: ${data.filter(m=>m.grade).length}`);
console.log(`Out-of-range years: ${outOfRange.length}`);
if (outOfRange.length) outOfRange.forEach(m => console.log(`  BAD: ${m.name} "${m.grade}"`));
else console.log('  ✅ All grad years in 2026–2030');

console.log(`\nPossible college schools: ${possibleCollege.length}`);
possibleCollege.forEach(m => console.log(`  ${m.name} — "${m.school}" — grade: ${m.grade || 'none'}`));
if (!possibleCollege.length) console.log('  ✅ None found');

console.log(`\nMembers without grade (${noGrade.length}):`);
noGrade.forEach(m => console.log(`  ${m.name} — school: "${m.school || ''}"`));
