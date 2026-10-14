import { redirect } from "next/navigation";
import Studio from "@/components/Studio";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Studiya — Shox AI" };

export default async function CreatePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/create");
  return <Studio initialCredits={user.credits} />;
}
