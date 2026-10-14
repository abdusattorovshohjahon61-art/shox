// Replicate API bilan ishlash. Token bo'lmasa DEMO rejim ishlaydi.

const API = "https://api.replicate.com/v1";

export type JobStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export interface Job {
  id: string;
  status: JobStatus;
  output?: string;
  error?: string;
}

const DEMO_VIDEO = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const DEMO_SECONDS = 8;

export function isDemo(): boolean {
  return !process.env.REPLICATE_API_TOKEN;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function normalize(p: { id: string; status: JobStatus; output?: unknown; error?: unknown }): Job {
  const output = Array.isArray(p.output) ? p.output[p.output.length - 1] : p.output;
  return {
    id: p.id,
    status: p.status,
    output: typeof output === "string" ? output : undefined,
    error: p.error ? String(p.error) : undefined,
  };
}

export async function createJob(model: string, input: Record<string, unknown>): Promise<Job> {
  if (isDemo()) {
    return { id: `demo-${Date.now()}`, status: "starting" };
  }
  const res = await fetch(`${API}/models/${model}/predictions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ input }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || `Replicate xatosi (${res.status})`);
  }
  return normalize(data);
}

export async function getJob(id: string): Promise<Job> {
  if (id.startsWith("demo-")) {
    const started = Number(id.slice(5));
    const done = Date.now() - started > DEMO_SECONDS * 1000;
    return done ? { id, status: "succeeded", output: DEMO_VIDEO } : { id, status: "processing" };
  }
  if (!/^[a-z0-9]+$/i.test(id)) {
    throw new Error("Noto'g'ri ID");
  }
  const res = await fetch(`${API}/predictions/${id}`, { headers: headers(), cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || `Replicate xatosi (${res.status})`);
  }
  return normalize(data);
}
