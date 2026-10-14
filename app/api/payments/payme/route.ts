// Payme (Paycom) Merchant API — JSON-RPC.
// Payme kabinetida endpoint: https://SAYT/api/payments/payme, hisob maydoni (account): order_id
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { all, one, run } from "@/lib/db";
import { markPaid, markRefunded, paymeEnabled, type OrderRow } from "@/lib/payments";

const TIMEOUT = 12 * 3600_000; // Payme talabi: 12 soat

class RpcError extends Error {
  constructor(public code: number, msg: string, public data?: string) {
    super(msg);
  }
}

const msg = (uz: string, ru: string, en: string) => ({ uz, ru, en });
const ERR: Record<number, ReturnType<typeof msg>> = {
  [-32504]: msg("Ruxsat yo'q", "Недостаточно привилегий", "Insufficient privilege"),
  [-32601]: msg("Metod topilmadi", "Метод не найден", "Method not found"),
  [-32700]: msg("JSON xato", "Ошибка парсинга", "Parse error"),
  [-31001]: msg("Summa noto'g'ri", "Неверная сумма", "Incorrect amount"),
  [-31003]: msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"),
  [-31007]: msg("Bekor qilib bo'lmaydi", "Невозможно отменить", "Unable to cancel"),
  [-31008]: msg("Amalni bajarib bo'lmaydi", "Невозможно выполнить операцию", "Unable to perform operation"),
  [-31050]: msg("Buyurtma topilmadi", "Заказ не найден", "Order not found"),
  [-31051]: msg("Buyurtma band yoki to'langan", "Заказ занят или оплачен", "Order is busy or already paid"),
};

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") || "";
  const expected = Buffer.from(`Basic ${Buffer.from(`Paycom:${process.env.PAYME_KEY}`).toString("base64")}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

const txResult = (o: OrderRow) => ({
  create_time: Number(o.create_time ?? 0),
  perform_time: Number(o.perform_time ?? 0),
  cancel_time: Number(o.cancel_time ?? 0),
  transaction: String(o.id),
  state: Number(o.payme_state),
  reason: o.cancel_reason == null ? null : Number(o.cancel_reason),
});

async function orderForAccount(params: Record<string, any>): Promise<OrderRow> {
  const id = Number(params?.account?.order_id);
  const order = Number.isInteger(id) ? await one<OrderRow>("SELECT * FROM orders WHERE id = ? AND provider = 'payme'", [id]) : undefined;
  if (!order) throw new RpcError(-31050, "order", "order_id");
  if (Number(params.amount) !== Number(order.amount) * 100) throw new RpcError(-31001, "amount");
  return order;
}

async function byTx(id: unknown): Promise<OrderRow> {
  const order = await one<OrderRow>("SELECT * FROM orders WHERE provider = 'payme' AND provider_tx = ?", [String(id)]);
  if (!order) throw new RpcError(-31003, "tx");
  return order;
}

async function cancelExpired(o: OrderRow): Promise<never> {
  await run("UPDATE orders SET status = 'cancelled', payme_state = -1, cancel_time = ?, cancel_reason = 4 WHERE id = ? AND payme_state = 1", [Date.now(), o.id]);
  throw new RpcError(-31008, "timeout");
}

const methods: Record<string, (p: Record<string, any>) => Promise<unknown>> = {
  async CheckPerformTransaction(p) {
    const o = await orderForAccount(p);
    if (o.status !== "pending" || (o.provider_tx && Number(o.payme_state) === 1)) throw new RpcError(-31051, "busy", "order_id");
    return { allow: true };
  },

  async CreateTransaction(p) {
    const existing = await one<OrderRow>("SELECT * FROM orders WHERE provider = 'payme' AND provider_tx = ?", [String(p.id)]);
    if (existing) {
      if (Number(existing.payme_state) !== 1) throw new RpcError(-31008, "state");
      if (Date.now() - Number(existing.create_time) > TIMEOUT) await cancelExpired(existing);
      return { create_time: Number(existing.create_time), transaction: String(existing.id), state: 1 };
    }
    const o = await orderForAccount(p);
    if (o.status !== "pending" || o.provider_tx) throw new RpcError(-31051, "busy", "order_id");
    const now = Date.now();
    const ok = await run(
      "UPDATE orders SET provider_tx = ?, payme_state = 1, payme_time = ?, create_time = ? WHERE id = ? AND provider_tx IS NULL AND status = 'pending'",
      [String(p.id), Number(p.time), now, o.id],
    );
    if (!ok) throw new RpcError(-31051, "busy", "order_id");
    return { create_time: now, transaction: String(o.id), state: 1 };
  },

  async PerformTransaction(p) {
    const o = await byTx(p.id);
    const state = Number(o.payme_state);
    if (state === 2) return { transaction: String(o.id), perform_time: Number(o.perform_time), state: 2 };
    if (state !== 1) throw new RpcError(-31008, "state");
    if (Date.now() - Number(o.create_time) > TIMEOUT) await cancelExpired(o);
    const now = Date.now();
    await markPaid(Number(o.id), { perform_time: now, payme_state: 2 });
    const fresh = await byTx(p.id);
    return { transaction: String(fresh.id), perform_time: Number(fresh.perform_time), state: Number(fresh.payme_state) };
  },

  async CancelTransaction(p) {
    const o = await byTx(p.id);
    const state = Number(o.payme_state);
    const now = Date.now();
    const reason = Number(p.reason);
    if (state === 1) {
      await run("UPDATE orders SET status = 'cancelled', payme_state = -1, cancel_time = ?, cancel_reason = ? WHERE id = ? AND payme_state = 1", [now, reason, o.id]);
    } else if (state === 2) {
      await markRefunded(Number(o.id), { cancel_time: now, payme_state: -2, cancel_reason: reason });
    }
    const fresh = await byTx(p.id);
    return { transaction: String(fresh.id), cancel_time: Number(fresh.cancel_time), state: Number(fresh.payme_state) };
  },

  async CheckTransaction(p) {
    return txResult(await byTx(p.id));
  },

  async GetStatement(p) {
    const rows = await all<OrderRow>(
      "SELECT * FROM orders WHERE provider = 'payme' AND provider_tx IS NOT NULL AND payme_time BETWEEN ? AND ? ORDER BY payme_time",
      [Number(p.from), Number(p.to)],
    );
    return {
      transactions: rows.map((o) => ({
        id: o.provider_tx,
        time: Number(o.payme_time),
        amount: Number(o.amount) * 100,
        account: { order_id: String(o.id) },
        ...txResult(o),
      })),
    };
  },
};

export async function POST(req: Request) {
  let id: unknown = null;
  const error = (code: number, data?: string) =>
    NextResponse.json({ jsonrpc: "2.0", id, error: { code, message: ERR[code] ?? msg("Xato", "Ошибка", "Error"), ...(data ? { data } : {}) } });

  if (!paymeEnabled()) return error(-32504);
  let body: { id?: unknown; method?: string; params?: Record<string, any> };
  try {
    body = await req.json();
    id = body.id ?? null;
  } catch {
    return error(-32700);
  }
  if (!authorized(req)) return error(-32504);

  const fn = body.method ? methods[body.method] : undefined;
  if (!fn) return error(-32601);
  try {
    const result = await fn(body.params || {});
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (e) {
    if (e instanceof RpcError) return error(e.code, e.data);
    console.error("payme error", e);
    return error(-31008);
  }
}
