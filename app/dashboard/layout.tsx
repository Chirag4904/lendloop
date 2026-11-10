import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/sign-in");
  await auth.protect();
  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    return (
      <main className="app-main">
        We couldn’t connect right now. Please try again later.
      </main>
    );
  return <DashboardShell>{children}</DashboardShell>;
}
