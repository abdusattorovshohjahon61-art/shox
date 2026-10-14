// Higgsfield uslubidagi kamera harakatlari. Har biri promptga qo'shiladigan
// kinematografik ko'rsatma sifatida ishlaydi, shuning uchun istalgan model bilan mos.

export interface CameraMotion {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
}

export const MOTIONS: CameraMotion[] = [
  { id: "none", name: "Oddiy", emoji: "🎬", prompt: "" },
  { id: "dolly-in", name: "Dolly In", emoji: "🔍", prompt: "smooth slow dolly-in camera move towards the subject" },
  { id: "dolly-out", name: "Dolly Out", emoji: "🔭", prompt: "slow dolly-out camera move revealing the surroundings" },
  { id: "crash-zoom", name: "Crash Zoom", emoji: "💥", prompt: "sudden fast crash zoom into the subject" },
  { id: "orbit", name: "360 Orbit", emoji: "🌀", prompt: "camera orbits 360 degrees around the subject" },
  { id: "fpv-drone", name: "FPV Drone", emoji: "🚁", prompt: "fast FPV drone shot flying through the scene" },
  { id: "crane-up", name: "Crane Up", emoji: "🏗️", prompt: "camera cranes up rising high above the scene" },
  { id: "dolly-zoom", name: "Dolly Zoom", emoji: "😵", prompt: "vertigo dolly zoom effect, background warps while subject stays the same size" },
  { id: "handheld", name: "Handheld", emoji: "🤳", prompt: "handheld shaky documentary style camera" },
  { id: "bullet-time", name: "Bullet Time", emoji: "⏱️", prompt: "bullet time, frozen moment while the camera rotates around the subject" },
  { id: "tracking", name: "Tracking", emoji: "🏃", prompt: "tracking shot following the subject from the side" },
  { id: "low-angle", name: "Low Angle", emoji: "⬆️", prompt: "dramatic low angle hero shot, camera slowly pushing in" },
];

export const STYLES = [
  { id: "none", name: "Uslubsiz", prompt: "" },
  { id: "cinematic", name: "Kino", prompt: "cinematic, anamorphic lens, film grain, dramatic lighting" },
  { id: "anime", name: "Anime", prompt: "anime style, vibrant colors, studio quality animation" },
  { id: "realistic", name: "Real", prompt: "photorealistic, 4k, natural lighting" },
  { id: "3d", name: "3D", prompt: "3D render, pixar style, soft global illumination" },
  { id: "noir", name: "Noir", prompt: "black and white film noir, high contrast shadows" },
];

export function buildPrompt(base: string, motionId: string, styleId: string): string {
  const motion = MOTIONS.find((m) => m.id === motionId)?.prompt;
  const style = STYLES.find((s) => s.id === styleId)?.prompt;
  return [base.trim(), motion, style].filter(Boolean).join(". ");
}
