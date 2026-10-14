import { run } from "./db";

// Kreditni atomar yechadi: balans yetmasa false qaytaradi.
export async function spendCredits(userId: string, amount: number): Promise<boolean> {
  return (await run("UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?", [amount, userId, amount])) > 0;
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  await run("UPDATE users SET credits = MAX(0, credits + ?) WHERE id = ?", [amount, userId]);
}
