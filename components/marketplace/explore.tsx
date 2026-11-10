"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import { Loader } from "@/components/ui/loader";
import { categories } from "@/components/listings/listing-options";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { ToolCard } from "./tool-card";
import styles from "./explore.module.css";

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

export function ExploreTools() {
  const { profile } = useCurrentProfile();
  const societies = useQuery(api.societies.search, { term: "" });
  const society = societies?.find((s) => s._id === profile?.societyId);
  const [scope, setScope] = useState<"society" | "500" | "1000">("society"),
    [text, setText] = useState(""),
    [category, setCategory] = useState<"" | (typeof categories)[number]>(""),
    [cost, setCost] = useState<"all" | "free" | "paid">("all"),
    [sort, setSort] = useState<"nearest" | "newest" | "price">("nearest");
  const searchInput = useRef<HTMLInputElement>(null);
  const tools = useQuery(api.tools.explore, {
    scope,
    text,
    category: category || undefined,
    price: cost,
    sort,
  });
  function clear() {
    setText("");
    setCategory("");
    setCost("all");
    setScope("society");
    setSort("nearest");
  }
  return (
    <section>
      <div className={styles.heading}>
        <div className="app-heading">
          <span className={styles.label}>Local Shelf</span>
          <h1>Your neighborhood shelf.</h1>
          <p>Borrow, share, and make better use of what’s around you.</p>
        </div>
        <div className={styles.headingActions}>
          <span
            className={`inline-flex items-center gap-2 text-[13px] font-semibold ${styles.location}`}
          >
            <MapPin size={17} aria-hidden="true" />
            {society?.name ?? "Your society"}
          </span>
          <Button asChild className={styles.listItem}>
            <Link href="/dashboard/listings/new">
              <Plus size={17} aria-hidden="true" /> List an item
            </Link>
          </Button>
        </div>
      </div>
      <div className={styles.toolbar}>
        {/* Results update as filters change; submit only dismisses the mobile keyboard. */}
        <form
          className={styles.bar}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            searchInput.current?.blur();
          }}
        >
          <div className={styles.query}>
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
          <div className={styles.where}>
            <MapPin size={18} aria-hidden="true" />
            <span className={styles.pickerText} aria-hidden="true">
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
          <Button type="submit" className={styles.submit} aria-label="Search">
            <Search size={18} aria-hidden="true" />
            <span aria-hidden="true">Search</span>
          </Button>
        </form>
        <div className={styles.filters}>
          <div className={styles.prices} role="group" aria-label="Price">
            {(
              [
                ["all", "Any price"],
                ["free", "Free"],
                ["paid", "Paid"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                aria-pressed={cost === value}
                onClick={() => setCost(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <span className={styles.divider} aria-hidden="true" />
          <div
            className={styles.categories}
            role="group"
            aria-label="Categories"
          >
            {(["", ...categories] as const).map((c) => {
              const Icon = categoryIcons[c] ?? Package;
              return (
                <Button
                  key={c}
                  type="button"
                  variant="outline"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {c || "All items"}
                </Button>
              );
            })}
          </div>
          <div className={styles.sort}>
            <ArrowUpDown size={16} aria-hidden="true" />
            <span className={styles.pickerText} aria-hidden="true">
              <span className={styles.sortPrefix}>Sort:</span>{" "}
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
          <Button
            type="button"
            variant="ghost"
            className={styles.reset}
            onClick={clear}
          >
            Reset filters
          </Button>
        )}
      </div>
      <div className="min-w-0">
        {tools === undefined ? (
          <Loader label="Finding nearby tools…" />
        ) : tools.length ? (
          <>
            <div className={styles.resultsHeading} aria-live="polite">
              <h2>Available to explore</h2>
              <span>
                {tools.length} {tools.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className={styles.grid}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} className={styles.card} />
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
            <Button type="button" className="button-primary" onClick={clear}>
              Clear filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-link min-h-0 rounded-none p-0 hover:bg-transparent"
              onClick={() => setScope("1000")}
            >
              Look within 1 km
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
