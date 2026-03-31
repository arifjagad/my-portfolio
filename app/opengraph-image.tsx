import { ImageResponse } from 'next/og'
import { supabaseServer } from '@/lib/supabase'

// Digunakan khusus untuk environment edge oleh Next.js OG
export const runtime = 'edge'

export const alt = 'Developer Portfolio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Ambil data profil dari tabel profiles secara dinamis
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('id', 1)
    .single()

  const name = profile?.name || "Arif Jagad"
  const role = profile?.role || "Fullstack Developer"
  const location = profile?.location || "Medan"
  const photoUrl = profile?.photo_url || null

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(to bottom right, #0B1120, #0F172A)", // navy-950 tone
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Latar Belakang Kotak Jaring (Grid) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.1) 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            opacity: 0.5,
          }}
        />

        {/* Lingkaran Glowing Tanda Aktif */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 800,
            height: 800,
            borderRadius: 400,
            background: "radial-gradient(circle, rgba(149,213,178,0.2) 0%, transparent 60%)",
          }}
        />

        {/* Konten Utama */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(149,213,178,0.3)",
            backgroundColor: "rgba(15,23,42,0.6)",
            borderRadius: "32px",
            padding: "60px 100px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          {photoUrl && (
            <img
              src={photoUrl}
              alt={name}
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                objectFit: "cover",
                marginBottom: 30,
                border: "4px solid #95D5B2", // forest-200
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#95D5B2", // forest-200
              fontSize: 24,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 20,
              fontWeight: "bold"
            }}
          >
            — PORTFOLIO —
          </div>

          <h1
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: "white",
              margin: 0,
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {name}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 24,
              gap: 16,
            }}
          >
            <span style={{ fontSize: 32, color: "#94A3B8" }}>{role}</span>
            <span style={{ fontSize: 32, color: "#475569" }}>•</span>
            <span style={{ fontSize: 32, color: "#94A3B8" }}>{location}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
