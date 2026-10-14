// Tayyor videolarni S3-mos omborga (Cloudflare R2, AWS S3, MinIO) ko'chiradi.
// Replicate havolalari ~1 soatdan keyin o'chadi, shuning uchun bu ishlab chiqarishda zarur.
import { AwsClient } from "aws4fetch";

const cfg = () => ({
  endpoint: process.env.S3_ENDPOINT?.replace(/\/$/, ""),
  bucket: process.env.S3_BUCKET,
  publicUrl: process.env.S3_PUBLIC_URL?.replace(/\/$/, ""),
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

export function storageEnabled(): boolean {
  const c = cfg();
  return Boolean(c.endpoint && c.bucket && c.publicUrl && c.accessKeyId && c.secretAccessKey);
}

function client() {
  const c = cfg();
  return new AwsClient({ accessKeyId: c.accessKeyId!, secretAccessKey: c.secretAccessKey!, service: "s3", region: process.env.S3_REGION || "auto" });
}

export async function storeVideo(sourceUrl: string, key: string): Promise<string> {
  const c = cfg();
  const src = await fetch(sourceUrl);
  if (!src.ok) throw new Error(`Videoni yuklab bo'lmadi (${src.status})`);
  const body = await src.arrayBuffer();
  const res = await client().fetch(`${c.endpoint}/${c.bucket}/${key}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": src.headers.get("content-type") || "video/mp4" },
  });
  if (!res.ok) throw new Error(`Omborga yozib bo'lmadi (${res.status})`);
  return `${c.publicUrl}/${key}`;
}

export async function deleteVideo(key: string): Promise<void> {
  if (!storageEnabled()) return;
  const c = cfg();
  await client().fetch(`${c.endpoint}/${c.bucket}/${key}`, { method: "DELETE" }).catch(() => {});
}
