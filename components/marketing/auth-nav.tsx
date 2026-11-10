"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./marketing-shell.module.css";

function AccountLink({ href, children }: { href: string; children: string }) {
  return (
    <Button asChild variant="outline" className={styles.accountLink}>
      <Link href={href}>
        {children} <ArrowUpRight size={16} />
      </Link>
    </Button>
  );
}

const signInLink = <AccountLink href="/sign-in">Sign in</AccountLink>;

function AccountNav() {
  const { isSignedIn } = useAuth();
  // Keep a usable entry point visible while Clerk loads or is unavailable.
  if (!isSignedIn) return signInLink;
  return (
    <>
      <AccountLink href="/dashboard">Go to dashboard</AccountLink>
      <UserButton />
    </>
  );
}

export function AuthNav() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return signInLink;
  return (
    <Suspense fallback={signInLink}>
      <AccountNav />
    </Suspense>
  );
}
