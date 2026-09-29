/**
 * lib/admin-access.ts
 * Allowlist email admin. Login Supabase saja tidak cukup: signup publik
 * via API bisa membuat user baru dengan anon key.
 *
 * Env: ADMIN_EMAILS="a@x.com,b@y.com"
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    console.warn("[Admin] ADMIN_EMAILS belum diisi — semua akses admin ditolak");
    return false;
  }

  return allowed.includes(email.trim().toLowerCase());
}
