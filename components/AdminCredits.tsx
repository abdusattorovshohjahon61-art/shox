"use client";

import { useState } from "react";

export default function AdminCredits({ userId, initial }: { userId: string; initial: number }) {
  const [credits, setCredits] = useState(initial);
  const [amount, setAmount] = useState("");
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <b style={{ minWidth: 50 }}>{credits}</b>
      <input className="input" style={{ width: 80, padding: "4px 8px" }} placeholder="±" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button
        className="btn"
        style={{ padding: "4px 10px" }}
        onClick={async () => {
          const res = await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, amount: Number(amount) }) });
          const d = await res.json();
          if (res.ok) {
            setCredits(d.credits);
            setAmount("");
          } else alert(d.error);
        }}
      >
        OK
      </button>
    </span>
  );
}
