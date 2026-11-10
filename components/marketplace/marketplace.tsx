"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowUpDown,
  ChefHat,
  ChevronDown,
  Drill,
  Dumbbell,
  LayoutGrid,
  MapPin,
  Package,
  PackageOpen,
  Plug,
  Plus,
  Search,
  SprayCan,
  Sprout,
  Tent,
  type LucideIcon,
} from "lucide-react";
import { categories, conditions } from "@/components/listings/listing-options";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { price, relation } from "./tool-display";

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
const categoryIcons: Record<string, LucideIcon> = {
  "": LayoutGrid,
  "Power Tools": Drill,
  Garden: Sprout,
  Kitchen: ChefHat,
  Electronics: Plug,
  "Camping & Outdoors": Tent,
  "Sports & Fitness": Dumbbell,
  "Home & Cleaning": SprayCan,
};
const scopeOptions = [
  ["society", "My Society"],
  ["500", "Within 500 m"],
  ["1000", "Within 1 km"],
] as const;
const sortOptions = [
  ["nearest", "Nearest first"],
  ["newest", "Newest first"],
  ["price", "Lowest price"],
] as const;

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
  const searchInput = useRef<HTMLInputElement>(null);
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
          {/* Results update as filters change; submit only dismisses the mobile keyboard. */}
          <form
            className="shelf-bar"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              searchInput.current?.blur();
            }}
          >
            <div className="shelf-query">
              <Search size={19} aria-hidden="true" />
              <label className="sr-only" htmlFor="tool-search">
                Search tools
              </label>
              <input
                id="tool-search"
                ref={searchInput}
                type="search"
                placeholder="Search tools, categories, details…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="shelf-where">
              <MapPin size={18} aria-hidden="true" />
              <span className="shelf-picker-text" aria-hidden="true">
                <small>Where</small>
                <b>{scopeOptions.find(([v]) => v === scope)?.[1]}</b>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
              <select
                aria-label="Search distance"
                value={scope}
                onChange={(e) => setScope(e.target.value as typeof scope)}
              >
                {scopeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="shelf-submit" aria-label="Search">
              <Search size={18} aria-hidden="true" />
              <span aria-hidden="true">Search</span>
            </button>
          </form>
          <div className="shelf-filters">
            <div className="shelf-seg" role="group" aria-label="Price">
              {(
                [
                  ["all", "Any price"],
                  ["free", "Free"],
                  ["paid", "Paid"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={cost === value}
                  onClick={() => setCost(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="shelf-divider" aria-hidden="true" />
            <div className="shelf-chips" role="group" aria-label="Categories">
              {["", ...categories].map((c) => {
                const Icon = categoryIcons[c] ?? Package;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {c || "All items"}
                  </button>
                );
              })}
            </div>
            <div className="shelf-sort">
              <ArrowUpDown size={16} aria-hidden="true" />
              <span className="shelf-picker-text" aria-hidden="true">
                <span className="shelf-sort-prefix">Sort:</span>{" "}
                {sortOptions.find(([v]) => v === sort)?.[1]}
              </span>
              <ChevronDown size={16} aria-hidden="true" />
              <select
                aria-label="Sort by"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                {sortOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
