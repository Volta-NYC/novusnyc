import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i+1).replace(/^"|"$/g,'')]; })
);
const serviceAccount = JSON.parse(readFileSync('/Users/ethanzhang180/Downloads/volta-nyc-firebase-adminsdk-fbsvc-074e025237.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://volta-nyc-default-rtdb.firebaseio.com',
});
const rtdb = admin.database();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function detectMimeAndBuffer(rawData) {
  // May be a plain base64 string or a data URL like data:image/jpeg;base64,...
  let mime = 'image/jpeg';
  let b64 = rawData;
  if (rawData.startsWith('data:')) {
    const comma = rawData.indexOf(',');
    const meta = rawData.slice(5, comma);
    mime = meta.split(';')[0] || 'image/jpeg';
    b64 = rawData.slice(comma + 1);
  }
  const buffer = Buffer.from(b64, 'base64');
  // Sniff magic bytes if no data URL header
  if (!rawData.startsWith('data:')) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) mime = 'image/png';
    else if (buffer[0] === 0xff && buffer[1] === 0xd8) mime = 'image/jpeg';
    else if (buffer[0] === 0x47 && buffer[1] === 0x49) mime = 'image/gif';
    else if (buffer[0] === 0x52 && buffer[1] === 0x49) mime = 'image/webp';
  }
  return { mime, buffer };
}

function mimeToExt(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

const normalize = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Fetch Firebase businesses with image data
const snap = await rtdb.ref('/businesses').once('value');
const fbBizRaw = snap.val() || {};
const fbWithImages = Object.entries(fbBizRaw)
  .filter(([, v]) => v.showcaseImageData && typeof v.showcaseImageData === 'string' && v.showcaseImageData.length > 100)
  .map(([id, v]) => ({ fbId: id, name: v.name, imageData: v.showcaseImageData }));

// Fetch Supabase businesses
const { data: sbBiz } = await sb.from('businesses').select('id, name, showcase_image_path');
const sbMap = new Map(sbBiz.map(b => [normalize(b.name), b]));

let success = 0, skipped = 0, failed = 0;

for (const fb of fbWithImages) {
  const sbBusiness = sbMap.get(normalize(fb.name));
  if (!sbBusiness) {
    console.log(`❌ No Supabase match for "${fb.name}" — skipping`);
    failed++;
    continue;
  }

  if (sbBusiness.showcase_image_path) {
    console.log(`⏭  "${fb.name}" already has image at ${sbBusiness.showcase_image_path} — skipping`);
    skipped++;
    continue;
  }

  try {
    const { mime, buffer } = detectMimeAndBuffer(fb.imageData);
    const ext = mimeToExt(mime);
    const path = `${sbBusiness.id}/showcase.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from('business-photos')
      .upload(path, buffer, { contentType: mime, upsert: true });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data: urlData } = sb.storage.from('business-photos').getPublicUrl(path);
    const publicUrl = urlData?.publicUrl ?? '';

    const { error: updateErr } = await sb.from('businesses').update({
      showcase_image_path: path,
      showcase_image_url: publicUrl,
      showcase_image_set: true,
      updated_at: new Date().toISOString(),
    }).eq('id', sbBusiness.id);

    if (updateErr) throw new Error(updateErr.message);

    console.log(`✅ "${fb.name}" — uploaded ${(buffer.length / 1024).toFixed(0)} KB as ${ext} → ${path}`);
    success++;
  } catch (err) {
    console.error(`❌ "${fb.name}" — FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${success} uploaded, ${skipped} skipped, ${failed} failed`);
process.exit(0);
