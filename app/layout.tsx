import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shox AI — AI video generator",
  description: "Matn yoki rasmdan kinematografik AI videolar yarating. Kamera harakatlari, uslublar va eng kuchli modellar bir joyda.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <header className="nav">
          <Link href="/" className="logo">
            <span className="logo-mark">S</span> Shox<span className="accent">AI</span>
          </Link>
          <nav>
            <Link href="/#features">Imkoniyatlar</Link>
            <Link href="/#models">Modellar</Link>
            <Link href="/#pricing">Narxlar</Link>
            <Link href="/create" className="btn btn-primary btn-sm">Yaratish</Link>
          </nav>
        </header>
        {children}
        <footer className="footer">© {new Date().getFullYear()} Shox AI. Barcha huquqlar himoyalangan.</footer>
      </body>
    </html>
  );
}
