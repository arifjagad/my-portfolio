import ErrorShell from "../ErrorShell";

export default function Error403Page() {
  return (
    <ErrorShell
      code="403"
      tone="amber"
      badge="Forbidden"
      title="Akses Ditolak"
      description="Kamu tidak punya izin untuk mengakses halaman ini. Login dengan akun yang tepat atau kembali ke area publik."
      actions={[
        { href: "/", label: "Kembali ke Home", variant: "primary" },
        { href: "/admin/login", label: "Login Admin", variant: "ghost" },
      ]}
      footer={<span>Kode 403 biasanya muncul saat autentikasi belum valid atau role tidak sesuai.</span>}
    />
  );
}
