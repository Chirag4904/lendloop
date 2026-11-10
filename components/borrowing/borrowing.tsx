"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { BorrowCalendar } from "./borrow-calendar";
import { dateLabel, money, statusLabel } from "./borrowing-display";
import type { Id } from "@/convex/_generated/dataModel";
import activity from "./activity.module.css";
import requestForm from "./request-form.module.css";
import "./borrowing.css";

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
    <section className={requestForm.panel} aria-label="Borrow this item">
      <div
        className={`flex items-baseline gap-1.5 whitespace-nowrap ${requestForm.rate}`}
      >
        <strong>{dailyAmount === null ? "Free" : money(dailyAmount)}</strong>
        <span>{dailyAmount === null ? "to borrow" : "/ day"}</span>
      </div>
      <div
        className={`mt-[18px] flex flex-wrap rounded-xl bg-[var(--brand-paper)] p-1 ${requestForm.choices}`}
        role="group"
        aria-label="Request type"
      >
        <Button
          type="button"
          variant="ghost"
          aria-pressed={mode === "standard"}
          onClick={() => {
            setMode("standard");
          }}
        >
          {dailyAmount === null
            ? "Request to Borrow"
            : "Request at Listed Price"}
        </Button>
        {dailyAmount !== null && (
          <Button
            type="button"
            variant="ghost"
            aria-pressed={mode === "offer"}
            onClick={() => {
              setMode("offer");
            }}
          >
            Make an Offer
          </Button>
        )}
      </div>
      <form
        id="request-form"
        onSubmit={submit}
        className={`mt-[18px] ${requestForm.form}`}
      >
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
          <p className={requestForm.total}>
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
          <p role="status" className={requestForm.availability}>
            Checking these dates…
          </p>
        )}
        {valid && available === true && (
          <p
            role="status"
            className={`${requestForm.availability} ${requestForm.available}`}
          >
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
        <Button
          type="submit"
          className={`mt-3.5 w-full ${requestForm.submit}`}
          disabled={
            !valid ||
            available !== true ||
            busy ||
            (mode === "offer" && !validOffer)
          }
        >
          {busy ? "Sending…" : mode === "offer" ? "Send Offer" : "Send request"}
        </Button>
        <p className={requestForm.reassurance}>
          The owner reviews your request. No payment is collected on LendLoop.
        </p>
      </form>
    </section>
  );
}

export function RequestList({ incoming }: { incoming: boolean }) {
  const [history, setHistory] = useState(false);
  const hash = useSyncExternalStore(
    (callback) => {
      window.addEventListener("hashchange", callback);
      return () => window.removeEventListener("hashchange", callback);
    },
    () => window.location.hash,
    () => "",
  );
  const [dismissTarget, setDismissTarget] = useState(false);
  const targetId =
    !dismissTarget && hash.startsWith("#request-") ? hash.slice(9) : "";
  const target = useQuery(
    api.requests.activityTarget,
    targetId ? { incoming, id: targetId } : "skip",
  );
  const showHistory = target
    ? target.status === "declined" ||
      target.status === "cancelled" ||
      target.loanStatus === "returned"
    : history;
  const pending = usePaginatedQuery(
    api.requests.activityPage,
    !showHistory ? { incoming, kind: "pending" } : "skip",
    { initialNumItems: 10 },
  );
  const awaiting = usePaginatedQuery(
    api.requests.activityPage,
    !showHistory ? { incoming, kind: "awaiting_borrower" } : "skip",
    { initialNumItems: 10 },
  );
  const reserved = usePaginatedQuery(
    api.requests.activityPage,
    !showHistory ? { incoming, kind: "reserved" } : "skip",
    { initialNumItems: 10 },
  );
  const returnPending = usePaginatedQuery(
    api.requests.activityPage,
    !showHistory ? { incoming, kind: "return_pending" } : "skip",
    { initialNumItems: 10 },
  );
  const returned = usePaginatedQuery(
    api.requests.activityPage,
    showHistory ? { incoming, kind: "returned" } : "skip",
    { initialNumItems: 10 },
  );
  const declined = usePaginatedQuery(
    api.requests.activityPage,
    showHistory ? { incoming, kind: "declined" } : "skip",
    { initialNumItems: 10 },
  );
  const cancelled = usePaginatedQuery(
    api.requests.activityPage,
    showHistory ? { incoming, kind: "cancelled" } : "skip",
    { initialNumItems: 10 },
  );
  const pages = showHistory
    ? [returned, declined, cancelled]
    : [pending, awaiting, reserved, returnPending];
  const loading = pages.some((page) => page.status === "LoadingFirstPage");
  const priority = (row: (typeof pending.results)[number]) =>
    (incoming && row.status === "pending") ||
    (!incoming && row.status === "awaiting_borrower") ||
    (incoming && row.loanStatus === "return_pending")
      ? 0
      : 1;
  const rows = pages
    .flatMap((page) => page.results)
    .sort((a, b) => priority(a) - priority(b) || b.createdAt - a.createdAt);
  const visibleRows =
    target && !rows.some((row) => row.id === target.id)
      ? [target, ...rows]
      : rows;
  const approve = useMutation(api.requests.approve),
    decline = useMutation(api.requests.decline),
    cancel = useMutation(api.requests.cancel),
    respond = useMutation(api.requests.respondToOffer),
    finalPrice = useMutation(api.requests.respondToFinalPrice);
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [counterId, setCounterId] = useState<Id<"borrowRequests"> | null>(null),
    [counter, setCounter] = useState("");
  const scrolledToRequest = useRef(false);
  useEffect(() => {
    if (scrolledToRequest.current || !targetId) return;
    const element = document.getElementById(`request-${targetId}`);
    if (element) {
      element.scrollIntoView();
      scrolledToRequest.current = true;
    }
  }, [targetId, target, loading, showHistory]);
  const counterDialog = useRef<HTMLDialogElement>(null);
  const counterRow = visibleRows.find((row) => row.id === counterId);
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
    <section className={activity.page}>
      <div className={`app-heading ${activity.heading}`}>
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
      <nav className={activity.tabs} aria-label="Activity views">
        <Button asChild variant="ghost">
          <Link
            href="/dashboard/requests"
            aria-current={!incoming ? "page" : undefined}
          >
            <ArrowDownLeft size={18} /> Things I’m borrowing
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href="/dashboard/incoming"
            aria-current={incoming ? "page" : undefined}
          >
            <ArrowUpRight size={18} /> Requests for my items
          </Link>
        </Button>
      </nav>
      <div className={`my-6 flex items-center gap-2.5 ${activity.filters}`}>
        <Button
          type="button"
          variant="outline"
          aria-pressed={!showHistory}
          onClick={() => {
            setHistory(false);
            setDismissTarget(true);
          }}
        >
          Active
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-pressed={showHistory}
          onClick={() => {
            setHistory(true);
            setDismissTarget(true);
          }}
        >
          History
        </Button>
      </div>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="catalog-state">
          Loading requests…
        </p>
      ) : visibleRows.length === 0 ? (
        <div className="app-empty">
          <h2>
            {showHistory
              ? "No past activity yet"
              : incoming
                ? "No requests yet"
                : "Nothing requested yet"}
          </h2>
          <p>
            {showHistory
              ? "Completed and closed requests will appear here."
              : incoming
                ? "New borrowing requests will appear here."
                : "Explore your neighborhood to find something useful."}
          </p>
          <Button asChild className={activity.largeAction}>
            <Link href="/dashboard">Explore tools</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleRows.map((row) => {
            const requestStatus = requestState(row.status, row.loanStatus);
            const roleStatus =
              row.status === "awaiting_borrower" && incoming
                ? "Waiting for borrower"
                : requestStatus;
            const overdue =
              row.status === "approved" &&
              row.loanStatus !== "returned" &&
              row.endDate < localToday();
            return (
              <article
                id={`request-${row.id}`}
                className={activity.card}
                key={row.id}
              >
                {row.coverUrl ? (
                  <img className={activity.cover} src={row.coverUrl} alt="" />
                ) : (
                  <div
                    className={`${activity.cover} ${activity.placeholder}`}
                    aria-hidden="true"
                  >
                    ✳
                  </div>
                )}
                <div className={activity.body}>
                  <div className={activity.summary}>
                    <span
                      className={`request-status status-${overdue ? "overdue" : requestStatus}`}
                    >
                      {statusLabel(roleStatus, overdue)}
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
                      (row.status === "pending" &&
                      row.borrowerOfferMinor !== null
                        ? row.borrowerOfferMinor
                        : row.status === "awaiting_borrower"
                          ? (row.lenderCounterMinor ?? row.listedRateMinor)
                          : row.rateMinor) * row.days,
                    )}{" "}
                    {row.status === "approved" ? "agreed" : "proposed"}
                  </p>
                  <ol
                    className={activity.progress}
                    aria-label="Recorded progress"
                  >
                    <li>Requested</li>
                    <li>
                      {row.status === "approved"
                        ? "Agreement confirmed"
                        : statusLabel(roleStatus)}
                    </li>
                    {row.loanStatus === "returned" ? (
                      <li>Returned</li>
                    ) : row.loanStatus === "return_pending" ? (
                      <li>Return awaiting confirmation</li>
                    ) : null}
                  </ol>
                  {row.borrowerOfferMinor !== null && (
                    <section
                      className={activity.timeline}
                      aria-label="Price conversation"
                    >
                      <div
                        className={`flex items-center gap-3 ${activity.timelineHeading}`}
                      >
                        <span className={activity.timelineIcon}>₹</span>
                        <div>
                          <strong>Price conversation</strong>
                          <p>Offers and responses, in order</p>
                        </div>
                      </div>
                      <ol>
                        <li>
                          <span>
                            Borrower offered{" "}
                            <strong>
                              {money(row.borrowerOfferMinor)} / day
                            </strong>
                          </span>
                          <time
                            dateTime={new Date(row.createdAt).toISOString()}
                          >
                            {new Date(row.createdAt).toLocaleString("en-IN")}
                          </time>
                        </li>
                        {row.priceDecision && (
                          <li>
                            {row.priceDecision === "accepted_offer" ? (
                              <span>Lender accepted the offer</span>
                            ) : row.priceDecision === "countered" ? (
                              <span>
                                Lender suggested{" "}
                                <strong>
                                  {money(row.lenderCounterMinor!)} / day
                                </strong>
                              </span>
                            ) : (
                              <span>
                                Lender kept the listed price of{" "}
                                <strong>
                                  {money(row.listedRateMinor)} / day
                                </strong>
                              </span>
                            )}
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
                        {row.status === "approved" &&
                          row.borrowerRespondedAt && (
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
                                {new Date(
                                  row.borrowerRespondedAt,
                                ).toLocaleString("en-IN")}
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
                    <p className={activity.conflict} role="status">
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
                  <div
                    className={`mt-[18px] flex flex-wrap gap-2.5 ${activity.actions}`}
                  >
                    {row.loanId && (
                      <Button asChild className={activity.primaryAction}>
                        <Link href={`/dashboard/loans/${row.loanId}`}>
                          View loan
                        </Link>
                      </Button>
                    )}
                    {row.status === "awaiting_borrower" && !incoming && (
                      <>
                        <Button
                          type="button"
                          className={activity.primaryAction}
                          disabled={!!busy}
                          onClick={() =>
                            void priceAction(row.id, "accept_final")
                          }
                        >
                          {row.priceDecision === "countered"
                            ? `Accept ${money(row.lenderCounterMinor!)} / day`
                            : `Continue at ${money(row.listedRateMinor)} / day`}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={activity.secondaryAction}
                          disabled={!!busy}
                          onClick={() =>
                            void priceAction(row.id, "decline_final")
                          }
                        >
                          Not Right Now
                        </Button>
                      </>
                    )}
                    {row.status === "pending" &&
                      (incoming ? (
                        <>
                          {row.borrowerOfferMinor !== null ? (
                            <>
                              <Button
                                type="button"
                                className={activity.primaryAction}
                                disabled={!!busy || row.conflict}
                                onClick={() =>
                                  void priceAction(row.id, "accepted_offer")
                                }
                              >
                                Accept Offer
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className={activity.secondaryAction}
                                disabled={
                                  !!busy ||
                                  row.listedRateMinor -
                                    row.borrowerOfferMinor <=
                                    1
                                }
                                onClick={() => {
                                  setCounterId(row.id);
                                  setCounter("");
                                  counterDialog.current?.showModal();
                                }}
                              >
                                Suggest Another Price
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className={activity.secondaryAction}
                                disabled={!!busy}
                                onClick={() =>
                                  void priceAction(row.id, "kept_listed_price")
                                }
                              >
                                Keep Listed Price
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              className={activity.primaryAction}
                              disabled={!!busy || row.conflict}
                              onClick={() => void act(row.id, "approve")}
                            >
                              Approve Request
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            className={activity.secondaryAction}
                            disabled={!!busy}
                            onClick={() => void act(row.id, "decline")}
                          >
                            Decline Request
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className={activity.secondaryAction}
                          disabled={!!busy}
                          onClick={() => void act(row.id, "cancel")}
                        >
                          Cancel request
                        </Button>
                      ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {pages.some(
        (page) =>
          page.status === "CanLoadMore" || page.status === "LoadingMore",
      ) && (
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          disabled={pages.some((page) => page.status === "LoadingMore")}
          onClick={() =>
            pages.forEach((page) => {
              if (page.status === "CanLoadMore") page.loadMore(10);
            })
          }
        >
          {pages.some((page) => page.status === "LoadingMore")
            ? "Loading…"
            : "Load more"}
        </Button>
      )}
      <dialog
        ref={counterDialog}
        className={activity.dialog}
        aria-labelledby="counter-title"
        onClose={() => setCounterId(null)}
      >
        {counterRow && (
          <form
            className={`borrow-form ${activity.counterForm}`}
            onSubmit={(e) => {
              e.preventDefault();
              if (counterValid)
                void priceAction(counterRow.id, "countered", counterMinor);
            }}
          >
            <div
              className={`mb-4 flex items-center justify-between gap-3 ${activity.dialogHeading}`}
            >
              <h2 id="counter-title">Suggest Another Price</h2>
              <button
                type="button"
                className="px-2 py-1"
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
            <Button
              type="submit"
              className={`mt-3.5 w-full ${activity.largeAction}`}
              disabled={!counterValid || !!busy}
            >
              Send final price
            </Button>
          </form>
        )}
      </dialog>
    </section>
  );
}
