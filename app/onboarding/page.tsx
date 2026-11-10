import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding/onboarding";

export default async function OnboardingPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/sign-in");
  await auth.protect();
  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    return (
      <main className="app-main">
        Convex is not configured yet. See the README for setup.
      </main>
    );
  return <Onboarding />;
}
