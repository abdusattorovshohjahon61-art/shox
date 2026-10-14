"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/create";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik");
      router.push(target);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const isLogin = mode === "login";
  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>{isLogin ? "Tizimga kirish" : "Ro'yxatdan o'tish"}</h1>
        {!isLogin && <p className="muted">Ro'yxatdan o'ting va bepul kreditlar oling.</p>}
        {!isLogin && (
          <div className="field">
            <label htmlFor="name">Ism</label>
            <input id="name" name="name" className="input" required minLength={2} maxLength={60} autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Parol</label>
          <input id="password" name="password" type="password" className="input" required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? "current-password" : "new-password"} />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Kuting..." : isLogin ? "Kirish" : "Ro'yxatdan o'tish"}
        </button>
        <p className="muted" style={{ textAlign: "center", margin: 0 }}>
          {isLogin ? (
            <>Hisobingiz yo'qmi? <Link className="accent" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Ro'yxatdan o'ting</Link></>
          ) : (
            <>Hisobingiz bormi? <Link className="accent" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Kirish</Link></>
          )}
        </p>
      </form>
    </main>
  );
}
