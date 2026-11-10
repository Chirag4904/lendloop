import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className="wordmark" href="/" aria-label="LendLoop home">
          ↔ lendloop.
        </Link>
      </header>
      <div className={styles.content}>
        <div className={styles.art} aria-hidden="true">
          <span className={styles.artNumber}>404</span>
          <span className={styles.artMark}>↔</span>
        </div>
        <div className={styles.copy}>
          <span className="kicker">A LITTLE OFF THE PATH</span>
          <h1>
            Looks like this page wandered off<span>.</span>
          </h1>
          <p>
            We couldn’t find the page you’re looking for. There’s plenty more to
            discover in the neighborhood.
          </p>
          <Button asChild className={styles.action}>
            <Link href="/">
              Back to home <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <footer className={styles.footer}>
        Good things deserve to go around.
      </footer>
    </main>
  );
}
