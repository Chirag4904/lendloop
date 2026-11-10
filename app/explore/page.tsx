import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/marketing-shell";
import { PublicExplore } from "@/components/marketplace/public-explore";

export const metadata: Metadata = {
  title: "Explore the neighborhood shelf | LendLoop",
  description: "Browse things available to share on LendLoop.",
};

export default async function ExplorePage() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }
  return (
    <>
      <MarketingHeader />
      <main>
        <PublicExplore />
      </main>
      <MarketingFooter />
    </>
  );
}
