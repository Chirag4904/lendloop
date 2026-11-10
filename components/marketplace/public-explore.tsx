"use client";

import Link from "next/link";
import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { ArrowUpRight, PackageOpen, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { categories } from "@/components/listings/listing-options";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import styles from "./public-explore.module.css";

function Listings() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<"" | (typeof categories)[number]>(
    "",
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.tools.publicBrowse,
    { text, category: category || undefined },
    { initialNumItems: 24 },
  );
  return (
    <>
      <form
        className={styles.search}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="public-tool-search">
          Search listings by name
        </label>
        <input
          id="public-tool-search"
          type="search"
          maxLength={80}
          placeholder="Search items by name…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </form>
      <div
        className={styles.categories}
        role="group"
        aria-label="Filter by category"
      >
        {["", ...categories].map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            aria-pressed={category === option}
            onClick={() => setCategory(option as typeof category)}
          >
            {option || "All categories"}
          </Button>
        ))}
      </div>
      <div className={styles.resultsHeading}>
        <h2>Available to explore</h2>
      </div>
      {status === "LoadingFirstPage" ? (
        <Loader label="Finding listings…" />
      ) : results.length === 0 ? (
        <div className="app-empty">
          <PackageOpen size={32} aria-hidden="true" />
          <h2>
            {status === "CanLoadMore"
              ? "No listings on this page"
              : "No listings found"}
          </h2>
          <p>
            {status === "CanLoadMore"
              ? "Load more to continue browsing."
              : "Try a different search or category."}
          </p>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Public listings">
          {results.map((item, index) => (
            <li
              key={`${item.name}-${item.category}-${index}`}
              className={styles.card}
            >
              <div className={styles.photo}>
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <PackageOpen size={38} aria-hidden="true" />
                )}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.category}>{item.category}</span>
                <h3>
                  {item.name.startsWith("Demo · ")
                    ? item.name.slice(7)
                    : item.name}
                </h3>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          type="button"
          variant="outline"
          className={styles.more}
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(24)}
        >
          {status === "LoadingMore" ? "Loading…" : "Load more"}
        </Button>
      )}
    </>
  );
}

export function PublicExplore() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return (
    <section className={`shell ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <span className="kicker">THE NEIGHBORHOOD SHELF</span>
          <h1>See what’s out there.</h1>
          <p>
            Browse the live shelf by name and category. Sign in to see details
            and request an item.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">
            Sign in to lend or borrow{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {configured ? (
        <Listings />
      ) : (
        <div className="app-empty">
          <h2>The shelf is getting ready</h2>
          <p>Please check back soon.</p>
        </div>
      )}
    </section>
  );
}
