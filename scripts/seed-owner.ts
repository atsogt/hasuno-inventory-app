// One-time bootstrap: creates the first owner account directly against Supabase.
// Usage: OWNER_NAME=Andy OWNER_PASSWORD=... npm run seed:owner
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

function nameToEmail(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const domain = process.env.AUTH_EMAIL_DOMAIN || "hasuno.local";
  return `${slug}@${domain}`;
}

async function main() {
  const name = process.env.OWNER_NAME;
  const password = process.env.OWNER_PASSWORD;
  if (!name || !password) {
    console.error("Set OWNER_NAME and OWNER_PASSWORD env vars before running this script.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = nameToEmail(name);
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    name,
    role: "owner",
    locked: false,
  });
  if (profileError) throw profileError;

  console.log(`Owner account created: ${name} (login with this name + the password you set).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
