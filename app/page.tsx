import Link from "next/link";
import { MODELS } from "@/lib/models";
import { MOTIONS } from "@/lib/motions";

const FEATURES = [
  { icon: "✍️", title: "Matndan video", text: "G'oyangizni yozing — AI uni bir necha daqiqada kinematografik videoga aylantiradi." },
  { icon: "🖼️", title: "Rasmni jonlantirish", text: "Har qanday surat yoki mahsulot rasmini harakatlanuvchi videoga aylantiring." },
  { icon: "🎥", title: "Kamera harakatlari", text: "Dolly, Crash Zoom, FPV dron, 360 orbit — professional operator bir tugmada." },
  { icon: "🎨", title: "Tayyor uslublar", text: "Kino, anime, 3D, noir — bir bosishda butun videoning ko'rinishini o'zgartiring." },
  { icon: "⚡", title: "Eng yaxshi modellar", text: "Veo, Kling, Hailuo, Seedance — barchasi bitta studiyada, bitta hisobda." },
  { icon: "📱", title: "Ijtimoiy tarmoqlar uchun", text: "9:16 vertikal format — Reels, TikTok va Shorts uchun tayyor." },
];

const PLANS = [
  { name: "Bepul", price: "0", credits: "50 kredit", items: ["Seedance modeli", "720p sifat", "Suv belgisi bilan"] },
  { name: "Pro", price: "99 000", credits: "1 000 kredit / oy", items: ["Barcha modellar", "Barcha kamera harakatlari", "Suv belgisiz", "Navbatsiz generatsiya"], featured: true },
  { name: "Studio", price: "299 000", credits: "4 000 kredit / oy", items: ["Pro'dagi hammasi", "Tijoriy litsenziya", "API kirish", "Ustuvor yordam"] },
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
        <p>So'mda, oylik to'lov. Istalgan vaqtda bekor qilish mumkin.</p>
        <div className="grid">
          {PLANS.map((p) => (
            <div className={`card price ${p.featured ? "featured" : ""}`} key={p.name}>
              <h3>{p.name}{p.featured && <span className="badge">Tavsiya</span>}</h3>
              <div className="amount">{p.price} <span className="muted" style={{ fontSize: 16 }}>so'm</span></div>
              <div className="accent">{p.credits}</div>
              <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <Link href="/create" className={`btn ${p.featured ? "btn-primary" : ""}`}>Tanlash</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta">
          <h2>Birinchi videongizni hozir yarating</h2>
          <p className="muted" style={{ marginBottom: 28 }}>Ro'yxatdan o'tish shart emas.</p>
          <Link href="/create" className="btn btn-primary">Studiyani ochish →</Link>
        </div>
      </section>
    </main>
  );
}
