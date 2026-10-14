"use client";

import { useState } from "react";

const LABELS: Record<string, string> = { click: "Click", payme: "Payme", test: "Sinov to'lovi" };

export default function PayButtons({ pack, providers, featured }: { pack: string; providers: string[]; featured?: boolean }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function pay(provider: string) {
    setBusy(provider);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  if (!providers.length) return <p className="muted">To&apos;lov tizimi hali ulanmagan.</p>;
  return (
    <>
      <div className="pay-buttons">
        {providers.map((p, i) => (
          <button key={p} className={`btn ${featured && i === 0 ? "btn-primary" : ""}`} disabled={Boolean(busy)} onClick={() => pay(p)}>
            {busy === p ? "..." : LABELS[p] ?? p}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </>
  );
}
