"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowUpRight,
  CookingPot,
  Drill,
  Dumbbell,
  House,
  Leaf,
  Lightbulb,
  PackageOpen,
  Plus,
  Tent,
} from "lucide-react";
import "./public-catalog.css";

const categoryIcons = {
  "Power Tools": Drill,
  Garden: Leaf,
  Kitchen: CookingPot,
  Electronics: Lightbulb,
  "Camping & Outdoors": Tent,
  "Sports & Fitness": Dumbbell,
  "Home & Cleaning": House,
  Other: PackageOpen,
};
const themes = ["ink", "paper", "lime", "sand"] as const;

/**
 * Pinned horizontal gallery: the section's height grows with the card count
 * (`--n`) so vertical scroll distance matches the track's horizontal travel.
 */
function Gallery({
  count,
  heading,
  children,
}: {
  count?: number;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={count ? "shelf-gallery is-pinned" : "shelf-gallery"}
      style={count ? ({ "--n": count } as CSSProperties) : undefined}
    >
      <div className="shelf-pin">
        <span className="shelf-word" aria-hidden="true">
          Next door · Next door · Next door ·
        </span>
        {heading}
        {children}
        {count ? (
          <span className="shelf-progress" aria-hidden="true">
            <span />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CatalogList({ heading }: { heading: ReactNode }) {
  const tools = useQuery(api.tools.publicList);
  if (tools === undefined)
    return (
      <Gallery heading={heading}>
        <div className="shell">
          <div className="catalog-state" role="status">
            Looking for available tools…
          </div>
        </div>
      </Gallery>
    );
  if (!tools.length)
    return (
      <Gallery heading={heading}>
        <div className="shell">
          <div className="catalog-state">
            <PackageOpen size={30} strokeWidth={1.5} />
            <strong>The shelf is getting ready.</strong>
            <p>
              There are no active tools to show yet. Sign in and check back as
              neighbors join.
            </p>
          </div>
        </div>
      </Gallery>
    );
  return (
    <Gallery heading={heading} count={tools.length + 1}>
      <ul className="shelf-track" aria-label="Items on the neighborhood shelf">
        {tools.map((tool, index) => {
          const Icon = categoryIcons[tool.category];
          const demo = tool.name.startsWith("Demo · ");
          return (
            <li key={`${tool.name}-${index}`}>
              <article
                className={`catalog-card is-${themes[index % themes.length]}`}
              >
                <span className="shelf-card-top">
                  <span>No. {String(index + 1).padStart(2, "0")}</span>
                  <span>{tool.category}</span>
                </span>
                <span className="shelf-card-art" aria-hidden="true">
                  <Icon strokeWidth={1.25} />
                </span>
                <span className="shelf-card-foot">
                  <h3>{demo ? tool.name.slice(7) : tool.name}</h3>
                  {demo && (
                    <span className="shelf-card-sample">Sample listing</span>
                  )}
                </span>
              </article>
            </li>
          );
        })}
        <li>
          <div className="catalog-card is-next">
            <span className="shelf-card-art" aria-hidden="true">
              <Plus strokeWidth={1.25} />
            </span>
            <span className="shelf-card-foot">
              <h3>Your idle things could be next.</h3>
              <Link href="/dashboard/listings/new" className="text-link">
                List an item <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </span>
          </div>
        </li>
      </ul>
    </Gallery>
  );
}

export function PublicCatalog({ heading }: { heading: ReactNode }) {
  if (
    !process.env.NEXT_PUBLIC_CONVEX_URL ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  )
    return (
      <Gallery heading={heading}>
        <div className="shell">
          <div className="catalog-state">
            <PackageOpen size={30} strokeWidth={1.5} />
            <strong>Our neighborhood shelf is getting ready.</strong>
            <p>Live tools will appear here when the catalog is connected.</p>
          </div>
        </div>
      </Gallery>
    );
  return <CatalogList heading={heading} />;
}
