"use client";

import { useEffect, useRef, useState } from "react";
import { MODELS, type AspectRatio } from "@/lib/models";
import { MOTIONS, STYLES } from "@/lib/motions";

interface Job {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  prompt: string;
  model: string;
  output?: string;
  error?: string;
  createdAt: number;
}

const STORAGE_KEY = "shox-jobs";
const FINAL = ["succeeded", "failed", "canceled"];

function loadJobs(): Job[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 50)));
  } catch {}
}

// Rasmni brauzerda kichraytirib, JPEG data URI qilib qaytaradi.
function resizeImage(file: File, max = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function CreatePage() {
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [motion, setMotion] = useState("none");
  const [style, setStyle] = useState("none");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState(MODELS[0].durations[0]);
  const [image, setImage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const model = MODELS.find((m) => m.id === modelId)!;

  useEffect(() => setJobs(loadJobs()), []);

  // Model o'zgarsa, mos kelmaydigan sozlamalarni tuzatamiz
  useEffect(() => {
    if (!model.durations.includes(duration)) setDuration(model.durations[0]);
    if (!model.aspectRatios.includes(aspectRatio)) setAspectRatio(model.aspectRatios[0]);
  }, [model, duration, aspectRatio]);

  // Tugallanmagan ishlarni so'rab turamiz
  const pending = jobs.filter((j) => !FINAL.includes(j.status)).map((j) => j.id).join(",");
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      const ids = pending.split(",");
      const updates = await Promise.all(
        ids.map((id) => fetch(`/api/status/${id}`).then((r) => r.json()).catch(() => null)),
      );
      setJobs((prev) => {
        const next = prev.map((j) => {
          const u = updates.find((x) => x && x.id === j.id);
          return u && !u.error ? { ...j, status: u.status, output: u.output, error: u.error } : j;
        });
        saveJobs(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [pending]);

  async function onFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Faqat rasm fayllari qabul qilinadi");
      return;
    }
    setImage(await resizeImage(file));
    setError("");
  }

  async function generate() {
    setError("");
    if (prompt.trim().length < 3) {
      setError("Iltimos, videoni tasvirlab bering");
      return;
    }
    if (model.requiresImage && !image) {
      setError(`${model.name} uchun rasm yuklang`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          prompt,
          negativePrompt,
          motion,
          style,
          aspectRatio,
          duration,
          image: model.supportsImage ? image : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      setDemo(Boolean(data.demo));
      const job: Job = { id: data.id, status: data.status, prompt: data.prompt, model: model.name, createdAt: Date.now() };
      setJobs((prev) => {
        const next = [job, ...prev];
        saveJobs(next);
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function removeJob(id: string) {
    setJobs((prev) => {
      const next = prev.filter((j) => j.id !== id);
      saveJobs(next);
      return next;
    });
  }

  return (
    <main className="studio">
      <aside className="panel">
        <div className="field">
          <label>Model</label>
          <div className="options two">
            {MODELS.map((m) => (
              <button key={m.id} className={`opt ${m.id === modelId ? "active" : ""}`} onClick={() => setModelId(m.id)}>
                <b>{m.name}</b>
                <small>{m.vendor} · {m.credits} kredit</small>
              </button>
            ))}
          </div>
        </div>

        {model.supportsImage && (
          <div className="field">
            <label>Boshlang'ich rasm {model.requiresImage ? "(majburiy)" : "(ixtiyoriy)"}</label>
            <div
              className="dropzone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files[0]);
              }}
            >
              {image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="Yuklangan rasm" />
                  <button
                    className="remove"
                    aria-label="Rasmni olib tashlash"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span>📤 Rasmni shu yerga tashlang yoki bosing</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        )}

        <div className="field">
          <label>Prompt</label>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Masalan: Samarqand Registon maydoni ustida quyosh botmoqda, kaptarlar uchib o'tadi"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
          />
        </div>

        <div className="field">
          <label>Kamera harakati</label>
          <div className="options">
            {MOTIONS.map((m) => (
              <button key={m.id} className={`opt ${m.id === motion ? "active" : ""}`} onClick={() => setMotion(m.id)}>
                <span className="emoji">{m.emoji}</span>
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Uslub</label>
          <div className="options">
            {STYLES.map((s) => (
              <button key={s.id} className={`opt ${s.id === style ? "active" : ""}`} onClick={() => setStyle(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Format</label>
          <div className="options">
            {(["16:9", "9:16", "1:1"] as AspectRatio[]).map((a) => (
              <button
                key={a}
                className={`opt ${a === aspectRatio ? "active" : ""}`}
                disabled={!model.aspectRatios.includes(a)}
                onClick={() => setAspectRatio(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Davomiyligi</label>
          <div className="options">
            {model.durations.map((d) => (
              <button key={d} className={`opt ${d === duration ? "active" : ""}`} onClick={() => setDuration(d)}>
                {d} soniya
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Salbiy prompt (ixtiyoriy)</label>
          <input
            className="input"
            placeholder="Videoda bo'lmasligi kerak bo'lgan narsalar"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="generate">
          {error && <p className="error">{error}</p>}
          {demo && <p className="notice">Demo rejim: REPLICATE_API_TOKEN sozlanmagan, namuna video ko'rsatiladi.</p>}
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Yuborilmoqda..." : `✨ Yaratish · ${model.credits} kredit`}
          </button>
        </div>
      </aside>

      <section className="feed">
        {jobs.length === 0 ? (
          <div className="empty">
            <div>
              <div className="big">🎬</div>
              <h2>Hali video yo'q</h2>
              <p>Chap tomonda prompt yozing va "Yaratish" tugmasini bosing.</p>
            </div>
          </div>
        ) : (
          <div className="feed-grid">
            {jobs.map((j) => (
              <article className="job" key={j.id}>
                {j.status === "succeeded" && j.output ? (
                  <video src={j.output} controls autoPlay loop muted playsInline />
                ) : FINAL.includes(j.status) ? (
                  <div className="placeholder failed">❌ {j.error || "Generatsiya muvaffaqiyatsiz tugadi"}</div>
                ) : (
                  <div className="placeholder">⏳ Video yaratilmoqda...</div>
                )}
                <div className="meta">
                  <p>{j.prompt}</p>
                  <div className="row">
                    <span>{j.model}</span>
                    <span style={{ display: "flex", gap: 12 }}>
                      {j.output && (
                        <a href={j.output} target="_blank" rel="noreferrer" download>
                          Yuklab olish
                        </a>
                      )}
                      <button onClick={() => removeJob(j.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                        O'chirish
                      </button>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
