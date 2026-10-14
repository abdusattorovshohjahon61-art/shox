import { notFound, redirect } from "next/navigation";
import TestPay from "./TestPay";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { formatSum } from "@/lib/packs";
import { testPaymentsEnabled, type OrderRow } from "@/lib/payments";

export default async function TestPayPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  if (!testPaymentsEnabled()) notFound();
  const user = await currentUser();
  if (!user) redirect("/login?next=/billing");
  const { order } = await searchParams;
  const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ? AND user_id = ? AND provider = 'test'", [Number(order), user.id]);
  if (!o) notFound();
  return (
    <main className="auth">
      <div className="card auth-card">
        <h1>Sinov to&apos;lovi</h1>
        <p className="notice">Bu faqat sinov uchun. Haqiqiy pul yechilmaydi. Ishlab chiqarishda o&apos;chirilgan.</p>
        <p>Buyurtma #{o.id}: <b>{formatSum(Number(o.amount))} so&apos;m</b> → <span className="accent">{o.credits} kredit</span></p>
        <TestPay order={Number(o.id)} paid={o.status === "paid"} />
      </div>
    </main>
  );
}
