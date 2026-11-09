"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentProfile } from "./use-current-profile";
export function Profile() {
  const { profile, loading, error } = useCurrentProfile();
  const societies = useQuery(api.societies.search, { term: "" });
  if (error) return <p role="alert">{error}</p>;
  if (loading || !profile) return <p role="status">Loading your profile…</p>;
  const society = societies?.find((s) => s._id === profile.societyId);
  return (
    <section className="profile-page">
      <div className="app-heading">
        <span className="kicker">YOUR PLACE IN THE NEIGHBORHOOD</span>
        <h1>A neighbor. And so much more.</h1>
        <p>Borrower, lender, and part of something local.</p>
      </div>
      <div className="profile-editorial">
        <div className="profile-monogram" aria-hidden="true">
          {profile.displayName.slice(0, 1)}
        </div>
        <div>
          <h2>{profile.displayName}</h2>
          <p>
            {society
              ? `${society.name} · ${society.locality}, ${society.city}`
              : "Your selected society"}
          </p>
          <div className="trust-badges">
            {profile.trustedLender && <span>Trusted Lender</span>}
            {profile.trustedBorrower && <span>Trusted Borrower</span>}
          </div>
          <p>
            Trust badges are assigned by LendLoop. They are not identity or
            residency verification.
          </p>
          <Link className="button-primary" href="/dashboard/listings">
            Visit your lending shelf →
          </Link>
        </div>
      </div>
    </section>
  );
}
