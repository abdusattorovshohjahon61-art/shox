import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { fail } from "@/lib/http";
import { publicJob, recoverStuck, type JobRow } from "@/lib/jobs";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Avval tizimga kiring", 401);
  await recoverStuck(user.id);
  const jobs = await all<JobRow>("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", [user.id]);
  return NextResponse.json({ jobs: jobs.map(publicJob), credits: user.credits });
}
