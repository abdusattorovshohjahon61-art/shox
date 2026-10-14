// Bazada saqlanadigan rate limit — bir nechta server/instance bo'lsa ham to'g'ri ishlaydi.
import { one, run } from "./db";

export async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  await run("DELETE FROM rate_hits WHERE key = ? AND ts < ?", [key, now - windowMs]);
  if (Math.random() < 0.01) await run("DELETE FROM rate_hits WHERE ts < ?", [now - 86400_000]);
  const row = await one<{ n: number }>("SELECT COUNT(*) AS n FROM rate_hits WHERE key = ?", [key]);
  if (Number(row?.n ?? 0) >= limit) return false;
  await run("INSERT INTO rate_hits (key, ts) VALUES (?, ?)", [key, now]);
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
