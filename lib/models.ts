// Video generatsiya modellari. Har bir model Replicate'dagi slug va
// bizning umumiy formamizni modelning input formatiga o'giruvchi funksiyaga ega.
// Yangi model qo'shish uchun shu ro'yxatga bitta element qo'shing.

export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  image?: string; // data URI yoki URL (image-to-video)
  aspectRatio: AspectRatio;
  duration: number; // soniya
}

export interface VideoModel {
  id: string;
  name: string;
  vendor: string;
  description: string;
  replicate: string; // owner/name
  durations: number[];
  aspectRatios: AspectRatio[];
  supportsImage: boolean;
  requiresImage?: boolean;
  credits: number; // bitta generatsiya narxi (kredit)
  badge?: string;
  buildInput: (req: GenerationRequest) => Record<string, unknown>;
}

export const MODELS: VideoModel[] = [
  {
    id: "seedance-lite",
    name: "Seedance 1 Lite",
    vendor: "ByteDance",
    description: "Tez va arzon. Matn yoki rasmdan 5–10 soniyalik video.",
    replicate: "bytedance/seedance-1-lite",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImage: true,
    credits: 10,
    badge: "Tez",
    buildInput: (r) => ({
      prompt: r.prompt,
      duration: r.duration,
      aspect_ratio: r.aspectRatio,
      resolution: "720p",
      ...(r.image ? { image: r.image } : {}),
    }),
  },
  {
    id: "hailuo-02",
    name: "Hailuo 02",
    vendor: "MiniMax",
    description: "Kuchli fizika va harakat. Kinematografik sahnalar uchun.",
    replicate: "minimax/hailuo-02",
    durations: [6, 10],
    aspectRatios: ["16:9"],
    supportsImage: true,
    credits: 25,
    badge: "Mashhur",
    buildInput: (r) => ({
      prompt: r.prompt,
      duration: r.duration,
      resolution: "768p",
      prompt_optimizer: true,
      ...(r.image ? { first_frame_image: r.image } : {}),
    }),
  },
  {
    id: "kling-2.1",
    name: "Kling 2.1",
    vendor: "Kuaishou",
    description: "Rasmni jonlantirish (image-to-video) uchun eng yaxshilaridan.",
    replicate: "kwaivgi/kling-v2.1",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImage: true,
    requiresImage: true,
    credits: 30,
    buildInput: (r) => ({
      prompt: r.prompt,
      start_image: r.image,
      duration: r.duration,
      mode: "standard",
      ...(r.negativePrompt ? { negative_prompt: r.negativePrompt } : {}),
    }),
  },
  {
    id: "veo-3-fast",
    name: "Veo 3 Fast",
    vendor: "Google",
    description: "Ovoz bilan birga video. Eng yuqori sifat.",
    replicate: "google/veo-3-fast",
    durations: [8],
    aspectRatios: ["16:9", "9:16"],
    supportsImage: true,
    credits: 60,
    badge: "Ovozli",
    buildInput: (r) => ({
      prompt: r.prompt,
      aspect_ratio: r.aspectRatio,
      ...(r.image ? { image: r.image } : {}),
      ...(r.negativePrompt ? { negative_prompt: r.negativePrompt } : {}),
    }),
  },
];

export function getModel(id: string): VideoModel | undefined {
  return MODELS.find((m) => m.id === id);
}
