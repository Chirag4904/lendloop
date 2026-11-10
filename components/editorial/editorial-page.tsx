import type { ReactNode } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing-shell";
import styles from "./editorial-page.module.css";

export function EditorialPage({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      <main className="shell">
        <header className={styles.intro}>
          <span className="kicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}
