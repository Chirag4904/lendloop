"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <div className="auth-panel" role="alert">
        <span className="kicker">SOMETHING WENT WRONG</span>
        <h1>We couldn’t load your neighborhood.</h1>
        <p>Check your connection and try again.</p>
        <Button type="button" className="button-primary" onClick={reset}>
          Try again
        </Button>
        <p>
          <Link href="/">Return home</Link>
        </p>
      </div>
    </main>
  );
}
