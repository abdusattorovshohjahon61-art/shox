import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { fail } from "@/lib/http";
import { publicJob, syncJob, type JobRow } from "@/lib/jobs";
import { deleteVideo } from "@/lib/storage";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return fail("Avval tizimga kiring", 401);
  const { id } = await params;
  const owned = await one<JobRow>("SELECT * FROM jobs WHERE id = ? AND user_id = ?", [id, user.id]);
  if (!owned) return fail("Topilmadi", 404);
  try {
    await syncJob(id);
  } catch (e) {
    console.error("syncJob failed", id, e);
  }
  const job = await one<JobRow>("SELECT * FROM jobs WHERE id = ?", [id]);
  const fresh = await one<{ credits: number }>("SELECT credits FROM users WHERE id = ?", [user.id]);
  return NextResponse.json({ job: publicJob(job!), credits: Number(fresh?.credits ?? 0) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return fail("Avval tizimga kiring", 401);
  const { id } = await params;
  const job = await one<JobRow>("SELECT * FROM jobs WHERE id = ? AND user_id = ?", [id, user.id]);
  if (!job) return fail("Topilmadi", 404);
  if (!["succeeded", "failed", "canceled"].includes(job.status)) return fail("Video hali tayyorlanmoqda");
  await run("DELETE FROM jobs WHERE id = ?", [id]);
  if (job.storage_key) await deleteVideo(job.storage_key);
  return NextResponse.json({ ok: true });
}
