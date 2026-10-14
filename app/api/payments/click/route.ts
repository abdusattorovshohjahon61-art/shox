// Click SHOP API: Prepare (action=0) va Complete (action=1).
// Click kabinetida ikkala URL uchun ham shu manzilni kiriting: https://SAYT/api/payments/click
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { one, run } from "@/lib/db";
import { clickEnabled, markPaid, type OrderRow } from "@/lib/payments";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

export async function POST(req: Request) {
  if (!clickEnabled()) return NextResponse.json({ error: -8, error_note: "Click sozlanmagan" });

  const form = new URLSearchParams(await req.text());
  const p = Object.fromEntries(form.entries());
  const action = p.action;
  const base = { click_trans_id: p.click_trans_id, merchant_trans_id: p.merchant_trans_id };
  const reply = (error: number, error_note: string, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ ...base, ...extra, error, error_note });

  if (!p.click_trans_id || !p.service_id || !p.merchant_trans_id || !p.amount || !p.sign_time || !p.sign_string || (action !== "0" && action !== "1")) {
    return reply(-8, "Error in request from click");
  }

  const sign = md5(
    p.click_trans_id + p.service_id + process.env.CLICK_SECRET_KEY + p.merchant_trans_id +
      (action === "1" ? p.merchant_prepare_id || "" : "") + p.amount + action + p.sign_time,
  );
  if (sign !== p.sign_string || p.service_id !== process.env.CLICK_SERVICE_ID) return reply(-1, "SIGN CHECK FAILED!");

  const orderId = Number(p.merchant_trans_id);
  const order = Number.isInteger(orderId) ? await one<OrderRow>("SELECT * FROM orders WHERE id = ? AND provider = 'click'", [orderId]) : undefined;
  if (!order) return reply(-5, "User does not exist");
  if (Math.abs(parseFloat(p.amount) - Number(order.amount)) > 0.01) return reply(-2, "Incorrect parameter amount");
  if (order.status === "paid") return reply(-4, "Already paid");
  if (order.status !== "pending") return reply(-9, "Transaction cancelled");

  if (action === "0") {
    await run("UPDATE orders SET provider_tx = ?, create_time = ? WHERE id = ? AND status = 'pending'", [p.click_trans_id, Date.now(), orderId]);
    return reply(0, "Success", { merchant_prepare_id: orderId });
  }

  // Complete
  if (String(order.provider_tx) !== p.click_trans_id || Number(p.merchant_prepare_id) !== orderId) return reply(-6, "Transaction does not exist");
  if (Number(p.error) < 0) {
    await run("UPDATE orders SET status = 'cancelled', cancel_time = ? WHERE id = ? AND status = 'pending'", [Date.now(), orderId]);
    return reply(-9, "Transaction cancelled");
  }
  await markPaid(orderId);
  return reply(0, "Success", { merchant_confirm_id: orderId });
}
