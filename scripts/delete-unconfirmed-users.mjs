// One-time script: delete all unconfirmed Supabase auth users.
// Run with: node scripts/delete-unconfirmed-users.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Parse .env.local manually
const envPath = join(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAllUsers() {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  return all;
}

const users = await getAllUsers();
const unconfirmed = users.filter(u => !u.email_confirmed_at);

console.log(`Found ${users.length} total auth users, ${unconfirmed.length} unconfirmed.`);
if (unconfirmed.length === 0) {
  console.log("Nothing to delete.");
  process.exit(0);
}

console.log("Deleting unconfirmed users:");
let deleted = 0;
for (const user of unconfirmed) {
  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`  FAILED ${user.email}: ${error.message}`);
  } else {
    console.log(`  deleted ${user.email}`);
    deleted++;
  }
}

console.log(`\nDone. Deleted ${deleted}/${unconfirmed.length} unconfirmed users.`);
