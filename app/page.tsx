import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { PublicCatalog } from "@/components/public-catalog";
import {
  MarketingHeader,
  MarketingFooter,
} from "@/components/marketing/marketing-shell";
import { ScrollStory } from "@/components/story/scroll-story";
import { SocietyShowcase } from "@/components/story/society-showcase";
import { Button } from "@/components/ui/button";
import "./home.css";

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <MarketingHeader overlay />
      <main id="main">
        <ScrollStory />
        <section className="sharing-manifesto shell" id="our-story">
          <span className="kicker">LESS STUFF. MORE LIFE.</span>
          <h2>
            Good things deserve
            <br />
            to <em>go around.</em>
            <span className="manifesto-arrow" aria-hidden="true">
              ↗
            </span>
          </h2>
          <div className="benefit-columns">
            {[
              [
                "01",
                "Spend less",
                "Borrow what you need instead of purchasing it for occasional use.",
              ],
              [
                "02",
                "Earn from what you own",
                "Lend for free or set a daily price. Give useful belongings more opportunities to be used.",
              ],
              [
                "03",
                "Make more of what already exists",
                "Sharing can reduce unnecessary purchases and make better use of existing resources.",
              ],
            ].map(([number, title, body]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <SocietyShowcase />
        <section id="tools" className="catalog-section">
          <PublicCatalog
            heading={
              <div className="shell section-heading">
                <div>
                  <span className="kicker">THE NEIGHBORHOOD SHELF</span>
                  <h2>
                    Find your next
                    <br />
                    <em>“just what I needed.”</em>
                  </h2>
                </div>
                <p>
                  A few examples of the things neighbors could share. Explore
                  the live shelf to see what’s currently listed.
                </p>
              </div>
            }
          />
          <div className="shell">
            <div className="catalog-entry">
              <span>Curious what’s available?</span>
              <Button asChild variant="outline">
                <Link href="/explore">
                  Explore listings <ArrowUpRight size={18} />
                </Link>
              </Button>
              <Button asChild className="button-primary">
                <Link href="/dashboard">
                  Sign in to lend or borrow <ArrowUpRight size={18} />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="trust-section shell">
          <div>
            <ShieldCheck size={32} strokeWidth={1.4} />
            <h2>
              Close to home.
              <br />
              Thoughtfully private.
            </h2>
          </div>
          <div>
            <p>
              Choose a society, find an item, and send a request. The owner
              decides whether the dates and terms work. Pending requests don’t
              reserve dates.
            </p>
            <p>
              Personal handover details are shared only between participants
              after a confirmed agreement. Society selection is self-declared,
              not a residency check.
            </p>
            <p>
              Use it with care. Report the return. The owner confirms, and the
              loop is complete. LendLoop does not collect payments.
            </p>
            <Link
              href="/journal#how-neighborhood-lending-works"
              className="text-link"
            >
              A closer look at borrowing ↗
            </Link>
          </div>
        </section>
        <section className="final-invitation">
          <div className="shell">
            <span className="kicker">YOUR NEXT PROJECT STARTS NEARBY</span>
            <h2>
              Own less.
              <br />
              <em>Do more.</em>
            </h2>
            <Button asChild className="button-primary lime-button">
              <Link href="/dashboard">
                Find your neighborhood <ArrowUpRight size={20} />
              </Link>
            </Button>
            <p>One small exchange can be the start of something good.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
