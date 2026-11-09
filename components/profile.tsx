"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Building2,
  LockKeyhole,
  Phone,
  MapPin,
  PackageOpen,
  RotateCcw,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentProfile } from "./use-current-profile";

export function Profile() {
  const { profile, loading, error } = useCurrentProfile();
  const societies = useQuery(api.societies.search, { term: "" });
  const saved = useQuery(api.handover.mine);
  const save = useMutation(api.handover.save);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    phone: "",
    pickupPoint: "",
    instructions: "",
    returnInstructions: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (error) return <p role="alert">{error}</p>;
  if (loading || !profile || saved === undefined)
    return <p role="status">Loading your profile…</p>;
  const society = societies?.find((s) => s._id === profile.societyId);
  const labels = {
    phone: "Contact phone",
    pickupPoint: "Pickup point",
    instructions: "Pickup instructions",
    returnInstructions: "Return instructions",
  } as const;
  const icons = {
    phone: Phone,
    pickupPoint: MapPin,
    instructions: PackageOpen,
    returnInstructions: RotateCcw,
  };
  const placeholders = {
    phone: "+91 98765 43210",
    pickupPoint: "e.g. Main lobby or security desk",
    instructions: "e.g. Please call when you arrive",
    returnInstructions: "e.g. Leave it with the security desk",
  };
  return (
    <section className="profile-page">
      <div className="app-heading profile-heading">
        <span className="kicker">YOUR PLACE IN THE NEIGHBORHOOD</span>
        <h1>My profile</h1>
        <p>Your neighborhood identity and private handover details.</p>
      </div>
      <div className="profile-studio">
        <div className="profile-identity">
          <span className="profile-identity-label">YOUR LENDLOOP PROFILE</span>
          <div className="profile-avatar" aria-hidden="true">
            {profile.displayName.slice(0, 1)}
          </div>
          <h2>{profile.displayName}</h2>
          <p className="profile-society">
            <Building2 size={18} /> {society?.name ?? "Your selected society"}
          </p>
          <div className="trust-badges">
            {profile.trustedLender && <span>Trusted Lender</span>}
            {profile.trustedBorrower && <span>Trusted Borrower</span>}
          </div>
          {(profile.trustedLender || profile.trustedBorrower) && (
            <p className="profile-trust-note">
              Trust badges are assigned by LendLoop; they are not identity or
              residency verification.
            </p>
          )}
          <Link className="text-link" href="/dashboard/listings">
            Visit your lending shelf <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="profile-details">
          <div className="profile-details-heading">
            <div>
              <span className="kicker">
                <LockKeyhole size={14} /> PRIVATE TO YOU
              </span>
              <h2>Saved handover details</h2>
              <p>Save these once and choose what to share for each loan.</p>
            </div>
            <span className="profile-private">Private</span>
          </div>
          {message && (
            <p role="alert" className="form-message error">
              {message}
            </p>
          )}
          {editing ? (
            <form
              className="profile-details-form"
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                setMessage("");
                void save(fields)
                  .then(() => setEditing(false))
                  .catch((err: Error) => setMessage(err.message))
                  .finally(() => setBusy(false));
              }}
            >
              {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => (
                <label key={key}>
                  {labels[key]}
                  {key.includes("nstructions") ? (
                    <textarea
                      placeholder={placeholders[key]}
                      value={fields[key]}
                      maxLength={500}
                      onChange={(e) =>
                        setFields({ ...fields, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <input
                      placeholder={placeholders[key]}
                      type={key === "phone" ? "tel" : "text"}
                      value={fields[key]}
                      maxLength={key === "phone" ? 20 : 200}
                      onChange={(e) =>
                        setFields({ ...fields, [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
              <div className="profile-actions">
                <button className="button-primary" disabled={busy}>
                  Save details
                </button>
                <button type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="profile-details-list">
                {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => {
                  const Icon = icons[key];
                  return (
                    <div key={key}>
                      <dt>
                        <Icon size={17} /> {labels[key]}
                      </dt>
                      <dd>{saved?.[key] || "Not added"}</dd>
                    </div>
                  );
                })}
              </dl>
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setFields(
                    saved ?? {
                      phone: "",
                      pickupPoint: "",
                      instructions: "",
                      returnInstructions: "",
                    },
                  );
                  setMessage("");
                  setEditing(true);
                }}
              >
                Edit saved details
              </button>
            </>
          )}
          <p className="profile-privacy-note">
            Only you can see these until you choose to share them with a loan
            participant.
          </p>
        </div>
      </div>
    </section>
  );
}
