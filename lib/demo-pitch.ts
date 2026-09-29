/**
 * lib/demo-pitch.ts
 * Helper pitching via WhatsApp: normalisasi nomor, template pesan, link wa.me.
 * Aman dipakai di client component.
 */

export interface PitchTarget {
  slug: string;
  nama_bisnis: string;
  kategori: string;
  rating: number | null;
  jumlah_ulasan: number;
  nomor_telepon: string | null;
}

export interface NormalizedPhone {
  /** Format internasional tanpa "+", mis. 6281234567890 */
  e164: string;
  /** false untuk nomor rumah/kantor (mis. 061xxxx) yang kemungkinan tidak punya WhatsApp */
  isMobile: boolean;
}

export const FOLLOW_UP_AFTER_DAYS = 3;

export function normalizePhone(raw: string | null): NormalizedPhone | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;

  if (!digits.startsWith("62") || digits.length < 9 || digits.length > 15) return null;
  return { e164: digits, isMobile: digits.startsWith("628") };
}

export function buildPitchMessage(biz: PitchTarget, demoUrl: string): string {
  const proof =
    biz.rating && biz.jumlah_ulasan > 0
      ? `Saya lihat ${biz.nama_bisnis} punya rating ${biz.rating} dari ${biz.jumlah_ulasan.toLocaleString("id-ID")} ulasan di Google Maps, tapi belum punya website.`
      : `Saya lihat ${biz.nama_bisnis} sudah ada di Google Maps, tapi belum punya website.`;

  return [
    `Halo, selamat siang. Apakah benar ini dengan ${biz.nama_bisnis}?`,
    "",
    `Saya Arif, web developer di Medan. ${proof}`,
    "",
    `Saya sudah buatkan contoh tampilan website khusus untuk ${biz.nama_bisnis}, bisa dilihat di sini:`,
    demoUrl,
    "",
    "Kalau berminat atau ada bagian yang ingin diubah, silakan balas pesan ini. Terima kasih 🙏",
  ].join("\n");
}

export function buildWhatsAppLink(phone: NormalizedPhone, message: string): string {
  return `https://wa.me/${phone.e164}?text=${encodeURIComponent(message)}`;
}

export function needsFollowUp(statusPitch: string, pitchedAt: string | null, now = Date.now()): boolean {
  if (statusPitch !== "sudah_dikirim" || !pitchedAt) return false;
  return now - new Date(pitchedAt).getTime() >= FOLLOW_UP_AFTER_DAYS * 86_400_000;
}

export function formatRelativeDays(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  return `${days} hari lalu`;
}
