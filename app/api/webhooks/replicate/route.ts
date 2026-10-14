// Replicate tayyor bo'lganda shu yerga xabar yuboradi — foydalanuvchi sahifani yopsa ham
// video saqlanadi va kerak bo'lsa kredit qaytariladi.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { syncJob } from "@/lib/jobs";

export const maxDuration = 60;

function verify(req: Request, body: string): boolean {
  const secret = process.env.REPLICATE_WEBHOOK_SECRET;
  if (!secret) return true; // imzo tekshirilmaydi, lekin holat baribir Replicate API'dan qayta olinadi
  const id = req.headers.get("webhook-id");
  const ts = req.headers.get("webhook-timestamp");
  const sigs = req.headers.get("webhook-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const sig = Buffer.from(s.split(",")[1] || "", "base64");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!verify(req, body)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  let id: unknown;
  try {
    id = JSON.parse(body).id;
  } catch {}
  if (typeof id !== "string" || !/^[a-z0-9]+$/i.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  // Tanadagi ma'lumotga ishonmaymiz: holatni Replicate API'dan o'zimiz olamiz
  await syncJob(id);
  return NextResponse.json({ ok: true });
}
