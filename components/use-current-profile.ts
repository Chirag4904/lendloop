"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCurrentProfile() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const profile = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const ensure = useMutation(api.users.ensureCurrent);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !user || profile !== null) return;
    void ensure({
      displayName: user.firstName || user.username || "Neighbor",
    }).catch((e) => setError(e.message));
  }, [isAuthenticated, user, profile, ensure]);

  return {
    profile,
    loading: isLoading || (isAuthenticated && profile === undefined),
    error,
  };
}
