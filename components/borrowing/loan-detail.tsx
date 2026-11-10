"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { dateLabel, money, statusLabel } from "./borrowing-display";
import styles from "./loan-detail.module.css";

export function LoanDetail({ loanId }: { loanId: Id<"loans"> }) {
  const loan = useQuery(api.loans.detail, { loanId });
  const automation = useQuery(api.automation.loanActivity, { loanId });
  const savedDetails = useQuery(api.handover.mine);
  const report = useMutation(api.loans.reportReturn),
    confirm = useMutation(api.loans.confirmReturn),
    save = useMutation(api.loans.saveHandover);
  const [phone, setPhone] = useState(""),
    [pickupPoint, setPickupPoint] = useState(""),
    [instructions, setInstructions] = useState(""),
    [returnInstructions, setReturnInstructions] = useState(""),
    [selected, setSelected] = useState<string[] | null>(null),
    [sharedSnapshot, setSharedSnapshot] = useState<{
      values: {
        phone: string;
        pickupPoint: string;
        instructions: string;
        returnInstructions: string;
      };
      previousUpdatedAt: number | null;
    } | null>(null),
    [sharedNotice, setSharedNotice] = useState(""),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (loan === undefined) return <p role="status">Loading loan…</p>;
  if (loan === null)
    return (
      <div className="app-empty">
        <h1>Loan unavailable</h1>
        <Link href="/dashboard/requests">My Requests</Link>
      </div>
    );
  const mine = loan.details.find((d) => d.isMine);
  const keys = [
    "phone",
    "pickupPoint",
    "instructions",
    "returnInstructions",
  ] as const;
  const baseline = (sharedSnapshot &&
  sharedSnapshot.previousUpdatedAt === (mine?.updatedAt ?? null)
    ? sharedSnapshot.values
    : null) ?? {
    phone: mine?.phone ?? "",
    pickupPoint: mine?.pickupPoint ?? "",
    instructions: mine?.instructions ?? "",
    returnInstructions: mine?.returnInstructions ?? "",
  };
  const checked =
    selected ??
    keys.filter(
      (key) => !!savedDetails?.[key] && savedDetails[key] === baseline[key],
    );
  const proposed = {
    phone: checked.includes("phone") ? (savedDetails?.phone ?? "") : "",
    pickupPoint: checked.includes("pickupPoint")
      ? (savedDetails?.pickupPoint ?? "")
      : "",
    instructions: checked.includes("instructions")
      ? (savedDetails?.instructions ?? "")
      : "",
    returnInstructions: checked.includes("returnInstructions")
      ? (savedDetails?.returnInstructions ?? "")
      : "",
  };
  const hasChanges = keys.some((key) => proposed[key] !== baseline[key]);
  async function action(kind: "report" | "confirm" | "save") {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "report") await report({ loanId });
      else if (kind === "confirm") await confirm({ loanId });
      else {
        await save({
          loanId,
          phone,
          pickupPoint,
          instructions,
          returnInstructions,
        });
        setSharedSnapshot(null);
        setSelected(null);
        setSharedNotice(
          "Your handover details have been updated for this loan.",
        );
        setEditing(false);
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="mx-auto max-w-[1040px]">
      <Link
        className="text-link"
        href={loan.isLender ? "/dashboard/incoming" : "/dashboard/requests"}
      >
        ← Back to requests
      </Link>
      <div className={styles.hero}>
        {loan.coverUrl && <img src={loan.coverUrl} alt="" />}
        <div>
          <span className="kicker">
            CONFIRMED LOAN ·{" "}
            {loan.isLender ? "YOU ARE THE LENDER" : "YOU ARE THE BORROWER"}
          </span>
          <h1>{loan.toolName}</h1>
          <span
            className={`request-status status-${loan.overdue ? "overdue" : loan.status}`}
          >
            {statusLabel(loan.status, loan.overdue)}
          </span>
          <p className={`flex items-center gap-2 ${styles.dateLine}`}>
            <CalendarDays size={16} />
            {dateLabel(loan.startDate)} – {dateLabel(loan.endDate)} ·{" "}
            {loan.days} {loan.days === 1 ? "day" : "days"}
          </p>
          <strong>
            {money(loan.totalMinor)} agreed · {money(loan.rateMinor)} / day
          </strong>
          <p>
            Lender: {loan.lenderName}
            <br />
            Borrower: {loan.borrowerName}
          </p>
        </div>
      </div>
      {message && (
        <p role="alert" className="form-message error">
          {message}
        </p>
      )}
      <div className={styles.columns}>
        <section className={`${styles.card} ${styles.returnCard}`}>
          <div className={styles.heading}>
            <span className={styles.headingIcon}>
              <RotateCcw size={20} />
            </span>
            <div>
              <span className={styles.eyebrow}>THE NEXT STEP</span>
              <h2>Return</h2>
            </div>
          </div>
          {loan.status === "returned" ? (
            <p>Return confirmed. This loan is complete.</p>
          ) : loan.isLender ? (
            <>
              <p>
                {loan.status === "return_pending"
                  ? "The borrower reported handing back the item."
                  : "Confirm the return when you have the item back."}
              </p>
              <Button
                type="button"
                className={`button-primary ${styles.returnAction}`}
                disabled={busy}
                onClick={() => void action("confirm")}
              >
                Confirm Return
              </Button>
            </>
          ) : (
            <>
              <p>
                {loan.status === "return_pending"
                  ? "Waiting for the lender to confirm the return."
                  : "Let the lender know after you hand the item back."}
              </p>
              {loan.status === "reserved" && (
                <Button
                  type="button"
                  className={`button-primary ${styles.returnAction}`}
                  disabled={busy}
                  onClick={() => void action("report")}
                >
                  I’ve Returned the Item
                </Button>
              )}
            </>
          )}
        </section>
        <section className={`${styles.card} ${styles.handoverCard}`}>
          <div className={styles.heading}>
            <span className={styles.headingIcon}>
              <LockKeyhole size={20} />
            </span>
            <div>
              <span className={styles.eyebrow}>JUST BETWEEN YOU TWO</span>
              <h2>Handover details</h2>
            </div>
          </div>
          <p>
            Only you and the other participant can see details shared here. A
            pickup point is enough; a home address is optional.
          </p>
          {sharedNotice && (
            <p className={styles.handoverSuccess} role="status">
              <Check size={17} /> {sharedNotice}
            </p>
          )}
          {loan.details.length ? (
            loan.details.map((d) => (
              <div className={styles.handoverEntry} key={d.authorId}>
                <strong>{d.authorName} shared</strong>
                {d.phone && <p>Phone: {d.phone}</p>}
                {d.pickupPoint && <p>Pickup point: {d.pickupPoint}</p>}
                {d.instructions && <p>Instructions: {d.instructions}</p>}
                {d.returnInstructions && (
                  <p>Return instructions: {d.returnInstructions}</p>
                )}
              </div>
            ))
          ) : (
            <div className={styles.handoverEmpty}>
              <strong>Nothing shared yet</strong>
              <p>Share a way to connect or a convenient pickup point.</p>
            </div>
          )}
          {!editing &&
            savedDetails &&
            Object.values(savedDetails).some(Boolean) && (
              <div className={styles.shareDetails}>
                <h3>Share your saved details</h3>
                <p>
                  Choose what to share with{" "}
                  {loan.isLender ? loan.borrowerName : loan.lenderName} for this
                  loan. Saving replaces your previously shared details.
                </p>
                {(
                  [
                    ["phone", "Contact phone"],
                    ["pickupPoint", "Pickup point"],
                    ["instructions", "Pickup instructions"],
                    ["returnInstructions", "Return instructions"],
                  ] as const
                ).map(
                  ([key, label]) =>
                    savedDetails[key] && (
                      <label key={key} className={styles.shareOption}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={checked.includes(key)}
                          onChange={(e) => {
                            setSharedNotice("");
                            setSelected(
                              e.target.checked
                                ? [...checked, key]
                                : checked.filter((item) => item !== key),
                            );
                          }}
                        />
                        <span>
                          <strong>{label}</strong>
                          <small>{savedDetails[key]}</small>
                        </span>
                      </label>
                    ),
                )}
                <Button
                  type="button"
                  className={`button-primary ${styles.shareAction}`}
                  disabled={busy || !hasChanges}
                  onClick={() => {
                    setBusy(true);
                    setMessage("");
                    void save({ loanId, ...proposed })
                      .then(() => {
                        setSharedSnapshot({
                          values: proposed,
                          previousUpdatedAt: mine?.updatedAt ?? null,
                        });
                        setSharedNotice(
                          checked.length
                            ? `Shared with ${loan.isLender ? loan.borrowerName : loan.lenderName} for this loan.`
                            : "Your details are no longer shared for this loan.",
                        );
                      })
                      .catch((err: Error) => setMessage(err.message))
                      .finally(() => setBusy(false));
                  }}
                >
                  {busy
                    ? "Saving…"
                    : mine || sharedSnapshot
                      ? "Update shared details"
                      : "Share selected details"}
                </Button>
              </div>
            )}
          {!editing ? (
            <Button
              type="button"
              variant="outline"
              className={styles.editAction}
              onClick={() => {
                setPhone(mine?.phone ?? "");
                setPickupPoint(mine?.pickupPoint ?? "");
                setInstructions(mine?.instructions ?? "");
                setReturnInstructions(mine?.returnInstructions ?? "");
                setEditing(true);
              }}
            >
              Edit my details
            </Button>
          ) : (
            <form
              className={`handover-fields grid ${styles.handoverForm}`}
              onSubmit={(e) => {
                e.preventDefault();
                void action("save");
              }}
            >
              <label>
                Contact phone (optional)
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </label>
              <label>
                Pickup point (optional)
                <input
                  placeholder="e.g. Main lobby or security desk"
                  value={pickupPoint}
                  onChange={(e) => setPickupPoint(e.target.value)}
                  maxLength={200}
                />
              </label>
              <label>
                Pickup instructions (optional)
                <textarea
                  placeholder="e.g. Please call when you arrive"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={500}
                />
              </label>
              <label>
                Return instructions (optional)
                <textarea
                  placeholder="e.g. Leave it with the security desk"
                  value={returnInstructions}
                  onChange={(e) => setReturnInstructions(e.target.value)}
                  maxLength={500}
                />
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  className="button-primary"
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
              <p>Clear all fields and save to remove your details.</p>
            </form>
          )}
        </section>
        <section className={`${styles.card} ${styles.history}`}>
          <div className={styles.heading}>
            <span className={styles.headingIcon}>
              <ClipboardList size={20} />
            </span>
            <div>
              <span className={styles.eyebrow}>YOUR LOAN JOURNEY</span>
              <h2>Activity</h2>
            </div>
          </div>
          <ol className={styles.timeline}>
            <li>
              <span className={styles.timelineDot}>
                <Check size={13} />
              </span>
              <strong>Request sent</strong>
              <time>
                {new Date(loan.requestCreatedAt).toLocaleString("en-IN")}
              </time>
            </li>
            <li>
              <span className={styles.timelineDot}>
                <Check size={13} />
              </span>
              <strong>Approved</strong>
              <time>{new Date(loan.approvedAt).toLocaleString("en-IN")}</time>
            </li>
            {loan.returnReportedAt && (
              <li>
                <span className={styles.timelineDot}>
                  <Check size={13} />
                </span>
                <strong>Borrower reported return</strong>
                <time>
                  {new Date(loan.returnReportedAt).toLocaleString("en-IN")}
                </time>
              </li>
            )}
            {loan.returnedAt && (
              <li>
                <span className={styles.timelineDot}>
                  <Check size={13} />
                </span>
                <strong>Lender confirmed return</strong>
                <time>{new Date(loan.returnedAt).toLocaleString("en-IN")}</time>
              </li>
            )}
          </ol>
          {automation && automation.length > 0 && (
            <>
              <h3>Notification delivery</h3>
              <p className={styles.deliveryExplanation}>
                These show notification delivery, not the status of your loan or
                return.
              </p>
              <ol className="automation-list">
                {automation.map((row) => (
                  <li key={row.id}>
                    <strong>{row.message}</strong>
                    <span className={`automation-state state-${row.status}`}>
                      {row.status === "delivered" || row.status === "sent"
                        ? "Sent"
                        : row.status === "retry_pending"
                          ? "Retry pending"
                          : row.status === "failed"
                            ? "Delivery failed"
                            : row.status}
                    </span>
                    <time dateTime={new Date(row.at).toISOString()}>
                      {new Date(row.at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </article>
  );
}
