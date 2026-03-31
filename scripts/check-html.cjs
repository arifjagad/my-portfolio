const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await s
    .from("demo_businesses")
    .select("slug, generated_html")
    .not("generated_html", "is", null)
    .limit(1);

  if (error) { console.error(error); return; }
  if (!data || !data[0]) { console.log("No data"); return; }

  const h = data[0].generated_html;
  console.log("SLUG:", data[0].slug);
  console.log("LENGTH:", h.length, "chars =", (h.length/1024).toFixed(1), "KB");
  console.log("\n--- FIRST 400 chars ---");
  console.log(h.substring(0, 400));
  console.log("\n--- LAST 200 chars ---");
  console.log(h.substring(h.length - 200));
  console.log("\nHas </html>:", h.includes("</html>"));
  console.log("Has <!DOCTYPE:", h.includes("<!DOCTYPE html>"));
}

main();
