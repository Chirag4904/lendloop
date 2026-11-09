"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ClipboardList,
  ArrowDownLeft,
  ArrowUpRight,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BorrowCalendar } from "./borrow-calendar";
import type { Id } from "@/convex/_generated/dataModel";

const money = (minor: number) =>
  minor === 0
    ? "Free"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(minor / 100);
const minorFromRupees = (value: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return 0;
  const [rupees, paise = ""] = value.split(".");
  return Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
};
const localToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const rentalDays = (start: string, end: string) =>
  start && end
    ? (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86_400_000 +
      1
    : 0;
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
const statusLabel = (status: string, overdue = false) =>
  overdue
    ? "Overdue"
    : ((
        {
          pending: "Pending",
          awaiting_borrower: "Your decision",
          approved: "Approved",
          declined: "Declined",
          cancelled: "Cancelled",
          reserved: "Reserved",
          return_pending: "Return awaiting confirmation",
          returned: "Returned",
        } as Record<string, string>
      )[status] ?? status);

const requestState = (status: string, loanStatus: string | null) =>
  loanStatus === "returned" || loanStatus === "return_pending"
    ? loanStatus
    : status;

export function RequestForm({
  toolId,
  dailyAmount,
}: {
  toolId: Id<"tools">;
  dailyAmount: number | null;
}) {
  const router = useRouter();
  const create = useMutation(api.requests.create);
  const [mode, setMode] = useState<"standard" | "offer">("standard"),
    [offer, setOffer] = useState(""),
    [startDate, setStart] = useState(""),
    [endDate, setEnd] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const count = rentalDays(startDate, endDate);
  const valid = startDate >= localToday() && count >= 1 && count <= 30;
  const offerMinor = minorFromRupees(offer);
  const validOffer =
    dailyAmount !== null &&
    Number.isSafeInteger(offerMinor) &&
    offerMinor > 0 &&
    offerMinor < dailyAmount;
  const available = useQuery(
    api.requests.availability,
    valid ? { toolId, startDate, endDate } : "skip",
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || available !== true || (mode === "offer" && !validOffer))
      return;
    setBusy(true);
    setError("");
    try {
      await create({
        toolId,
        startDate,
        endDate,
        offerMinor: mode === "offer" ? offerMinor : undefined,
      });
      router.push("/dashboard/requests");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="borrow-panel" aria-label="Borrow this item">
      <div className="borrow-panel-intro">
        <div className="borrow-rate">
          <strong>{dailyAmount === null ? "Free" : money(dailyAmount)}</strong>
          <span>{dailyAmount === null ? "to borrow" : "/ day"}</span>
        </div>
      </div>
      <div className="borrow-choices" role="group" aria-label="Request type">
        <button
          type="button"
          aria-pressed={mode === "standard"}
          onClick={() => {
            setMode("standard");
          }}
        >
          {dailyAmount === null
            ? "Request to Borrow"
            : "Request at Listed Price"}
        </button>
        {dailyAmount !== null && (
          <button
            type="button"
            aria-pressed={mode === "offer"}
            onClick={() => {
              setMode("offer");
            }}
          >
            Make an Offer
          </button>
        )}
      </div>
      <form id="request-form" onSubmit={submit} className="borrow-form">
        {mode === "offer" && (
          <>
            <label className="offer-field">
              Your daily offer in rupees
              <input
                type="text"
                inputMode="decimal"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="e.g. 600"
                aria-describedby="offer-help"
                required
              />
            </label>
            <p id="offer-help">
              Offer less than {money(dailyAmount!)} per day. The lender may
              accept, suggest one final price, or keep the listed price.
            </p>
            {offer && !validOffer && (
              <p role="alert" className="form-message error">
                Enter a positive offer below {money(dailyAmount!)} using at most
                two decimal places.
              </p>
            )}
          </>
        )}
        <BorrowCalendar
          toolId={toolId}
          today={localToday()}
          start={startDate}
          end={endDate}
          onSelect={(date) => {
            if (!startDate || endDate || date < startDate) {
              setStart(date);
              setEnd("");
            } else setEnd(date);
          }}
        />
        {count > 0 && (mode !== "offer" || validOffer) && (
          <p className="borrow-total">
            <strong>
              {count} {count === 1 ? "day" : "days"} ×{" "}
              {money(
                mode === "offer" && validOffer
                  ? offerMinor
                  : (dailyAmount ?? 0),
              )}{" "}
              / day ·{" "}
              {money(
                (mode === "offer" && validOffer
                  ? offerMinor
                  : (dailyAmount ?? 0)) * count,
              )}
            </strong>
            <span>
              {mode === "offer"
                ? "Your proposed total. The lender has not agreed yet."
                : "Estimated at the listed rate. No payment is collected."}
            </span>
          </p>
        )}
        {startDate && endDate && !valid && (
          <p role="alert" className="form-message error">
            Choose a date range of 1 to 30 days, starting today or later.
          </p>
        )}
        {valid && available === undefined && (
          <p role="status" className="borrow-checking">
            Checking these dates…
          </p>
        )}
        {valid && available === true && (
          <p role="status" className="borrow-available">
            Dates are available to request.
          </p>
        )}
        {valid && available === false && (
          <p role="alert" className="form-message error">
            These dates are already reserved. Choose another range.
          </p>
        )}
        {error && (
          <p role="alert" className="form-message error">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="button-primary"
          disabled={
            !valid ||
            available !== true ||
            busy ||
            (mode === "offer" && !validOffer)
          }
        >
          {busy ? "Sending…" : mode === "offer" ? "Send Offer" : "Send request"}
        </button>
        <p className="borrow-reassurance">
          The owner reviews your request. No payment is collected on LendLoop.
        </p>
      </form>
    </section>
  );
}

export function RequestList({ incoming }: { incoming: boolean }) {
  const rows = useQuery(
    incoming ? api.requests.incoming : api.requests.mine,
    {},
  );
  const approve = useMutation(api.requests.approve),
    decline = useMutation(api.requests.decline),
    cancel = useMutation(api.requests.cancel),
    respond = useMutation(api.requests.respondToOffer),
    finalPrice = useMutation(api.requests.respondToFinalPrice);
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [counterId, setCounterId] = useState<Id<"borrowRequests"> | null>(null),
    [counter, setCounter] = useState("");
  const [completedOnly, setCompletedOnly] = useState(false);
  const visibleRows = rows?.filter(
    (row) => !completedOnly || row.loanStatus === "returned",
  );
  const counterDialog = useRef<HTMLDialogElement>(null);
  const counterRow = rows?.find((row) => row.id === counterId);
  const counterMinor = minorFromRupees(counter);
  const counterValid =
    !!counterRow?.borrowerOfferMinor &&
    Number.isSafeInteger(counterMinor) &&
    counterMinor > counterRow.borrowerOfferMinor &&
    counterMinor < counterRow.listedRateMinor;
  async function act(
    id: Id<"borrowRequests">,
    action: "approve" | "decline" | "cancel",
  ) {
    if (
      (action === "decline" || action === "approve") &&
      !window.confirm(
        `${action === "approve" ? "Approve" : "Decline"} this request?`,
      )
    )
      return;
    setBusy(id);
    setError("");
    try {
      if (action === "approve") await approve({ requestId: id });
      else if (action === "decline") await decline({ requestId: id });
      else await cancel({ requestId: id });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function priceAction(
    id: Id<"borrowRequests">,
    decision:
      | "accepted_offer"
      | "countered"
      | "kept_listed_price"
      | "accept_final"
      | "decline_final",
    counterAmount?: number,
  ) {
    setBusy(id);
    setError("");
    try {
      if (decision === "accept_final" || decision === "decline_final")
        await finalPrice({
          requestId: id,
          accept: decision === "accept_final",
        });
      else
        await respond({ requestId: id, decision, counterMinor: counterAmount });
      if (decision === "countered") counterDialog.current?.close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="request-page">
      <div className="app-heading">
        <span className="kicker">
          {incoming ? "YOUR SHELF" : "YOUR BORROWING"}
        </span>
        <h1>My activity</h1>
        <p>
          {incoming
            ? "Respond to neighbors who want to borrow your items."
            : "Everything you’re borrowing, all in one place."}
        </p>
      </div>
      <nav className="activity-tabs" aria-label="Activity views">
        <Link
          href="/dashboard/requests"
          aria-current={!incoming ? "page" : undefined}
        >
          <ArrowDownLeft size={18} /> Things I’m borrowing
        </Link>
        <Link
          href="/dashboard/incoming"
          aria-current={incoming ? "page" : undefined}
        >
          <ArrowUpRight size={18} /> Requests for my items
        </Link>
      </nav>
      <div className="activity-controls">
        <button
          aria-pressed={!completedOnly}
          onClick={() => setCompletedOnly(false)}
        >
          All activity
        </button>
        <button
          aria-pressed={completedOnly}
          onClick={() => setCompletedOnly(true)}
        >
          Completed returns
        </button>
      </div>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
      {rows === undefined ? (
        <p role="status" className="catalog-state">
          Loading requests…
        </p>
      ) : visibleRows?.length === 0 ? (
        <div className="app-empty">
          <h2>
            {completedOnly
              ? "No completed returns yet"
              : incoming
                ? "No requests yet"
                : "Nothing requested yet"}
          </h2>
          <p>
            {incoming
              ? "New borrowing requests will appear here."
              : "Explore your neighborhood to find something useful."}
          </p>
          <Link className="button-primary" href="/dashboard">
            Explore tools
          </Link>
        </div>
      ) : (
        <div className="request-grid">
          {visibleRows?.map((row) => (
            <article className="request-card" key={row.id}>
              {row.coverUrl ? (
                <img className="request-cover" src={row.coverUrl} alt="" />
              ) : (
                <div
                  className="request-cover request-placeholder"
                  aria-hidden="true"
                >
                  ✳
                </div>
              )}
              <div className="request-body">
                <div className="request-card-top">
                  <span
                    className={`request-status status-${row.status === "approved" && row.loanStatus !== "returned" && row.endDate < localToday() ? "overdue" : requestState(row.status, row.loanStatus)}`}
                  >
                    {statusLabel(
                      row.status === "awaiting_borrower" && incoming
                        ? "Waiting for borrower"
                        : requestState(row.status, row.loanStatus),
                      row.status === "approved" &&
                        row.loanStatus !== "returned" &&
                        row.endDate < localToday(),
                    )}
                  </span>
                  <span>
                    {dateLabel(row.startDate)} – {dateLabel(row.endDate)}
                  </span>
                </div>
                <h2>
                  <Link href={`/dashboard/tools/${row.toolId}`}>
                    {row.toolName}
                  </Link>
                </h2>
                <p>
                  {incoming ? "From" : "Shared by"} {row.otherName}
                  {row.trusted
                    ? ` · Trusted ${incoming ? "Borrower" : "Lender"}`
                    : ""}
                </p>
                <p>
                  {row.days} {row.days === 1 ? "day" : "days"} ·{" "}
                  {money(
                    (row.status === "pending" && row.borrowerOfferMinor !== null
                      ? row.borrowerOfferMinor
                      : row.status === "awaiting_borrower"
                        ? (row.lenderCounterMinor ?? row.listedRateMinor)
                        : row.rateMinor) * row.days,
                  )}{" "}
                  {row.status === "approved" ? "agreed" : "proposed"}
                </p>
                <ol className="request-progress" aria-label="Recorded progress">
                  <li>Requested</li>
                  <li>
                    {row.status === "approved"
                      ? "Agreement confirmed"
                      : statusLabel(
                          row.status === "awaiting_borrower" && incoming
                            ? "Waiting for borrower"
                            : requestState(row.status, row.loanStatus),
                          false,
                        )}
                  </li>
                  {row.loanStatus === "returned" ? (
                    <li>Returned</li>
                  ) : row.loanStatus === "return_pending" ? (
                    <li>Return awaiting confirmation</li>
                  ) : null}
                </ol>
                {row.borrowerOfferMinor !== null && (
                  <section
                    className="negotiation-timeline"
                    aria-label="Price conversation"
                  >
                    <div className="negotiation-heading">
                      <span className="negotiation-icon">₹</span>
                      <div>
                        <strong>Price conversation</strong>
                        <p>Offers and responses, in order</p>
                      </div>
                    </div>
                    <ol>
                      <li>
                        <span>
                          Borrower offered{" "}
                          <strong>{money(row.borrowerOfferMinor)} / day</strong>
                        </span>
                        <time dateTime={new Date(row.createdAt).toISOString()}>
                          {new Date(row.createdAt).toLocaleString("en-IN")}
                        </time>
                      </li>
                      {row.priceDecision === "accepted_offer" && (
                        <li>
                          <span>Lender accepted the offer</span>
                          <time
                            dateTime={new Date(
                              row.lenderRespondedAt!,
                            ).toISOString()}
                          >
                            {new Date(row.lenderRespondedAt!).toLocaleString(
                              "en-IN",
                            )}
                          </time>
                        </li>
                      )}
                      {row.priceDecision === "countered" && (
                        <li>
                          <span>
                            Lender suggested{" "}
                            <strong>
                              {money(row.lenderCounterMinor!)} / day
                            </strong>
                          </span>
                          <time
                            dateTime={new Date(
                              row.lenderRespondedAt!,
                            ).toISOString()}
                          >
                            {new Date(row.lenderRespondedAt!).toLocaleString(
                              "en-IN",
                            )}
                          </time>
                        </li>
                      )}
                      {row.priceDecision === "kept_listed_price" && (
                        <li>
                          <span>
                            Lender kept the listed price of{" "}
                            <strong>{money(row.listedRateMinor)} / day</strong>
                          </span>
                          <time
                            dateTime={new Date(
                              row.lenderRespondedAt!,
                            ).toISOString()}
                          >
                            {new Date(row.lenderRespondedAt!).toLocaleString(
                              "en-IN",
                            )}
                          </time>
                        </li>
                      )}
                      {row.status === "approved" && row.borrowerRespondedAt && (
                        <li>
                          <span>
                            Borrower accepted{" "}
                            <strong>{money(row.rateMinor)} / day</strong>
                          </span>
                          <time
                            dateTime={new Date(
                              row.borrowerRespondedAt,
                            ).toISOString()}
                          >
                            {new Date(row.borrowerRespondedAt).toLocaleString(
                              "en-IN",
                            )}
                          </time>
                        </li>
                      )}
                      {row.status === "approved" && (
                        <li>
                          <span>
                            Rental confirmed ·{" "}
                            <strong>{money(row.totalMinor)} total</strong>
                          </span>
                        </li>
                      )}
                      {row.status === "cancelled" && (
                        <li>Negotiation closed</li>
                      )}
                    </ol>
                    {row.status === "pending" && (
                      <p>
                        {incoming
                          ? `Listed at ${money(row.listedRateMinor)} / day · ${row.days} days · ${money(row.borrowerOfferMinor * row.days)} offered`
                          : "Waiting for lender to respond."}
                      </p>
                    )}
                    {row.status === "awaiting_borrower" && (
                      <p>
                        {incoming
                          ? "Waiting for the borrower’s decision."
                          : `${row.priceDecision === "kept_listed_price" ? `The lender would prefer to keep the original price of ${money(row.listedRateMinor)} / day. You can still proceed if that works for you. ` : ""}Listed ${money(row.listedRateMinor)} / day · offered ${money(row.borrowerOfferMinor)} / day · final ${money(row.lenderCounterMinor ?? row.listedRateMinor)} / day · ${money((row.lenderCounterMinor ?? row.listedRateMinor) * row.days)} total`}
                      </p>
                    )}
                  </section>
                )}
                {row.conflict && (
                  <p className="request-conflict" role="status">
                    These dates overlap another confirmed loan. This request
                    cannot be approved.
                  </p>
                )}
                {row.status === "declined" && !incoming && (
                  <p>
                    This request couldn’t be accommodated. You can explore
                    another item.
                  </p>
                )}
                <div className="request-actions">
                  {row.loanId && (
                    <Link
                      className="button-primary"
                      href={`/dashboard/loans/${row.loanId}`}
                    >
                      View loan
                    </Link>
                  )}
                  {row.status === "awaiting_borrower" && !incoming && (
                    <>
                      <button
                        type="button"
                        className="button-primary"
                        disabled={!!busy}
                        onClick={() => void priceAction(row.id, "accept_final")}
                      >
                        {row.priceDecision === "countered"
                          ? `Accept ${money(row.lenderCounterMinor!)} / day`
                          : `Continue at ${money(row.listedRateMinor)} / day`}
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() =>
                          void priceAction(row.id, "decline_final")
                        }
                      >
                        Not Right Now
                      </button>
                    </>
                  )}
                  {row.status === "pending" &&
                    (incoming ? (
                      <>
                        {row.borrowerOfferMinor !== null ? (
                          <>
                            <button
                              type="button"
                              className="button-primary"
                              disabled={!!busy || row.conflict}
                              onClick={() =>
                                void priceAction(row.id, "accepted_offer")
                              }
                            >
                              Accept Offer
                            </button>
                            <button
                              type="button"
                              disabled={
                                !!busy ||
                                row.listedRateMinor - row.borrowerOfferMinor <=
                                  1
                              }
                              onClick={() => {
                                setCounterId(row.id);
                                setCounter("");
                                counterDialog.current?.showModal();
                              }}
                            >
                              Suggest Another Price
                            </button>
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() =>
                                void priceAction(row.id, "kept_listed_price")
                              }
                            >
                              Keep Listed Price
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="button-primary"
                            disabled={!!busy || row.conflict}
                            onClick={() => void act(row.id, "approve")}
                          >
                            Approve Request
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void act(row.id, "decline")}
                        >
                          Decline Request
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void act(row.id, "cancel")}
                      >
                        Cancel request
                      </button>
                    ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <dialog
        ref={counterDialog}
        className="borrow-dialog"
        aria-labelledby="counter-title"
        onClose={() => setCounterId(null)}
      >
        {counterRow && (
          <form
            className="borrow-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (counterValid)
                void priceAction(counterRow.id, "countered", counterMinor);
            }}
          >
            <div className="borrow-form-heading">
              <h2 id="counter-title">Suggest Another Price</h2>
              <button
                type="button"
                aria-label="Close counteroffer"
                onClick={() => counterDialog.current?.close()}
              >
                ×
              </button>
            </div>
            <p>
              Borrower offered {money(counterRow.borrowerOfferMinor!)} / day.
              Listed price is {money(counterRow.listedRateMinor)} / day. This is
              your one final counteroffer.
            </p>
            <label className="offer-field">
              Your final daily price in rupees
              <input
                type="text"
                inputMode="decimal"
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                required
              />
            </label>
            {counter && !counterValid && (
              <p role="alert" className="form-message error">
                Enter a price strictly between the offer and listed price, to
                two decimal places.
              </p>
            )}
            {counterValid && (
              <p>
                {counterRow.days} days · {money(counterMinor * counterRow.days)}{" "}
                total
              </p>
            )}
            <button
              type="submit"
              className="button-primary"
              disabled={!counterValid || !!busy}
            >
              Send final price
            </button>
          </form>
        )}
      </dialog>
    </section>
  );
}

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
    <article className="loan-page">
      <Link
        className="text-link"
        href={loan.isLender ? "/dashboard/incoming" : "/dashboard/requests"}
      >
        ← Back to requests
      </Link>
      <div className="loan-hero">
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
          <p className="loan-date-line">
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
      <div className="loan-columns">
        <section className="loan-card loan-return-card">
          <div className="loan-card-heading">
            <span className="loan-heading-icon">
              <RotateCcw size={20} />
            </span>
            <div>
              <span className="loan-card-eyebrow">THE NEXT STEP</span>
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
              <button
                type="button"
                className="button-primary"
                disabled={busy}
                onClick={() => void action("confirm")}
              >
                Confirm Return
              </button>
            </>
          ) : (
            <>
              <p>
                {loan.status === "return_pending"
                  ? "Waiting for the lender to confirm the return."
                  : "Let the lender know after you hand the item back."}
              </p>
              {loan.status === "reserved" && (
                <button
                  type="button"
                  className="button-primary"
                  disabled={busy}
                  onClick={() => void action("report")}
                >
                  I’ve Returned the Item
                </button>
              )}
            </>
          )}
        </section>
        <section className="loan-card loan-handover-card">
          <div className="loan-card-heading">
            <span className="loan-heading-icon">
              <LockKeyhole size={20} />
            </span>
            <div>
              <span className="loan-card-eyebrow">JUST BETWEEN YOU TWO</span>
              <h2>Handover details</h2>
            </div>
          </div>
          <p>
            Only you and the other participant can see details shared here. A
            pickup point is enough; a home address is optional.
          </p>
          {sharedNotice && (
            <p className="handover-success" role="status">
              <Check size={17} /> {sharedNotice}
            </p>
          )}
          {loan.details.length ? (
            loan.details.map((d) => (
              <div className="handover-entry" key={d.authorId}>
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
            <div className="handover-empty">
              <strong>Nothing shared yet</strong>
              <p>Share a way to connect or a convenient pickup point.</p>
            </div>
          )}
          {!editing &&
            savedDetails &&
            Object.values(savedDetails).some(Boolean) && (
              <div className="share-saved-details">
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
                      <label key={key} className="share-detail-option">
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
                <button
                  type="button"
                  className="button-primary"
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
                </button>
              </div>
            )}
          {!editing ? (
            <button
              type="button"
              className="handover-edit-button"
              onClick={() => {
                setPhone(mine?.phone ?? "");
                setPickupPoint(mine?.pickupPoint ?? "");
                setInstructions(mine?.instructions ?? "");
                setReturnInstructions(mine?.returnInstructions ?? "");
                setEditing(true);
              }}
            >
              Edit my details
            </button>
          ) : (
            <form
              className="handover-form"
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
              <div className="handover-actions">
                <button
                  type="submit"
                  className="button-primary"
                  disabled={busy}
                >
                  Save details
                </button>
                <button type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
              <p>Clear all fields and save to remove your details.</p>
            </form>
          )}
        </section>
        <section className="loan-card loan-history">
          <div className="loan-card-heading">
            <span className="loan-heading-icon">
              <ClipboardList size={20} />
            </span>
            <div>
              <span className="loan-card-eyebrow">YOUR LOAN JOURNEY</span>
              <h2>Activity</h2>
            </div>
          </div>
          <ol>
            <li>
              <span className="timeline-dot">
                <Check size={13} />
              </span>
              <strong>Request sent</strong>
              <time>
                {new Date(loan.requestCreatedAt).toLocaleString("en-IN")}
              </time>
            </li>
            <li>
              <span className="timeline-dot">
                <Check size={13} />
              </span>
              <strong>Approved</strong>
              <time>{new Date(loan.approvedAt).toLocaleString("en-IN")}</time>
            </li>
            {loan.returnReportedAt && (
              <li>
                <span className="timeline-dot">
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
                <span className="timeline-dot">
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
              <p className="delivery-explanation">
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
