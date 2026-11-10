import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth-page.module.css";

export function AuthPage({
  kicker,
  title,
  children,
  error = false,
}: {
  kicker: string;
  title: ReactNode;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <main
      className={`flex min-h-screen flex-col items-center gap-[45px] px-6 py-10 ${styles.page}`}
    >
      {!error && (
        <Link href="/" className="brand">
          LendLoop<span className="brand-dot">.</span>
        </Link>
      )}
      <div className={styles.panel} role={error ? "alert" : undefined}>
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}
