import { NextResponse } from "next/server";
import { startSession, verifyPassword } from "@/lib/auth";
import { one } from "@/lib/db";
import { fail, readJson } from "@/lib/http";
import { clientIp, hit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) return fail("Email va parolni kiriting");

  if (!(await hit(`login:${clientIp(req)}:${email}`, 10, 15 * 60_000))) {
    return fail("Juda ko'p urinish. 15 daqiqadan keyin qayta urining.", 429);
  }

  const user = await one<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = ?", [email]);
  if (!user || !(await verifyPassword(password, user.password_hash))) return fail("Email yoki parol noto'g'ri", 401);

  await startSession(user.id);
  return NextResponse.json({ ok: true });
}
