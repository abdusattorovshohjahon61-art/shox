// Oddiy xotiradagi rate limit (bitta server uchun). Ishlab chiqarishda
// Redis/Upstash kabi umumiy omborga almashtiring.

const hits = new Map<string, number[]>();

export function allow(key: string): boolean {
  const limit = Number(process.env.RATE_LIMIT_PER_HOUR || 10);
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
