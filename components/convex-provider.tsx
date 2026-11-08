"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const client = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : null;

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!client) return children;
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
