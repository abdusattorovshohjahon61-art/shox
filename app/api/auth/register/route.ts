import { NextResponse } from "next/server";
import { createUser, startSession } from "@/lib/auth";
import { one } from "@/lib/db";
import { fail, readJson } from "@/lib/http";
import { clientIp, hit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = String(body?.email || "").trim().toLowerCase();
  const name = String(body?.name || "").trim();
  const password = String(body?.password || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return fail("Email noto'g'ri");
  if (name.length < 2 || name.length > 60) return fail("Ism 2–60 belgi bo'lishi kerak");
  if (password.length < 8 || password.length > 200) return fail("Parol kamida 8 belgi bo'lishi kerak");
  if (!(await hit(`register:${clientIp(req)}`, 5, 3600_000))) return fail("Juda ko'p urinish. Keyinroq qayta urining.", 429);
  if (await one("SELECT 1 FROM users WHERE email = ?", [email])) return fail("Bu email bilan hisob mavjud");

  const id = await createUser(email, name, password);
  await startSession(id);
  return NextResponse.json({ ok: true });
}
