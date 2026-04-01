import ErrorShell from "../ErrorShell";

export default function Error404Page() {
  return (
    <ErrorShell
      code="404"
      tone="slate"
      badge="Not Found"
      title="Halaman Tidak Ditemukan"
      description="URL yang kamu buka tidak tersedia. Mungkin sudah dipindahkan, typo, atau belum dipublish."
      actions={[
        { href: "/", label: "Kembali ke Home", variant: "primary" },
        { href: "/projects", label: "Lihat Projects", variant: "ghost" },
      ]}
      footer={<span>Cek kembali penulisan URL atau gunakan navigasi utama website.</span>}
    />
  );
}
