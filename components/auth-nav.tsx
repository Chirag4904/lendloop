"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";

export function AuthNav() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <Link className="nav-cta" href="/sign-in">
        Sign in <ArrowUpRight size={16} />
      </Link>
    );
  return (
    <Suspense fallback={<span className="nav-cta">Loading account…</span>}>
      <Show when="signed-out">
        <Link className="nav-cta" href="/sign-in">
          Sign in <ArrowUpRight size={16} />
        </Link>
      </Show>
      <Show when="signed-in">
        <Link className="nav-cta" href="/dashboard">
          Go to dashboard <ArrowUpRight size={16} />
        </Link>
        <UserButton />
      </Show>
    </Suspense>
  );
}
