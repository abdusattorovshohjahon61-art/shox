import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { one, run } from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "shox_session";
const SESSION_DAYS = 30;

export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  created_at: number;
}

export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user) return false;
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(user.email.toLowerCase());
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createUser(email: string, name: string, password: string): Promise<string> {
  const id = randomUUID();
  const credits = Number(process.env.FREE_CREDITS ?? 50);
  await run("INSERT INTO users (id, email, name, password_hash, credits, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    id, email, name, await hashPassword(password), credits, Date.now(),
  ]);
  return id;
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);
  await run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", [sha256(token), userId, expires]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE id = ?", [sha256(token)]);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const user = await one<User>(
    `SELECT u.id, u.email, u.name, u.credits, u.created_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`,
    [sha256(token), Date.now()],
  );
  return user ? { ...user, credits: Number(user.credits) } : null;
}
