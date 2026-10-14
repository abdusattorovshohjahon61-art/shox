// Sinov to'lovi — faqat ishlab chiqish muhitida. Haqiqiy pul yechilmaydi.
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { fail, readJson } from "@/lib/http";
import { markPaid, testPaymentsEnabled } from "@/lib/payments";

export async function POST(req: Request) {
  if (!testPaymentsEnabled()) return fail("Mavjud emas", 404);
  const user = await currentUser();
  if (!user) return fail("Avval tizimga kiring", 401);
  const body = await readJson(req);
  const id = Number(body?.order);
  const order = await one("SELECT id FROM orders WHERE id = ? AND user_id = ? AND provider = 'test'", [id, user.id]);
  if (!order) return fail("Buyurtma topilmadi", 404);
  await markPaid(id);
  return NextResponse.json({ ok: true });
}
