import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data } = await s
  .from("demo_businesses")
  .select("slug, generated_html")
  .not("generated_html", "is", null)
  .limit(1);

if (data && data[0]) {
  const h = data[0].generated_html as string;
  console.log("SLUG:", data[0].slug);
  console.log("LENGTH:", h.length, "chars =", (h.length/1024).toFixed(1), "KB");
  console.log("\nFIRST 300 chars:");
  console.log(h.substring(0, 300));
  console.log("\nLAST 200 chars:");
  console.log(h.substring(h.length - 200));
  console.log("\nHas </html>:", h.includes("</html>"));
  console.log("Has <!DOCTYPE:", h.includes("<!DOCTYPE html>"));
}
