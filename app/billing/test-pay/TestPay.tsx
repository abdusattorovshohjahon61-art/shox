"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TestPay({ order, paid }: { order: number; paid: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (paid) return <p className="accent">Bu buyurtma allaqachon to&apos;langan.</p>;
  return (
    <button
      className="btn btn-primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/payments/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) });
        router.push(`/billing?order=${order}`);
        router.refresh();
      }}
    >
      {busy ? "..." : "To'lash (sinov)"}
    </button>
  );
}
