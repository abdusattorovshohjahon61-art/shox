import { NextResponse } from "next/server";
import { currentUser, isAdmin } from "@/lib/auth";
import { addCredits } from "@/lib/credits";
import { one } from "@/lib/db";
import { fail, readJson } from "@/lib/http";

export async function POST(req: Request) {
  const admin = await currentUser();
  if (!isAdmin(admin)) return fail("Ruxsat yo'q", 403);
  const body = await readJson(req);
  const userId = String(body?.userId || "");
  const amount = Math.trunc(Number(body?.amount));
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return fail("Miqdor noto'g'ri");
  if (!(await one("SELECT 1 FROM users WHERE id = ?", [userId]))) return fail("Foydalanuvchi topilmadi", 404);
  await addCredits(userId, amount);
  console.info(`admin ${admin!.email} credits ${amount} -> ${userId}`);
  const u = await one<{ credits: number }>("SELECT credits FROM users WHERE id = ?", [userId]);
  return NextResponse.json({ credits: Number(u?.credits ?? 0) });
}
