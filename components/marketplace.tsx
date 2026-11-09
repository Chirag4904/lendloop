"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MapPin, PackageOpen, Plus, Search } from "lucide-react";
import { categories, conditions } from "./listing-form";
import { useCurrentProfile } from "./use-current-profile";
import { RequestForm } from "./borrowing";

type Tool = {
  id: Id<"tools">;
  name: string;
  category: string;
  condition: keyof typeof conditions;
  description: string;
  dailyAmount: number | null;
  active: boolean;
  archived: boolean;
  distanceMeters: number;
  ownerName: string;
  isOwner: boolean;
  trustedLender: boolean;
  photos: { id: Id<"listingPhotos">; url: string | null }[];
};
const price = (amount: number | null) =>
  amount === null
    ? "Free to borrow"
    : `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount / 100)} / day`;
const relation = (distance: number) =>
  distance === 0
    ? "Your society"
    : distance < 0
      ? "Nearby society"
      : `About ${Math.round(distance)} m away`;

export function ToolCard({
  tool,
  actions,
}: {
  tool: Tool;
  actions?: React.ReactNode;
}) {
  return (
    <article className="tool-card">
      <Link
        href={`/dashboard/tools/${tool.id}`}
        className="tool-image"
        aria-label={`View ${tool.name}`}
      >
        {tool.photos[0]?.url ? (
          <img
            src={tool.photos[0].url!}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <PackageOpen size={42} strokeWidth={1.3} />
        )}
        {tool.archived && <span className="image-badge">Archived</span>}
        {!tool.archived && !tool.active && (
          <span className="image-badge">Unlisted</span>
        )}
        {actions && tool.active && !tool.archived && (
          <span className="image-badge">Active</span>
        )}
      </Link>
      <div className="tool-card-body">
        <span className="catalog-category">
          {tool.category} · {conditions[tool.condition]}
        </span>
        <h2>
          <Link href={`/dashboard/tools/${tool.id}`}>{tool.name}</Link>
        </h2>
        <strong>{price(tool.dailyAmount)}</strong>
        <p>
          {actions
            ? "Your listing"
            : `${relation(tool.distanceMeters)} · ${tool.ownerName}${tool.trustedLender ? " · Trusted Lender" : ""}`}
        </p>
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    </article>
  );
}

export function ExploreTools() {
  const { profile } = useCurrentProfile();
  const societies = useQuery(api.societies.search, { term: "" });
  const society = societies?.find((s) => s._id === profile?.societyId);
  const [scope, setScope] = useState<"society" | "500" | "1000">("society"),
    [text, setText] = useState(""),
    [category, setCategory] = useState(""),
    [cost, setCost] = useState<"all" | "free" | "paid">("all"),
    [sort, setSort] = useState<"nearest" | "newest" | "price">("nearest");
  const tools = useQuery(api.tools.explore, {
    scope,
    text,
    category: category ? (category as (typeof categories)[number]) : undefined,
    price: cost,
    sort,
  }) as Tool[] | undefined;
  function clear() {
    setText("");
    setCategory("");
    setCost("all");
    setScope("society");
    setSort("nearest");
  }
  return (
    <section className="explore-page">
      <div className="market-heading explore-heading">
        <div className="app-heading">
          <span className="local-shelf-label">Local Shelf</span>
          <h1>Your neighborhood shelf.</h1>
          <p>Borrow, share, and make better use of what’s around you.</p>
        </div>
        <div className="shelf-heading-actions">
          <span className="shelf-location">
            <MapPin size={17} aria-hidden="true" />
            {society?.name ?? "Your society"}
          </span>
          <Link className="button-primary" href="/dashboard/listings/new">
            <Plus size={17} aria-hidden="true" /> List an item
          </Link>
        </div>
      </div>
      <div className="explore-layout">
        <div className="explore-toolbar">
          <div className="shelf-search-filters">
            <div className="search-row">
              <Search className="search-icon" size={19} aria-hidden="true" />
              <label className="sr-only" htmlFor="tool-search">
                Search tools
              </label>
              <input
                id="tool-search"
                className="text-input"
                type="search"
                placeholder="Search tools, categories, details…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="inline-filters">
              <label>
                Price
                <select
                  className="text-input"
                  value={cost}
                  onChange={(e) => setCost(e.target.value as typeof cost)}
                >
                  <option value="all">All prices</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label>
                Sort by
                <select
                  className="text-input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                >
                  <option value="nearest">Nearest first</option>
                  <option value="newest">Newest first</option>
                  <option value="price">Lowest price</option>
                </select>
              </label>
            </div>
          </div>
          <div className="shelf-discovery">
            <div
              className="scope-tabs"
              role="group"
              aria-label="Search distance"
            >
              <MapPin size={16} aria-hidden="true" />
              {(
                [
                  ["society", "My Society"],
                  ["500", "Within 500 m"],
                  ["1000", "Within 1 km"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="category-chips"
              role="group"
              aria-label="Categories"
            >
              {["", ...categories].map((c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c || "All items"}
                </button>
              ))}
            </div>
          </div>
          {(text ||
            category ||
            cost !== "all" ||
            scope !== "society" ||
            sort !== "nearest") && (
            <button className="reset-filters" onClick={clear}>
              Reset filters
            </button>
          )}
        </div>
        <div className="explore-results">
          {tools === undefined ? (
            <div className="catalog-state" role="status">
              Finding nearby tools…
            </div>
          ) : tools.length ? (
            <>
              <div className="results-heading" aria-live="polite">
                <h2>Available to explore</h2>
                <span>
                  {tools.length} {tools.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="tool-grid">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </>
          ) : (
            <div className="app-empty">
              <PackageOpen size={36} />
              <h2>Nothing here just yet.</h2>
              <p>
                Try looking a little further, or be the first to share something
                useful.
              </p>
              <button type="button" className="button-primary" onClick={clear}>
                Clear filters
              </button>
              <button className="text-link" onClick={() => setScope("1000")}>
                Look within 1 km
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MyListings() {
  const tools = useQuery(api.tools.mine, {}) as Tool[] | undefined;
  const setStatus = useMutation(api.tools.setStatus);
  const [error, setError] = useState("");
  async function change(
    tool: Tool,
    status: "active" | "unlisted" | "archived",
  ) {
    if (
      status === "archived" &&
      !window.confirm(`Archive ${tool.name}? This cannot be undone.`)
    )
      return;
    try {
      setError("");
      await setStatus({ toolId: tool.id, status });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section>
      <div className="market-heading">
        <div className="app-heading">
          <span className="kicker">YOUR SHELF</span>
          <h1>Your little lending shelf.</h1>
          <p>Good things are even better when they’re shared.</p>
        </div>
        <Link className="button-primary" href="/dashboard/listings/new">
          List an item
        </Link>
      </div>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
      {tools === undefined ? (
        <div className="catalog-state" role="status">
          Loading your listings…
        </div>
      ) : tools.length ? (
        <div className="tool-grid">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              actions={
                <>
                  {!tool.archived && (
                    <Link href={`/dashboard/listings/${tool.id}/edit`}>
                      Edit
                    </Link>
                  )}
                  {!tool.archived && (
                    <button
                      type="button"
                      onClick={() =>
                        void change(tool, tool.active ? "unlisted" : "active")
                      }
                    >
                      {tool.active ? "Unlist" : "Relist"}
                    </button>
                  )}
                  {!tool.archived && (
                    <button
                      type="button"
                      onClick={() => void change(tool, "archived")}
                    >
                      Archive
                    </button>
                  )}
                </>
              }
            />
          ))}
        </div>
      ) : (
        <div className="app-empty">
          <PackageOpen size={36} />
          <h2>Your shelf is ready.</h2>
          <p>List something useful for a neighbor to borrow.</p>
          <Link className="button-primary" href="/dashboard/listings/new">
            Create your first listing
          </Link>
        </div>
      )}
    </section>
  );
}

export function ToolDetail({ toolId }: { toolId: Id<"tools"> }) {
  const tool = useQuery(api.tools.detail, { toolId }) as
    Tool | null | undefined;
  const [selected, setSelected] = useState(0);
  if (tool === undefined) return <p role="status">Loading item…</p>;
  if (!tool)
    return (
      <div className="app-empty">
        <h1>Item unavailable</h1>
        <Link href="/dashboard">Back to Explore</Link>
      </div>
    );
  return (
    <article className="detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Explore</Link>
        <span aria-hidden="true"> / </span>
        <span>{tool.category}</span>
      </nav>
      <div className="detail-layout">
        <div className="detail-editorial">
          <div className="detail-image">
            {tool.photos[selected]?.url ? (
              <img
                src={tool.photos[selected].url!}
                alt={`${tool.name}, photo ${selected + 1}`}
              />
            ) : (
              <PackageOpen size={64} strokeWidth={1.2} />
            )}
          </div>
          {tool.photos.length > 1 && (
            <div className="thumb-row" aria-label="Listing photos">
              {tool.photos.map((photo, index) => (
                <button
                  type="button"
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  key={photo.id}
                >
                  {photo.url && <img src={photo.url} alt="" />}
                </button>
              ))}
            </div>
          )}
          <section className="detail-about">
            <h2>About this item</h2>
            <p>{tool.description}</p>
            <dl className="detail-facts">
              <div>
                <dt>Condition</dt>
                <dd>{conditions[tool.condition]}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{tool.category}</dd>
              </div>
            </dl>
          </section>
          <section className="detail-lender" aria-label="Lender">
            <span className="lender-avatar" aria-hidden="true">
              {tool.ownerName.slice(0, 1).toLocaleUpperCase()}
            </span>
            <div>
              <span>Shared by</span>
              <strong>{tool.ownerName}</strong>
            </div>
            {tool.trustedLender && (
              <span className="lender-badge">Trusted Lender</span>
            )}
          </section>
          <section className="detail-how">
            <h2>How borrowing works</h2>
            <ol>
              <li>
                <strong>Request</strong>
                <span>Choose dates and ask to borrow.</span>
              </li>
              <li>
                <strong>Get confirmation</strong>
                <span>The owner reviews your request.</span>
              </li>
              <li>
                <strong>Borrow &amp; return</strong>
                <span>Coordinate, use and return the item.</span>
              </li>
            </ol>
            <p>LendLoop does not collect payments.</p>
          </section>
        </div>
        <div className="detail-copy">
          <span className="catalog-category">{tool.category}</span>
          <h1>{tool.name}</h1>
          <p className="detail-proximity">{relation(tool.distanceMeters)}</p>
          {tool.active && !tool.archived && !tool.isOwner ? (
            <RequestForm toolId={tool.id} dailyAmount={tool.dailyAmount} />
          ) : (
            <p className="detail-price">{price(tool.dailyAmount)}</p>
          )}
        </div>
      </div>
    </article>
  );
}
