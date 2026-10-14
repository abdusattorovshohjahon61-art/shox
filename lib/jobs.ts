import { addCredits } from "./credits";
import { one, run } from "./db";
import { FINAL_STATUSES, getRemoteJob } from "./replicate";
import { storageEnabled, storeVideo } from "./storage";

export interface JobRow {
  id: string;
  user_id: string;
  model: string;
  prompt: string;
  status: string;
  output_url: string | null;
  storage_key: string | null;
  error: string | null;
  credits: number;
  created_at: number;
}

const ACTIVE = "('starting','processing')";

// Replicate'dagi holatni bazaga yozadi. Bir vaqtda polling va webhook kelsa ham
// natija faqat bir marta qayta ishlanadi (status bo'yicha "claim").
export async function syncJob(id: string): Promise<void> {
  const job = await one<JobRow>("SELECT * FROM jobs WHERE id = ?", [id]);
  if (!job || FINAL_STATUSES.includes(job.status) || job.status === "saving") return;

  const remote = await getRemoteJob(id);
  const now = Date.now();

  if (!FINAL_STATUSES.includes(remote.status)) {
    if (remote.status !== job.status) {
      await run(`UPDATE jobs SET status = ?, updated_at = ? WHERE id = ? AND status IN ${ACTIVE}`, [remote.status, now, id]);
    }
    return;
  }

  if (remote.status === "succeeded" && remote.output) {
    const claimed = await run(`UPDATE jobs SET status = 'saving', updated_at = ? WHERE id = ? AND status IN ${ACTIVE}`, [now, id]);
    if (!claimed) return;
    let url = remote.output;
    let key: string | null = null;
    if (storageEnabled() && !id.startsWith("demo-")) {
      try {
        key = `videos/${job.user_id}/${id}.mp4`;
        url = await storeVideo(remote.output, key);
      } catch (e) {
        console.error("storeVideo failed", id, e);
        key = null;
      }
    }
    await run("UPDATE jobs SET status = 'succeeded', output_url = ?, storage_key = ?, updated_at = ? WHERE id = ?", [url, key, Date.now(), id]);
    return;
  }

  // Muvaffaqiyatsiz: kreditni bir marta qaytaramiz
  const failed = await run(
    `UPDATE jobs SET status = ?, error = ?, refunded = 1, updated_at = ? WHERE id = ? AND status IN ${ACTIVE} AND refunded = 0`,
    [remote.status === "succeeded" ? "failed" : remote.status, remote.error || "Natija olinmadi", now, id],
  );
  if (failed) await addCredits(job.user_id, Number(job.credits));
}

// 'saving' holatida qotib qolgan ishlarni (server o'chib qolsa) qayta ochadi
export async function recoverStuck(userId: string): Promise<void> {
  await run("UPDATE jobs SET status = 'processing' WHERE user_id = ? AND status = 'saving' AND updated_at < ?", [userId, Date.now() - 5 * 60_000]);
}

export function publicJob(j: JobRow) {
  return {
    id: j.id,
    model: j.model,
    prompt: j.prompt,
    status: j.status === "saving" ? "processing" : j.status,
    output: j.output_url,
    error: j.error,
    credits: Number(j.credits),
    createdAt: Number(j.created_at),
  };
}
