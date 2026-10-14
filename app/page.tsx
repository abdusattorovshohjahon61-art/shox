import Link from "next/link";
import { MODELS } from "@/lib/models";
import { MOTIONS } from "@/lib/motions";
import { formatSum, PACKS } from "@/lib/packs";

const FEATURES = [
  { icon: "✍️", title: "Matndan video", text: "G'oyangizni yozing — AI uni bir necha daqiqada kinematografik videoga aylantiradi." },
  { icon: "🖼️", title: "Rasmni jonlantirish", text: "Har qanday surat yoki mahsulot rasmini harakatlanuvchi videoga aylantiring." },
  { icon: "🎥", title: "Kamera harakatlari", text: "Dolly, Crash Zoom, FPV dron, 360 orbit — professional operator bir tugmada." },
  { icon: "🎨", title: "Tayyor uslublar", text: "Kino, anime, 3D, noir — bir bosishda butun videoning ko'rinishini o'zgartiring." },
  { icon: "⚡", title: "Eng yaxshi modellar", text: "Veo, Kling, Hailuo, Seedance — barchasi bitta studiyada, bitta hisobda." },
  { icon: "📱", title: "Ijtimoiy tarmoqlar uchun", text: "9:16 vertikal format — Reels, TikTok va Shorts uchun tayyor." },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <span className="pill">🚀 Yangi: Veo 3 ovozli videolar</span>
        <h1>
          G'oyangizni <span className="accent">kinoga</span> aylantiring
        </h1>
        <p>Shox AI — matn yoki rasmdan professional videolar yaratadigan AI studiya. Kamera operatori, montajchi va VFX jamoasi — barchasi bitta oynada.</p>
        <div className="hero-actions">
          <Link href="/create" className="btn btn-primary">Bepul boshlash →</Link>
          <Link href="#models" className="btn">Modellarni ko'rish</Link>
        </div>
      </section>

      <section className="section" id="features">
        <h2>Imkoniyatlar</h2>
        <p>Video yaratish uchun kerak bo'lgan hamma narsa.</p>
        <div className="grid">
          {FEATURES.map((f) => (
            <div className="card" key={f.title}>
              <div className="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{MOTIONS.length - 1}+ kamera harakati</h2>
        <p>Har bir videoga Gollivud darajasidagi harakat qo'shing.</p>
        <div className="motion-strip">
          {MOTIONS.filter((m) => m.id !== "none").map((m) => (
            <span className="motion-chip" key={m.id}>{m.emoji} {m.name}</span>
          ))}
        </div>
      </section>

      <section className="section" id="models">
        <h2>Modellar</h2>
        <p>Dunyodagi eng kuchli video modellari.</p>
        <div className="grid">
          {MODELS.map((m) => (
            <div className="card" key={m.id}>
              <span className="muted" style={{ fontSize: 13 }}>{m.vendor}</span>
              <h3>{m.name}{m.badge && <span className="badge">{m.badge}</span>}</h3>
              <p>{m.description}</p>
              <p style={{ marginTop: 12 }}><span className="accent">{m.credits} kredit</span> · {m.durations.join("/")} s</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="pricing">
        <h2>Narxlar</h2>
        <p>Obuna shart emas — kerakli miqdorda kredit oling. Click va Payme orqali to&apos;lov.</p>
        <div className="grid">
          <div className="card price">
            <h3>Bepul</h3>
            <div className="amount">0 <span className="muted" style={{ fontSize: 16 }}>so&apos;m</span></div>
            <div className="accent">{process.env.FREE_CREDITS ?? 50} kredit</div>
            <ul><li>Ro&apos;yxatdan o&apos;tganda</li><li>Barcha modellar</li></ul>
            <Link href="/register" className="btn">Boshlash</Link>
          </div>
          {PACKS.map((p) => (
            <div className={`card price ${p.featured ? "featured" : ""}`} key={p.id}>
              <h3>{p.name}{p.featured && <span className="badge">Foydali</span>}</h3>
              <div className="amount">{formatSum(p.price)} <span className="muted" style={{ fontSize: 16 }}>so&apos;m</span></div>
              <div className="accent">{p.credits} kredit</div>
              <ul><li>Barcha modellar va harakatlar</li><li>Kreditlar muddatsiz</li><li>Tijoriy foydalanish</li></ul>
              <Link href="/billing" className={`btn ${p.featured ? "btn-primary" : ""}`}>Sotib olish</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta">
          <h2>Birinchi videongizni hozir yarating</h2>
          <p className="muted" style={{ marginBottom: 28 }}>Ro'yxatdan o'ting va bepul kreditlar bilan sinab ko'ring.</p>
          <Link href="/create" className="btn btn-primary">Studiyani ochish →</Link>
        </div>
      </section>
    </main>
  );
}
