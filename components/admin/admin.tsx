"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader } from "@/components/ui/loader";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./admin.module.css";

const nav = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["listings", "Listings"],
  ["loans", "Loans"],
  ["societies", "Societies"],
  ["society-suggestions", "Suggestions"],
  ["audit", "Audit"],
  ["automation", "Automation"],
] as const;
const date = (value: number) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(value);
const money = (value: number | null) =>
  value === null
    ? "Free"
    : `₹${(value / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
function Status({ children }: { children: string }) {
  return <span className={styles.status}>{children.replaceAll("_", " ")}</span>;
}
function Notice({ text }: { text: string }) {
  return text ? (
    <p className={styles.notice} role="status">
      {text}
    </p>
  ) : null;
}
function Search({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.search}>
      Search loaded records
      <input
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="search"
      />
    </label>
  );
}
function More({
  status,
  loadMore,
}: {
  status: string;
  loadMore: (count: number) => void;
}) {
  return status === "CanLoadMore" ? (
    <Button onClick={() => loadMore(20)}>Load more</Button>
  ) : status === "LoadingMore" ? (
    <Loader label="Loading more…" compact />
  ) : null;
}
function Empty({ loading }: { loading: boolean }) {
  return loading ? (
    <Loader label="Loading records…" compact />
  ) : (
    <p className={styles.empty}>No matching records in the loaded pages.</p>
  );
}

export function Admin({ section }: { section: (typeof nav)[number][0] }) {
  const access = useQuery(api.admin.access);
  const path = usePathname();
  if (access === undefined)
    return (
      <main className="app-main">
        <Loader label="Checking admin access…" />
      </main>
    );
  if (!access)
    return (
      <main className="app-main" role="alert">
        Admin access required.
      </main>
    );
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <header className={styles.header}>
        <Link className="brand" href="/dashboard">
          LendLoop<span className="brand-dot">.</span>
        </Link>
        <span>ADMINISTRATION</span>
        <UserButton />
      </header>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Admin navigation">
          {nav.map(([id, label]) => (
            <Link
              key={id}
              href={id === "overview" ? "/admin" : `/admin/${id}`}
              aria-current={
                path === (id === "overview" ? "/admin" : `/admin/${id}`)
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          <Link href="/dashboard">Marketplace ↗</Link>
        </nav>
        <main className={styles.main}>
          <div className={styles.title}>
            <span className="kicker">LENDLOOP OPERATIONS</span>
            <h1>{nav.find(([id]) => id === section)?.[1]}</h1>
          </div>
          {section === "overview" && <Overview />}
          {section === "users" && <Users />}
          {section === "listings" && <Listings />}
          {section === "loans" && <Loans />}
          {section === "societies" && <Societies />}
          {section === "society-suggestions" && <Suggestions />}
          {section === "audit" && <Audit />}
          {section === "automation" && <Automation />}
        </main>
      </div>
    </div>
  );
}
function Overview() {
  const data = useQuery(api.admin.overview);
  if (!data) return <Empty loading />;
  const cards: [string, number, boolean][] = [
    ["Total users", data.users, data.capped.users],
    ["Active listings", data.listings, data.capped.listings],
    ["Active loans", data.activeLoans, data.capped.activeLoans],
    ["Pending requests", data.pendingRequests, data.capped.pendingRequests],
    ["Overdue loans", data.overdueLoans, data.capped.overdueLoans],
    [
      "Pending suggestions",
      data.pendingSuggestions,
      data.capped.pendingSuggestions,
    ],
    ["Failed automation events", data.failedEvents, data.capped.failedEvents],
  ];
  return (
    <>
      <div className={styles.stats}>
        {cards.map(([label, value, capped]) => (
          <div className={styles.card} key={label}>
            <span>{label}</span>
            <strong>
              {capped ? "≥" : ""}
              {value}
            </strong>
          </div>
        ))}
      </div>
      {Object.values(data.capped).some(Boolean) && (
        <p className={styles.muted}>
          ≥ marks a lower bound after a dashboard read reached its limit. Open
          that section to page through records.
        </p>
      )}
    </>
  );
}
function Users() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.users,
    {},
    { initialNumItems: 20 },
  );
  const update = useMutation(api.admin.setTrust);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const rows = results.filter((r) =>
    `${r.name} ${r.account} ${r.society}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function toggle(
    id: Id<"users">,
    name: string,
    badge: "trustedLender" | "trustedBorrower",
    value: boolean,
  ) {
    const label =
      badge === "trustedLender" ? "Trusted Lender" : "Trusted Borrower";
    if (
      !window.confirm(
        `${value ? "Mark" : "Remove"} ${name} ${value ? "as" : "from"} ${label}?\n\nThis is an administrator-assigned platform designation, not an identity-verification guarantee.`,
      )
    )
      return;
    setBusy(`${id}:${badge}`);
    setMessage("");
    try {
      await update({ userId: id, badge, value });
      setMessage(`${label} ${value ? "granted" : "revoked"} for ${name}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update trust.");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <p className={styles.muted}>
        Trust badges are manually assigned by LendLoop. They do not verify
        identity.
      </p>
      <Search value={search} onChange={setSearch} />
      <Notice text={message} />
      <div className={styles.records}>
        {rows.map((r) => (
          <article className={styles.row} key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <small>
                Account …{r.account} · {r.society} · Joined {date(r.createdAt)}
              </small>
            </div>
            <Status>{r.role}</Status>
            <div className={styles.actions}>
              {(["trustedLender", "trustedBorrower"] as const).map((badge) => (
                <Button
                  key={badge}
                  type="button"
                  disabled={!!busy}
                  onClick={() => void toggle(r.id, r.name, badge, !r[badge])}
                >
                  {r[badge] ? "✓ " : "+ "}
                  {badge === "trustedLender"
                    ? "Trusted Lender"
                    : "Trusted Borrower"}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
function Listings() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listings,
    {},
    { initialNumItems: 20 },
  );
  const remove = useMutation(api.admin.removeListing);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [society, setSociety] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const rows = results.filter(
    (r) =>
      `${r.name} ${r.category} ${r.owner} ${r.society}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || r.status === filter) &&
      (category === "all" || r.category === category) &&
      (society === "all" || r.societyId === society),
  );
  async function onRemove(id: Id<"tools">) {
    if (
      !window.confirm(
        "Remove this listing from LendLoop?\n\nExisting confirmed loans and history stay available to participants.",
      )
    )
      return;
    setBusy(id);
    setMessage("");
    try {
      await remove({ toolId: id });
      setMessage("Listing removed from discovery.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not remove listing.");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className={styles.filters}>
        <Search value={search} onChange={setSearch} />
        <label>
          Status
          <select
            className="text-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="unlisted">Unlisted</option>
            <option value="removed">Removed</option>
          </select>
        </label>
        <label>
          Category
          <select
            className="text-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(results.map((r) => r.category))]
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
          </select>
        </label>
        <label>
          Society
          <select
            className="text-input"
            value={society}
            onChange={(e) => setSociety(e.target.value)}
          >
            <option value="all">All societies</option>
            {[
              ...new Map(results.map((r) => [r.societyId, r.society] as const)),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Notice text={message} />
      <div className={styles.records}>
        {rows.map((r) => (
          <article className={cn(styles.row, styles.listing)} key={r.id}>
            {r.coverUrl && (
              <img className={styles.cover} src={r.coverUrl} alt="" />
            )}
            <div className={styles.listingInfo}>
              <strong>{r.name}</strong>
              <small>
                {r.category} · {r.owner} · {r.society} · {money(r.dailyAmount)}{" "}
                / day · {date(r.createdAt)}
              </small>
            </div>
            <Status>{r.status}</Status>
            {r.status !== "removed" && (
              <Button disabled={!!busy} onClick={() => void onRemove(r.id)}>
                Remove
              </Button>
            )}
            <details className={styles.listingDetail}>
              <summary>Inspect listing</summary>
              <p>{r.description}</p>
              <small>
                Condition: {r.condition} · Last updated {date(r.updatedAt)}
              </small>
            </details>
          </article>
        ))}
      </div>
      {!rows.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
function Loans() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.loans,
    {},
    { initialNumItems: 20 },
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [openLoans, setOpenLoans] = useState<Set<Id<"loans">>>(new Set());
  const rows = results.filter(
    (r) =>
      `${r.toolName} ${r.lender} ${r.borrower} ${r.lenderSociety} ${r.borrowerSociety}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "overdue"
          ? r.overdue
          : filter === "active"
            ? r.status === "reserved" &&
              !r.overdue &&
              r.startDate <=
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Kolkata",
                })
            : filter === "reserved"
              ? r.status === "reserved"
              : r.status === filter)),
  );
  return (
    <>
      <div className={styles.filters}>
        <Search value={search} onChange={setSearch} />
        <label>
          Status
          <select
            className="text-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="reserved">Reserved</option>
            <option value="return_pending">Return pending</option>
            <option value="returned">Returned</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
      </div>
      <div className={styles.records}>
        {rows.map((r) => (
          <details
            className={cn(styles.row, styles.loan)}
            key={r.id}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              setOpenLoans((previous) => {
                const next = new Set(previous);
                if (open) next.add(r.id);
                else next.delete(r.id);
                return next;
              });
            }}
          >
            <summary>
              <strong>{r.toolName}</strong>
              <span>
                {r.lender} → {r.borrower}
              </span>
              <Status>{r.overdue ? "Overdue" : r.status}</Status>
              <span>
                {r.startDate} – {r.endDate}
              </span>
              <strong>{money(r.totalMinor)}</strong>
            </summary>
            <div className={styles.loanDetail}>
              <p>
                Societies: {r.lenderSociety} → {r.borrowerSociety}
              </p>
              <p>
                Approved {date(r.approvedAt)} · Request {r.requestStatus} ·
                Created {date(r.requestCreatedAt)}
              </p>
              <p>
                Agreed rate {money(r.rateMinor)} / day · Listed rate{" "}
                {money(r.listedRateMinor)} / day
              </p>
              {r.borrowerOfferMinor !== null && (
                <p>Borrower offer {money(r.borrowerOfferMinor)} / day</p>
              )}
              {r.lenderCounterMinor !== null && (
                <p>Lender counter {money(r.lenderCounterMinor)} / day</p>
              )}
              {r.priceDecision && (
                <p>Price decision: {r.priceDecision.replaceAll("_", " ")}</p>
              )}
              {r.returnReportedAt && (
                <p>Return reported {date(r.returnReportedAt)}</p>
              )}
              {r.returnedAt && <p>Return confirmed {date(r.returnedAt)}</p>}
              <LoanActivity loanId={r.id} open={openLoans.has(r.id)} />
            </div>
          </details>
        ))}
      </div>
      {!rows.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
function LoanActivity({
  loanId,
  open,
}: {
  loanId: Id<"loans">;
  open: boolean;
}) {
  const events = useQuery(api.admin.loanActivity, open ? { loanId } : "skip");
  return (
    <div>
      <strong>Automation activity</strong>
      {events === undefined ? (
        <Loader label="Loading activity…" compact />
      ) : events.length ? (
        events.map((event) => (
          <p key={event.id}>
            {event.type} · {event.status.replaceAll("_", " ")} ·{" "}
            {date(event.createdAt)}
            {event.error ? ` · ${event.error}` : ""}
          </p>
        ))
      ) : (
        <p>No automation activity recorded for this loan.</p>
      )}
    </div>
  );
}
const blank = {
  name: "",
  city: "",
  locality: "",
  latitude: "",
  longitude: "",
  status: "active" as "active" | "inactive",
};
function Societies() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.societies,
    {},
    { initialNumItems: 20 },
  );
  const save = useMutation(api.admin.saveSociety);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(blank);
  const [id, setId] = useState<Id<"societies"> | undefined>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = results.filter((r) =>
    `${r.name} ${r.city} ${r.locality}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`${id ? "Save changes to" : "Add"} this society?`))
      return;
    setBusy(true);
    setMessage("");
    try {
      await save({
        societyId: id,
        name: form.name,
        city: form.city,
        locality: form.locality,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        status: form.status,
      });
      setForm(blank);
      setId(undefined);
      setMessage("Society saved.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not save society.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <h2>{id ? "Edit society" : "Add society"}</h2>
        <div className={styles.formGrid}>
          {(["name", "city", "locality", "latitude", "longitude"] as const).map(
            (key) => (
              <label key={key}>
                {key[0].toUpperCase() + key.slice(1)}
                <input
                  className="text-input"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  type={
                    key === "latitude" || key === "longitude"
                      ? "number"
                      : "text"
                  }
                  step={
                    key === "latitude" || key === "longitude"
                      ? "any"
                      : undefined
                  }
                  required
                />
              </label>
            ),
          )}
          <label>
            Status
            <select
              className="text-input"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "active" | "inactive",
                })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className={styles.actions}>
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Save society"}
          </Button>
          {id && (
            <Button
              type="button"
              onClick={() => {
                setId(undefined);
                setForm(blank);
              }}
            >
              Cancel edit
            </Button>
          )}
        </div>
      </form>
      <Notice text={message} />
      <Search value={search} onChange={setSearch} />
      <div className={styles.records}>
        {rows.map((r) => (
          <article className={styles.row} key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <small>
                {r.locality}, {r.city} · {r.latitude}, {r.longitude}
              </small>
            </div>
            <Status>{r.status}</Status>
            <Button
              onClick={() => {
                setId(r.id);
                setForm({
                  name: r.name,
                  city: r.city,
                  locality: r.locality,
                  latitude: String(r.latitude),
                  longitude: String(r.longitude),
                  status: r.status,
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Edit
            </Button>
          </article>
        ))}
      </div>
      {!rows.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
function Suggestions() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.suggestions,
    {},
    { initialNumItems: 20 },
  );
  const moderate = useMutation(api.admin.moderateSuggestion);
  const [societySearch, setSocietySearch] = useState("");
  const societies =
    useQuery(api.societies.search, { term: societySearch }) ?? [];
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({
    id: "",
    name: "",
    city: "",
    locality: "",
    latitude: "",
    longitude: "",
    societyId: "",
  });
  const rows = results.filter((r) =>
    `${r.name} ${r.city} ${r.locality} ${r.submitter}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function decide(
    id: Id<"societySuggestions">,
    decision: "approve" | "reject",
  ) {
    if (
      decision === "approve" &&
      !form.societyId &&
      (!form.latitude.trim() || !form.longitude.trim())
    ) {
      setMessage("Enter both coordinates or associate an existing society.");
      return;
    }
    if (
      !window.confirm(
        `${decision === "approve" ? "Approve" : "Reject"} this society suggestion?`,
      )
    )
      return;
    setBusy(id);
    setMessage("");
    try {
      await moderate({
        suggestionId: id,
        decision,
        societyId:
          decision === "approve" && form.societyId
            ? (form.societyId as Id<"societies">)
            : undefined,
        details:
          decision === "approve" && !form.societyId
            ? {
                name: form.name,
                city: form.city,
                locality: form.locality,
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
              }
            : undefined,
      });
      setMessage(
        `Suggestion ${decision === "approve" ? "approved" : "rejected"}.`,
      );
      setForm({
        id: "",
        name: "",
        city: "",
        locality: "",
        latitude: "",
        longitude: "",
        societyId: "",
      });
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not review suggestion.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <Search value={search} onChange={setSearch} />
      <Notice text={message} />
      <div className={styles.records}>
        {rows.map((r) => (
          <article className={cn(styles.row, styles.suggestion)} key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <small>
                {r.locality || "Locality unknown"}, {r.city || "City unknown"} ·{" "}
                {r.submitter} · {date(r.createdAt)}
              </small>
            </div>
            <Status>{r.status}</Status>
            {r.status === "pending" && (
              <div className={styles.actions}>
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    setForm({
                      id: r.id,
                      name: r.name,
                      city: r.city,
                      locality: r.locality,
                      latitude: "",
                      longitude: "",
                      societyId: "",
                    })
                  }
                >
                  Review
                </Button>
                <Button
                  disabled={!!busy}
                  onClick={() => void decide(r.id, "reject")}
                >
                  Reject
                </Button>
              </div>
            )}
            {form.id === r.id && (
              <div className={styles.review}>
                <label>
                  Associate existing active society
                  <input
                    className="text-input"
                    type="search"
                    value={societySearch}
                    onChange={(e) => setSocietySearch(e.target.value)}
                    placeholder="Find a society"
                  />
                  <select
                    className="text-input"
                    value={form.societyId}
                    onChange={(e) =>
                      setForm({ ...form, societyId: e.target.value })
                    }
                  >
                    <option value="">Create a new society</option>
                    {societies.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} — {s.locality}, {s.city}
                      </option>
                    ))}
                  </select>
                </label>
                {!form.societyId && (
                  <div className={styles.formGrid}>
                    {(
                      [
                        "name",
                        "city",
                        "locality",
                        "latitude",
                        "longitude",
                      ] as const
                    ).map((key) => (
                      <label key={key}>
                        {key}
                        <input
                          className="text-input"
                          type={
                            key === "latitude" || key === "longitude"
                              ? "number"
                              : "text"
                          }
                          step="any"
                          value={form[key]}
                          onChange={(e) =>
                            setForm({ ...form, [key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
                <Button
                  disabled={!!busy}
                  onClick={() => void decide(r.id, "approve")}
                >
                  Approve suggestion
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!rows.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
function Audit() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.auditHistory,
    {},
    { initialNumItems: 20 },
  );
  return (
    <>
      <div className={styles.records}>
        {results.map((r) => (
          <article className={styles.row} key={r.id}>
            <div>
              <strong>{r.action.replaceAll(".", " · ")}</strong>
              <small>
                {r.actor} · {r.targetType} …{r.targetId} · {date(r.createdAt)}
                {r.detail ? ` · ${r.detail}` : ""}
              </small>
            </div>
          </article>
        ))}
      </div>
      {!results.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
function Automation() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "processing" | "retry_pending" | "delivered" | "failed"
  >("all");
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.automation,
    filter === "all" ? {} : { status: filter },
    { initialNumItems: 20 },
  );
  return (
    <>
      <p className={styles.muted}>
        Review the status of notification deliveries.
      </p>
      <label className={styles.search}>
        Delivery status
        <select
          className="text-input"
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="retry_pending">Retry pending</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </label>
      <div className={styles.records}>
        {results.map((r) => (
          <article className={styles.row} key={r.id}>
            <div>
              <strong>{r.type}</strong>
              <small>
                {date(r.createdAt)} · {r.attempts} attempt
                {r.attempts === 1 ? "" : "s"}
                {r.error ? ` · ${r.error}` : ""}
              </small>
            </div>
            <Status>{r.status}</Status>
          </article>
        ))}
      </div>
      {!results.length && <Empty loading={status === "LoadingFirstPage"} />}
      <More status={status} loadMore={loadMore} />
    </>
  );
}
