import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing-shell";
export const metadata: Metadata = {
  title: "The Journal — LendLoop",
  description:
    "Notes on borrowing, sharing, and making more of what is already around us.",
};
export default function JournalPage() {
  return (
    <>
      <MarketingHeader />
      <main className="shell">
        <header className="journal-intro">
          <span className="kicker">THE LENDLOOP JOURNAL</span>
          <h1>
            Ideas worth
            <br />
            passing around.
          </h1>
          <p>
            Notes on a life with less occasional-use stuff, more possibilities,
            and a little help from next door.
          </p>
        </header>
        <article className="journal-article" id="before-you-buy">
          <div>
            <span className="kicker">01 / EVERYDAY DECISIONS</span>
            <h2>
              Before you buy it,
              <br />
              could you borrow it?
            </h2>
          </div>
          <div>
            <p>
              A shelf needs fixing. A guest needs an extra chair. A camping trip
              needs a tent. Sometimes the project is worth making room for; the
              equipment less so.
            </p>
            <p>
              Before buying, consider how often you’ll use the item, where
              you’ll keep it, and whether someone nearby can lend it. Borrowing
              can make sense for occasional use. Buying may be the better choice
              when you use something often, need it immediately, or need a
              particular specification.
            </p>
            <p>
              Compare the full rental price and the effort of pickup and return
              with the cost of owning. There is no universal saving: it depends
              on the item, the terms, and your plans.
            </p>
            <Link href="/#tools">See what’s on the neighborhood shelf ↗</Link>
          </div>
        </article>
        <article
          className="journal-article"
          id="how-neighborhood-lending-works"
        >
          <div>
            <span className="kicker">02 / THE LENDLOOP GUIDE</span>
            <h2>
              A simple exchange.
              <br />A little consideration.
            </h2>
          </div>
          <div>
            <p>
              On LendLoop, choose your society, explore available listings, and
              request the dates you need. You can start in your own society and
              expand to nearby societies. Distances are approximate and based on
              society centers.
            </p>
            <p>
              The lender approves or declines. Paid listings support one price
              offer and a final lender response. Dates are reserved only once an
              agreement is confirmed, and the agreed price is kept with the
              loan. LendLoop does not collect payment.
            </p>
            <p>
              After confirmation, handover details are available only to the two
              participants. Coordinate pickup, take care of the item, and report
              its return. The lender confirms the return to complete the loan.
            </p>
            <p>
              Society choice is self-declared. It is not proof of residency or a
              guarantee about another person. Ask the practical questions that
              matter for your exchange before confirming.
            </p>
            <Link href="/dashboard">Sign in to get started ↗</Link>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </>
  );
}
