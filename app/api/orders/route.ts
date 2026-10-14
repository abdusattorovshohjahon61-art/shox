import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { appUrl, fail, readJson } from "@/lib/http";
import { getPack } from "@/lib/packs";
import { enabledProviders, type Provider } from "@/lib/payments";
import { hit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Avval tizimga kiring", 401);
  const body = await readJson(req);
  const pack = getPack(String(body?.pack || ""));
  const provider = String(body?.provider || "") as Provider;
  if (!pack) return fail("Paket topilmadi");
  if (!enabledProviders().includes(provider)) return fail("Bu to'lov usuli mavjud emas");
  if (!(await hit(`order:${user.id}`, 20, 3600_000))) return fail("Juda ko'p buyurtma. Keyinroq urining.", 429);

  await run("INSERT INTO orders (user_id, pack, amount, credits, provider, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    user.id, pack.id, pack.price, pack.credits, provider, Date.now(),
  ]);
  const order = await one<{ id: number }>("SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1", [user.id]);
  const id = Number(order!.id);
  const returnUrl = `${appUrl(req)}/billing?order=${id}`;

  let url: string;
  if (provider === "click") {
    const q = new URLSearchParams({
      service_id: process.env.CLICK_SERVICE_ID!,
      merchant_id: process.env.CLICK_MERCHANT_ID!,
      amount: String(pack.price),
      transaction_param: String(id),
      return_url: returnUrl,
    });
    url = `https://my.click.uz/services/pay?${q}`;
  } else if (provider === "payme") {
    const params = `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${id};a=${pack.price * 100};c=${returnUrl}`;
    const host = process.env.PAYME_TEST === "true" ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
    url = `${host}/${Buffer.from(params).toString("base64")}`;
  } else {
    url = `/billing/test-pay?order=${id}`;
  }
  return NextResponse.json({ url });
}
