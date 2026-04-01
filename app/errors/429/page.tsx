import ErrorShell from "../ErrorShell";

export default function Error429Page() {
  return (
    <ErrorShell
      code="429"
      tone="sky"
      badge="Rate Limited"
      title="Terlalu Banyak Request"
      description="Sistem sedang membatasi jumlah request untuk menjaga stabilitas. Tunggu sebentar lalu coba lagi."
      actions={[
        { href: "/", label: "Kembali ke Home", variant: "primary" },
        { href: "/errors", label: "Daftar Error", variant: "ghost" },
      ]}
      footer={<span>Jika ini berasal dari endpoint AI, cek quota harian dan batas request per menit.</span>}
    />
  );
}
