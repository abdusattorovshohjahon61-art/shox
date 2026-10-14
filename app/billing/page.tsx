import { redirect } from "next/navigation";
import PayButtons from "@/components/PayButtons";
import { currentUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { formatSum, getPack, PACKS } from "@/lib/packs";
import { enabledProviders, type OrderRow } from "@/lib/payments";

export const metadata = { title: "Balans — Shox AI" };

const STATUS: Record<string, string> = { pending: "Kutilmoqda", paid: "To'langan", cancelled: "Bekor qilingan", refunded: "Qaytarilgan" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/billing");
  const { order } = await searchParams;
  const orders = await all<OrderRow>("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 50", [user.id]);
  const justPaid = order ? await one<OrderRow>("SELECT * FROM orders WHERE id = ? AND user_id = ?", [Number(order), user.id]) : undefined;
  const providers = enabledProviders();

  return (
    <main className="page">
      <h1>Balans</h1>
      <div className="balance">⚡ {user.credits} <span className="muted" style={{ fontSize: 18 }}>kredit</span></div>

      {justPaid && (
        <p className="notice" style={{ marginTop: 16 }}>
          {justPaid.status === "paid"
            ? `To'lov qabul qilindi: +${justPaid.credits} kredit. Rahmat!`
            : justPaid.status === "pending"
              ? "To'lov tekshirilmoqda. Bir necha soniyadan keyin sahifani yangilang."
              : "To'lov amalga oshmadi yoki bekor qilindi."}
        </p>
      )}

      <section className="section" style={{ padding: "40px 0" }}>
        <h2>Kredit sotib olish</h2>
        <p>Bir martalik to&apos;lov. Kreditlar muddatsiz amal qiladi.</p>
        <div className="grid">
          {PACKS.map((p) => (
            <div className={`card price ${p.featured ? "featured" : ""}`} key={p.id}>
              <h3>{p.name}{p.featured && <span className="badge">Foydali</span>}</h3>
              <div className="amount">{formatSum(p.price)} <span className="muted" style={{ fontSize: 16 }}>so&apos;m</span></div>
              <div className="accent">{p.credits} kredit</div>
              <PayButtons pack={p.id} providers={providers} featured={p.featured} />
            </div>
          ))}
        </div>
      </section>

      <h2>To&apos;lovlar tarixi</h2>
      {orders.length === 0 ? (
        <p className="muted">Hali to&apos;lovlar yo&apos;q.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Sana</th><th>Paket</th><th>Summa</th><th>Usul</th><th>Holat</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{new Date(Number(o.created_at)).toLocaleString("ru-RU")}</td>
                  <td>{getPack(o.pack)?.name ?? o.pack} · {o.credits} kr</td>
                  <td>{formatSum(Number(o.amount))} so&apos;m</td>
                  <td>{o.provider}</td>
                  <td><span className={`status ${o.status}`}>{STATUS[o.status] ?? o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
