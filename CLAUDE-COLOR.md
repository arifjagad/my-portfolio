# claude-color.md — Color System: Portfolio arifjagad

> Baca file ini setiap kali bekerja dengan styling. Semua keputusan warna harus mengikuti panduan ini.

---

## Filosofi

Palet ini menggunakan **dark navy + forest green** dengan rasio ketat **60-30-10**.
Hijau hanya boleh muncul di elemen paling penting — accent, CTA, dan status aktif.
Sisanya didominasi navy gelap agar terasa profesional, bukan norak.

---

## Palet Warna

| Token                  | Hex       | Peran                                 |
| ---------------------- | --------- | ------------------------------------- |
| `color-bg`             | `#0D1B2A` | Background utama (paling gelap)       |
| `color-surface`        | `#1B2838` | Card, navbar, surface elemen          |
| `color-border`         | `#1e3a4a` | Border default (sangat subtle)        |
| `color-mid`            | `#2D6A4F` | Border emphasis, divider, hover state |
| `color-accent`         | `#40916C` | Tag, label, secondary accent          |
| `color-highlight`      | `#95D5B2` | CTA utama, dot aktif, teks penting    |
| `color-text-primary`   | `#e2e8f0` | Teks judul, nama, heading             |
| `color-text-secondary` | `#64748b` | Teks body, deskripsi, label           |

---

## Rasio Penggunaan (60-30-10)

```
██████████████████████████████████████████████  60% — #0D1B2A (background)
█████████████████████████████                   30% — #1B2838 (surface)
███████                                         10% — #95D5B2 (accent)
```

- **60%** → `#0D1B2A` — background halaman, section gelap
- **30%** → `#1B2838` — card, navbar, sidebar, input
- **10%** → `#95D5B2` — tombol CTA, dot aktif, tag penting, underline hover

Warna `#2D6A4F` dan `#40916C` **bukan accent utama** — hanya dipakai untuk border tipis dan label kecil. Tidak boleh mendominasi layar.

---

## Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0D1B2A", // bg utama
          900: "#1B2838", // surface
          800: "#1e3a4a", // border default
        },
        forest: {
          700: "#2D6A4F", // border emphasis / mid
          500: "#40916C", // accent secondary
          200: "#95D5B2", // accent utama / highlight
        },
        slate: {
          200: "#e2e8f0", // text primary
          500: "#64748b", // text secondary
        },
      },
    },
  },
};
```

---

## CSS Variables (untuk komponen non-Tailwind)

```css
/* globals.css */
:root {
  --color-bg: #0d1b2a;
  --color-surface: #1b2838;
  --color-border: #1e3a4a;
  --color-mid: #2d6a4f;
  --color-accent-soft: #40916c;
  --color-accent: #95d5b2;
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #64748b;
}
```

---

## Aturan Per Elemen

### Background & Layout

```
Halaman utama         → bg-navy-950  (#0D1B2A)
Section alternate     → bg-navy-950  (sama, pakai border pemisah)
Card / panel          → bg-navy-900  (#1B2838)
Navbar                → bg-navy-950 + border-b border-navy-900
```

### Teks

```
Heading / nama        → text-slate-200  (#e2e8f0)
Body / deskripsi      → text-slate-500  (#64748b)
Tag / label kecil     → text-forest-500 (#40916C)
Teks accent penting   → text-forest-200 (#95D5B2)
```

### Border

```
Default (card, input) → border-navy-800  (#1e3a4a)   — sangat subtle
Emphasis / hover      → border-forest-700 (#2D6A4F)
Divider antar section → border-navy-900  (#1B2838)
```

### Tombol

```
CTA utama   → bg-forest-200 text-navy-950  (#95D5B2 / #0D1B2A)
Ghost       → bg-transparent border-navy-800 text-slate-500
Hover ghost → bg-navy-900
```

### Badge / Tech tag

```
background  → bg-navy-950  (#0D1B2A)
teks        → text-slate-500 (#64748b)
font        → font-mono
```

### Status dot (experience aktif vs tidak)

```
Aktif   → bg-forest-200  (#95D5B2)
Nonaktif → bg-navy-900 border border-slate-500
```

---

## Aturan yang TIDAK BOLEH Dilanggar

1. **Jangan pakai `#40916C` atau `#2D6A4F` sebagai warna teks utama** — terlalu gelap, kontras rendah di atas navy.
2. **Jangan pakai `#95D5B2` lebih dari 10% layar** — kalau terlalu banyak, efek "norak" kembali.
3. **Jangan pakai warna hijau untuk background section** — background hanya boleh `#0D1B2A` atau `#1B2838`.
4. **Teks body selalu `#64748b`** — jangan pakai putih pure (`#ffffff`) atau abu terang lain.
5. **Tombol CTA hanya satu per halaman/section** — jangan dua tombol hijau berdampingan.
6. **Border tipis, bukan tebal** — selalu `1px`, tidak ada `2px` kecuali untuk focus ring input.

---

## Contoh Kombinasi yang Benar

```
✅ Card:   bg #1B2838 + border #1e3a4a + title #e2e8f0 + desc #64748b + badge bg #0D1B2A
✅ Hero:   bg #0D1B2A + tag #95D5B2 (kecil) + nama #e2e8f0 + sub #64748b + CTA #95D5B2
✅ Navbar: bg #0D1B2A + border-b #1B2838 + logo #e2e8f0 + links #64748b
✅ Stats:  bg #0D1B2A + angka #e2e8f0 + label #64748b + border kanan #1B2838

❌ Section background hijau
❌ Teks body warna #95D5B2
❌ Dua tombol hijau berdampingan
❌ Border #2D6A4F di semua card (terlalu dominan)
```

---

_Update file ini jika ada perubahan keputusan desain._
