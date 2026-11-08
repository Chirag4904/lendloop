import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  HandHeart,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { AuthNav } from "@/components/auth-nav";
import { PublicCatalog } from "@/components/public-catalog";

export default function Home() {
  return (
    <>
      <header className="site-header shell">
        <Link className="brand" href="/" aria-label="LendLoop home">
          <span className="brand-mark">
            <Wrench size={20} strokeWidth={2.4} />
          </span>
          LendLoop<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#tools">Explore tools</a>
          <AuthNav />
        </nav>
      </header>
      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> The neighborhood shelf is open
            </span>
            <h1>
              The things you need are <em>closer than you think.</em>
            </h1>
            <p className="hero-lede">
              Borrow tools, gear, and everyday extras from your neighborhood.
              Share what you have when you’re ready.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#tools">
                Explore tools <ArrowUpRight size={18} />
              </a>
              <Link className="text-link" href="/sign-up">
                Join LendLoop <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <span className="note-icon">
                <ShieldCheck size={18} />
              </span>{" "}
              Start with your society. Share at your pace.
            </div>
          </div>
          <figure className="hero-visual">
            <Image
              src="/images/hero-neighborhood.jpg"
              alt="A drill, camping lantern, and garden pruners on warm stone plinths in a sunlit room"
              fill
              sizes="(max-width: 700px) 100vw, 45vw"
              priority
            />
            <figcaption>
              <span>GOOD THINGS GO AROUND</span>
              <strong>Make room for more moments.</strong>
            </figcaption>
          </figure>
        </section>
        <section className="benefit-band">
          <div className="shell benefit-inner">
            <p>
              Less buying. <em>More living.</em>
            </p>
            <span>
              Make room for what matters, with a little help from the people
              around you.
            </span>
          </div>
        </section>
        <section id="how-it-works" className="section shell">
          <div className="section-heading">
            <div>
              <span className="kicker">THE SIMPLE IDEA</span>
              <h2>
                Good things are
                <br />
                <em>better shared.</em>
              </h2>
            </div>
            <p>
              From a quick home fix to a weekend project, find useful things
              already close to home.
            </p>
          </div>
          <div className="steps">
            <article>
              <span className="step-number">01</span>
              <div className="step-icon">
                <Search size={27} />
              </div>
              <h3>Find what you need</h3>
              <p>
                Explore tools your neighbors have made available to lend or
                rent.
              </p>
            </article>
            <article>
              <span className="step-number">02</span>
              <div className="step-icon">
                <HandHeart size={27} />
              </div>
              <h3>Ask to borrow</h3>
              <p>
                Send a request for the dates you need. The lender decides
                whether it works.
              </p>
            </article>
            <article>
              <span className="step-number">03</span>
              <div className="step-icon">
                <Sparkles size={27} />
              </div>
              <h3>Pass it along</h3>
              <p>
                Use it, return it, and keep useful things moving through your
                neighborhood.
              </p>
            </article>
          </div>
        </section>
        <section id="tools" className="catalog-section">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="kicker">THE NEIGHBORHOOD SHELF</span>
                <h2>
                  Useful things,
                  <br />
                  <em>close to home.</em>
                </h2>
              </div>
              <p>
                A live peek at active tools on LendLoop. Details stay private
                until it’s time to coordinate.
              </p>
            </div>
            <PublicCatalog />
          </div>
        </section>
        <section className="society-section shell">
          <div className="society-illustration" aria-hidden="true">
            <div className="house h1" />
            <div className="house h2" />
            <div className="house h3" />
            <div className="path-line" />
            <MapPin size={42} />
          </div>
          <div>
            <span className="kicker">START CLOSE TO HOME</span>
            <h2>
              Your society is
              <br />
              <em>the starting point.</em>
            </h2>
            <p>
              Choose your society when you join. It helps keep discovery local
              and gives sharing a familiar place to begin.
            </p>
            <Link className="button-primary" href="/sign-up">
              Join the neighborhood <ArrowUpRight size={18} />
            </Link>
            <span className="society-disclaimer">
              Society selection is self-declared; it doesn’t verify residency.
            </span>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="shell footer-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <Wrench size={20} />
            </span>
            LendLoop<span className="brand-dot">.</span>
          </Link>
          <span>Good things go around.</span>
          <span>© {new Date().getFullYear()} LendLoop</span>
        </div>
      </footer>
    </>
  );
}
