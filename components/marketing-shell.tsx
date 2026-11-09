import Link from "next/link";
import { AuthNav } from "./auth-nav";
export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <div className="shell marketing-nav">
        <Link href="/" className="wordmark" aria-label="LendLoop home">
          <span aria-hidden="true">↔</span> lendloop
          <span className="logo-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#tools">Explore</Link>
          <Link href="/#our-story">Our story</Link>
          <Link href="/journal">Journal</Link>
        </nav>
        <AuthNav />
      </div>
    </header>
  );
}
export function MarketingFooter() {
  return (
    <footer className="editorial-footer">
      <div className="shell">
        <div className="footer-top">
          <Link href="/" className="wordmark">
            ↔ lendloop.
          </Link>
          <p>
            A little less owning.
            <br />A lot more possibility.
          </p>
          <div>
            <Link href="/journal">The journal ↗</Link>
            <Link href="/for-communities">For communities ↗</Link>
            <Link href="/sign-in">Sign in ↗</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Good things deserve to go around.</span>
          <span>© {new Date().getFullYear()} LendLoop</span>
        </div>
      </div>
    </footer>
  );
}
