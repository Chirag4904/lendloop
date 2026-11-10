import type { Metadata } from "next";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/marketing-shell";
import { PublicExplore } from "@/components/marketplace/public-explore";

export const metadata: Metadata = {
  title: "Explore the neighborhood shelf | LendLoop",
  description: "Browse things available to share on LendLoop.",
};

export default function ExplorePage() {
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
