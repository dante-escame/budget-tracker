import AuthPanel from "@/components/AuthPanel";
import Dashboard from "@/components/Dashboard";
import UserMenu from "@/components/UserMenu";
import { getAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();

  if (!session?.user) {
    return <AuthPanel />;
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Personal Finance Workspace</p>
          <h1>Budget Tracker</h1>
          <p>
            Upload a monthly bank statement, keep transactions private to your account, and review
            summaries backed by Next.js API routes and MongoDB Atlas.
          </p>
        </div>
        <UserMenu email={session.user.email ?? "Unknown user"} />
      </header>
      <Dashboard />
    </main>
  );
}
