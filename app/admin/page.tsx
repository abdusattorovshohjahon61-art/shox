import { notFound } from "next/navigation";
import AdminCredits from "@/components/AdminCredits";
import { currentUser, isAdmin } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { formatSum } from "@/lib/packs";
import type { JobRow } from "@/lib/jobs";

export const metadata = { title: "Admin — Shox AI" };

interface UserRow { id: string; email: string; name: string; credits: number; created_at: number; jobs: number; paid: number }

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  const { q = "" } = await searchParams;
  const day = Date.now() - 86400_000;

  const [users, jobs, revenue, today, failed] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) AS n FROM users"),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM jobs"),
    one<{ s: number }>("SELECT COALESCE(SUM(amount),0) AS s FROM orders WHERE status = 'paid' AND provider != 'test'"),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM jobs WHERE created_at > ?", [day]),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM jobs WHERE status = 'failed' AND created_at > ?", [day]),
  ]);
  const list = await all<UserRow>(
    `SELECT u.id, u.email, u.name, u.credits, u.created_at,
       (SELECT COUNT(*) FROM jobs j WHERE j.user_id = u.id) AS jobs,
       (SELECT COALESCE(SUM(amount),0) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid' AND o.provider != 'test') AS paid
     FROM users u WHERE u.email LIKE ? OR u.name LIKE ? ORDER BY u.created_at DESC LIMIT 100`,
    [`%${q}%`, `%${q}%`],
  );
  const recent = await all<JobRow & { email: string }>(
    "SELECT j.*, u.email FROM jobs j JOIN users u ON u.id = j.user_id ORDER BY j.created_at DESC LIMIT 30",
  );

  return (
    <main className="page">
      <h1>Admin panel</h1>
      <div className="stats" style={{ marginTop: 20 }}>
        <div className="card"><span className="muted">Foydalanuvchilar</span><b>{Number(users?.n)}</b></div>
        <div className="card"><span className="muted">Jami videolar</span><b>{Number(jobs?.n)}</b></div>
        <div className="card"><span className="muted">24 soatda</span><b>{Number(today?.n)}</b></div>
        <div className="card"><span className="muted">24 soatda xato</span><b>{Number(failed?.n)}</b></div>
        <div className="card"><span className="muted">Daromad</span><b>{formatSum(Number(revenue?.s))}</b><span className="muted">so&apos;m</span></div>
      </div>

      <h2>Foydalanuvchilar</h2>
      <form style={{ marginBottom: 12 }}>
        <input className="input" name="q" defaultValue={q} placeholder="Email yoki ism bo'yicha qidirish" style={{ maxWidth: 360 }} />
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ism</th><th>Email</th><th>Ro&apos;yxat</th><th>Video</th><th>To&apos;lagan</th><th>Kredit</th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{new Date(Number(u.created_at)).toLocaleDateString("ru-RU")}</td>
                <td>{Number(u.jobs)}</td>
                <td>{formatSum(Number(u.paid))}</td>
                <td><AdminCredits userId={u.id} initial={Number(u.credits)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>So&apos;nggi videolar</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Sana</th><th>Foydalanuvchi</th><th>Model</th><th>Holat</th><th>Prompt</th></tr></thead>
          <tbody>
            {recent.map((j) => (
              <tr key={j.id}>
                <td>{new Date(Number(j.created_at)).toLocaleString("ru-RU")}</td>
                <td>{j.email}</td>
                <td>{j.model}</td>
                <td><span className={`status ${j.status}`}>{j.status}</span>{j.error ? ` ${j.error.slice(0, 60)}` : ""}</td>
                <td style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {j.output_url ? <a className="accent" href={j.output_url} target="_blank" rel="noreferrer">{j.prompt}</a> : j.prompt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
