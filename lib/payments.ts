import { tx } from "./db";

export type Provider = "click" | "payme" | "test";

export interface OrderRow {
  id: number;
  user_id: string;
  pack: string;
  amount: number;
  credits: number;
  provider: Provider;
  status: "pending" | "paid" | "cancelled" | "refunded";
  provider_tx: string | null;
  payme_state: number | null;
  payme_time: number | null;
  create_time: number | null;
  perform_time: number | null;
  cancel_time: number | null;
  cancel_reason: number | null;
  created_at: number;
}

export const clickEnabled = () => Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY);
export const paymeEnabled = () => Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);
// Test to'lovi faqat ishlab chiqarishdan tashqarida yoki aniq yoqilganda
export const testPaymentsEnabled = () => process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_PAYMENTS === "true";

export function enabledProviders(): Provider[] {
  const list: Provider[] = [];
  if (clickEnabled()) list.push("click");
  if (paymeEnabled()) list.push("payme");
  if (testPaymentsEnabled()) list.push("test");
  return list;
}

// Buyurtmani to'langan deb belgilaydi va kreditni qo'shadi — faqat bir marta.
export async function markPaid(orderId: number, extra: { perform_time?: number; payme_state?: number } = {}): Promise<boolean> {
  return tx(async (exec) => {
    const r = await exec(
      "UPDATE orders SET status = 'paid', perform_time = ?, payme_state = COALESCE(?, payme_state) WHERE id = ? AND status = 'pending'",
      [extra.perform_time ?? Date.now(), extra.payme_state ?? null, orderId],
    );
    if (!r.rowsAffected) return false;
    await exec("UPDATE users SET credits = credits + (SELECT credits FROM orders WHERE id = ?) WHERE id = (SELECT user_id FROM orders WHERE id = ?)", [orderId, orderId]);
    return true;
  });
}

// To'langan buyurtma qaytarilsa (refund) kreditni yechib oladi.
export async function markRefunded(orderId: number, fields: { cancel_time: number; payme_state?: number; cancel_reason?: number }): Promise<void> {
  await tx(async (exec) => {
    const r = await exec(
      "UPDATE orders SET status = 'refunded', cancel_time = ?, payme_state = COALESCE(?, payme_state), cancel_reason = COALESCE(?, cancel_reason) WHERE id = ? AND status = 'paid'",
      [fields.cancel_time, fields.payme_state ?? null, fields.cancel_reason ?? null, orderId],
    );
    if (!r.rowsAffected) return;
    await exec("UPDATE users SET credits = MAX(0, credits - (SELECT credits FROM orders WHERE id = ?)) WHERE id = (SELECT user_id FROM orders WHERE id = ?)", [orderId, orderId]);
  });
}
