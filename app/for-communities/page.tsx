import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing-shell";
export const metadata: Metadata = { title: "For Communities — LendLoop" };
export default function CommunitiesPage() {
  return (
    <>
      <MarketingHeader />
      <main className="shell">
        <header className="journal-intro">
          <span className="kicker">A FUTURE INTEGRATION CONCEPT</span>
          <h1>
            More possibility.
            <br />
            In every building.
          </h1>
          <p>
            Imagine a shared neighborhood shelf alongside the community tools
            residents already use.
          </p>
        </header>
        <section className="journal-article">
          <div>
            <span className="kicker">AN IDEA TO EXPLORE</span>
            <h2>
              Sharing, closer to
              <br />
              everyday community life.
            </h2>
          </div>
          <div>
            <p>
              LendLoop could eventually connect with residential-community
              platforms to make local discovery easier to find. MyGate is an
              example of this category of platform, not an existing LendLoop
              partner.
            </p>
            <p>
              No external community integration or partnership is currently
              implemented. Any future work would need explicit permissions,
              careful privacy design, and agreement with the platform involved.
            </p>
            <p>
              Today, neighbors can select a society directly in LendLoop and
              discover items through the existing marketplace.
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
