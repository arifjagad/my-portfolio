import ErrorShell from "../ErrorShell";

export default function Error500Page() {
  return (
    <ErrorShell
      code="500"
      tone="red"
      badge="Server Error"
      title="Internal Server Error"
      description="Server mengalami gangguan saat memproses halaman ini. Coba refresh beberapa saat lagi."
      actions={[
        { href: "/", label: "Kembali ke Home", variant: "primary" },
        { href: "/errors", label: "Daftar Error", variant: "ghost" },
      ]}
      footer={<span>Jika error berulang, cek log deployment, env variables, dan status database/API.</span>}
    />
  );
}
