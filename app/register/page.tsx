import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Ro'yxatdan o'tish — Shox AI" };

export default function Page() {
  return <Suspense><AuthForm mode="register" /></Suspense>;
}
