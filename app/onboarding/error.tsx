"use client";

import Link from "next/link";
import { AuthPage } from "@/components/auth/auth-page";
import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <AuthPage
      error
      kicker="SOMETHING WENT WRONG"
      title="We couldn’t load your neighborhood."
    >
      <p>Check your connection and try again.</p>
      <Button type="button" className="button-primary" onClick={reset}>
        Try again
      </Button>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </AuthPage>
  );
}
