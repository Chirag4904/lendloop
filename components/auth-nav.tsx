"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";

const signInLink = (
  <Link className="nav-cta" href="/sign-in">
    Sign in <ArrowUpRight size={16} />
  </Link>
);

function AccountNav() {
  const { isSignedIn } = useAuth();
  // Keep a usable entry point visible while Clerk loads or is unavailable.
  if (!isSignedIn) return signInLink;
  return (
    <>
      <Link className="nav-cta" href="/dashboard">
        Go to dashboard <ArrowUpRight size={16} />
      </Link>
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
