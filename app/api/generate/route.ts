import { NextResponse } from "next/server";
import { getModel, type AspectRatio } from "@/lib/models";
import { buildPrompt } from "@/lib/motions";
import { createJob, isDemo } from "@/lib/replicate";
import { allow } from "@/lib/rateLimit";

const MAX_IMAGE_CHARS = 7_000_000; // ~5MB data URI

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const model = getModel(String(body.model || ""));
  if (!model) {
    return NextResponse.json({ error: "Model topilmadi" }, { status: 400 });
  }

  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 3 || prompt.length > 2000) {
    return NextResponse.json({ error: "Prompt 3–2000 belgi bo'lishi kerak" }, { status: 400 });
  }

  const image = typeof body.image === "string" && body.image ? body.image : undefined;
  if (image && (image.length > MAX_IMAGE_CHARS || !/^(data:image\/|https:\/\/)/.test(image))) {
    return NextResponse.json({ error: "Rasm noto'g'ri yoki juda katta" }, { status: 400 });
  }
  if (model.requiresImage && !image) {
    return NextResponse.json({ error: `${model.name} uchun rasm yuklash shart` }, { status: 400 });
  }

  const aspectRatio = model.aspectRatios.includes(body.aspectRatio as AspectRatio)
    ? (body.aspectRatio as AspectRatio)
    : model.aspectRatios[0];
  const duration = model.durations.includes(Number(body.duration))
    ? Number(body.duration)
    : model.durations[0];

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!isDemo() && !allow(ip)) {
    return NextResponse.json({ error: "Limit tugadi. Birozdan keyin urinib ko'ring." }, { status: 429 });
  }

  const finalPrompt = buildPrompt(prompt, String(body.motion || "none"), String(body.style || "none"));
  const input = model.buildInput({
    prompt: finalPrompt,
    negativePrompt: typeof body.negativePrompt === "string" ? body.negativePrompt.slice(0, 500) : undefined,
    image: model.supportsImage ? image : undefined,
    aspectRatio,
    duration,
  });

  try {
    const job = await createJob(model.replicate, input);
    return NextResponse.json({ ...job, demo: isDemo(), prompt: finalPrompt });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
