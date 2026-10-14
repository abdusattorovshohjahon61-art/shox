import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { currentUser, isAdmin } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shox AI — AI video generator",
  description: "Matn yoki rasmdan kinematografik AI videolar yarating. Kamera harakatlari, uslublar va eng kuchli modellar bir joyda.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="uz">
      <body>
        <header className="nav">
          <Link href="/" className="logo">
            <span className="logo-mark">S</span> Shox<span className="accent">AI</span>
          </Link>
          <nav>
            <Link href="/#features">Imkoniyatlar</Link>
            <Link href="/#pricing">Narxlar</Link>
            {user ? (
              <>
                {isAdmin(user) && <Link href="/admin">Admin</Link>}
                <Link href="/billing" className="credits" title="Balans">⚡ {user.credits}</Link>
                <LogoutButton />
                <Link href="/create" className="btn btn-primary btn-sm">Yaratish</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="keep">Kirish</Link>
                <Link href="/register" className="btn btn-primary btn-sm">Boshlash</Link>
              </>
            )}
          </nav>
        </header>
        {children}
        <footer className="footer">
          © {new Date().getFullYear()} Shox AI · <Link href="/oferta">Ommaviy oferta</Link>
        </footer>
      </body>
    </html>
  );
}
