import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addCredits, spendCredits } from "@/lib/credits";
import { one, run } from "@/lib/db";
import { appUrl, fail, readJson } from "@/lib/http";
import { getModel, type AspectRatio } from "@/lib/models";
import { buildPrompt } from "@/lib/motions";
import { createJob, isDemo } from "@/lib/replicate";
import { hit } from "@/lib/rateLimit";

const MAX_IMAGE_CHARS = 7_000_000; // ~5MB data URI

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Avval tizimga kiring", 401);

  const body = await readJson(req);
  if (!body) return fail("Noto'g'ri so'rov");

  const model = getModel(String(body.model || ""));
  if (!model) return fail("Model topilmadi");

  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 3 || prompt.length > 2000) return fail("Prompt 3–2000 belgi bo'lishi kerak");

  const image = typeof body.image === "string" && body.image ? body.image : undefined;
  if (image && (image.length > MAX_IMAGE_CHARS || !/^(data:image\/(png|jpeg|webp);base64,|https:\/\/)/.test(image))) {
    return fail("Rasm noto'g'ri yoki juda katta");
  }
  if (model.requiresImage && !image) return fail(`${model.name} uchun rasm yuklash shart`);

  const aspectRatio = model.aspectRatios.includes(body.aspectRatio as AspectRatio) ? (body.aspectRatio as AspectRatio) : model.aspectRatios[0];
  const duration = model.durations.includes(Number(body.duration)) ? Number(body.duration) : model.durations[0];

  const maxConcurrent = Number(process.env.MAX_CONCURRENT_JOBS || 3);
  const active = await one<{ n: number }>("SELECT COUNT(*) AS n FROM jobs WHERE user_id = ? AND status IN ('starting','processing','saving')", [user.id]);
  if (Number(active?.n ?? 0) >= maxConcurrent) return fail(`Bir vaqtda ${maxConcurrent} tadan ortiq video yaratib bo'lmaydi`, 429);
  if (!(await hit(`gen:${user.id}`, Number(process.env.MAX_JOBS_PER_HOUR || 20), 3600_000))) {
    return fail("Soatlik limit tugadi. Birozdan keyin urinib ko'ring.", 429);
  }

  if (!(await spendCredits(user.id, model.credits))) return fail("Kredit yetarli emas. Balansni to'ldiring.", 402);

  const finalPrompt = buildPrompt(prompt, String(body.motion || "none"), String(body.style || "none"));
  const input = model.buildInput({
    prompt: finalPrompt,
    negativePrompt: typeof body.negativePrompt === "string" ? body.negativePrompt.slice(0, 500) : undefined,
    image: model.supportsImage ? image : undefined,
    aspectRatio,
    duration,
  });

  const base = appUrl(req);
  const webhook = base.startsWith("https://") ? `${base}/api/webhooks/replicate` : undefined;

  let remote;
  try {
    remote = await createJob(model.replicate, input, webhook);
  } catch (e) {
    await addCredits(user.id, model.credits);
    console.error("createJob failed", e);
    return fail("Video xizmati vaqtincha ishlamayapti. Kredit qaytarildi.", 502);
  }

  const now = Date.now();
  await run(
    "INSERT INTO jobs (id, user_id, model, prompt, status, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [remote.id, user.id, model.name, finalPrompt, remote.status, model.credits, now, now],
  );

  return NextResponse.json({ id: remote.id, demo: isDemo(), credits: user.credits - model.credits });
}
