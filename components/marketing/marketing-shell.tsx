import Link from "next/link";
import { cn } from "@/lib/utils";
import { AuthNav } from "./auth-nav";
import styles from "./marketing-shell.module.css";

/** `overlay` lets the homepage story run edge to edge beneath the header. */
export function MarketingHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={cn(styles.header, overlay && styles.overlay)}>
      <div className={cn("shell", styles.nav)}>
        <Link href="/" className="wordmark" aria-label="LendLoop home">
          <span className={styles.mark} aria-hidden="true">
            ↔
          </span>{" "}
          lendloop
          <span className={styles.period}>.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/explore">Explore</Link>
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
    <footer className={styles.footer}>
      <div className="shell">
        <div className={styles.footerTop}>
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
        <div className={styles.footerBottom}>
          <span>Good things deserve to go around.</span>
          <span>© {new Date().getFullYear()} LendLoop</span>
        </div>
      </div>
    </footer>
  );
}
