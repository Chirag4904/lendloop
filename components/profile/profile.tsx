"use client";
import Link from "next/link";
import { useState, type ChangeEvent } from "react";
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
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import "@/components/borrowing/handover-fields.css";
import styles from "./profile.module.css";

const handoverFields = [
  {
    name: "phone",
    label: "Contact phone",
    icon: Phone,
    placeholder: "+91 98765 43210",
    type: "tel",
    maxLength: 20,
  },
  {
    name: "pickupPoint",
    label: "Pickup point",
    icon: MapPin,
    placeholder: "e.g. Main lobby or security desk",
    type: "text",
    maxLength: 200,
  },
  {
    name: "instructions",
    label: "Pickup instructions",
    icon: PackageOpen,
    placeholder: "e.g. Please call when you arrive",
    type: "textarea",
    maxLength: 500,
  },
  {
    name: "returnInstructions",
    label: "Return instructions",
    icon: RotateCcw,
    placeholder: "e.g. Leave it with the security desk",
    type: "textarea",
    maxLength: 500,
  },
] as const;

const emptyDetails = {
  phone: "",
  pickupPoint: "",
  instructions: "",
  returnInstructions: "",
};

export function Profile() {
  const { profile, loading, error } = useCurrentProfile();
  const societies = useQuery(api.societies.search, { term: "" });
  const saved = useQuery(api.handover.mine);
  const save = useMutation(api.handover.save);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(emptyDetails);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (error) return <p role="alert">{error}</p>;
  if (loading || !profile || saved === undefined)
    return <p role="status">Loading your profile…</p>;
  const society = societies?.find((s) => s._id === profile.societyId);
  return (
    <section>
      <div className={`app-heading mb-8 ${styles.heading}`}>
        <span className="kicker">YOUR PLACE IN THE NEIGHBORHOOD</span>
        <h1>My profile</h1>
        <p>Your neighborhood identity and private handover details.</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.identity}>
          <span className={styles.identityLabel}>YOUR LENDLOOP PROFILE</span>
          <div className={styles.avatar} aria-hidden="true">
            {profile.displayName.slice(0, 1)}
          </div>
          <h2>{profile.displayName}</h2>
          <p className={styles.society}>
            <Building2 size={18} /> {society?.name ?? "Your selected society"}
          </p>
          <div className={styles.trustBadges}>
            {profile.trustedLender && <span>Trusted Lender</span>}
            {profile.trustedBorrower && <span>Trusted Borrower</span>}
          </div>
          {(profile.trustedLender || profile.trustedBorrower) && (
            <p className={styles.trustNote}>
              Trust badges are assigned by LendLoop; they are not identity or
              residency verification.
            </p>
          )}
          <Link
            className={`text-link ${styles.shelfLink}`}
            href="/dashboard/listings"
          >
            Visit your lending shelf <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className={styles.details}>
          <div className={styles.detailsHeading}>
            <div>
              <span className="kicker flex items-center gap-1.5">
                <LockKeyhole size={14} /> PRIVATE TO YOU
              </span>
              <h2>Saved handover details</h2>
              <p>Save these once and choose what to share for each loan.</p>
            </div>
            <span className={styles.privateBadge}>Private</span>
          </div>
          {message && (
            <p role="alert" className="form-message error">
              {message}
            </p>
          )}
          {editing ? (
            <form
              className="handover-fields mt-6 grid"
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
              {handoverFields.map(
                ({ name, label, type, placeholder, maxLength }) => {
                  const control = {
                    placeholder,
                    maxLength,
                    value: fields[name],
                    onChange: (
                      event: ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) => {
                      const value = event.target.value;
                      setFields((current) => ({ ...current, [name]: value }));
                    },
                  };
                  return (
                    <label key={name}>
                      {label}
                      {type === "textarea" ? (
                        <textarea {...control} />
                      ) : (
                        <input {...control} type={type} />
                      )}
                    </label>
                  );
                },
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  className={styles.primaryAction}
                  disabled={busy}
                >
                  Save details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.cancelAction}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <dl className={styles.detailsList}>
                {handoverFields.map(({ name, label, icon: Icon }) => (
                  <div key={name}>
                    <dt>
                      <Icon size={17} /> {label}
                    </dt>
                    <dd>{saved?.[name] || "Not added"}</dd>
                  </div>
                ))}
              </dl>
              <Button
                type="button"
                className={styles.primaryAction}
                onClick={() => {
                  setFields(saved ?? emptyDetails);
                  setMessage("");
                  setEditing(true);
                }}
              >
                Edit saved details
              </Button>
            </>
          )}
          <p className={styles.privacyNote}>
            Only you can see these until you choose to share them with a loan
            participant.
          </p>
        </div>
      </div>
    </section>
  );
}
