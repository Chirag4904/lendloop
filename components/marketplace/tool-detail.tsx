"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { PackageOpen, Pencil } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Loader } from "@/components/ui/loader";
import type { Id } from "@/convex/_generated/dataModel";
import { RequestForm } from "@/components/borrowing/borrowing";
import { conditions } from "@/components/listings/listing-options";
import { Button } from "@/components/ui/button";
import { price, relation } from "./tool-display";
import styles from "./tool-detail.module.css";

export function ToolDetail({ toolId }: { toolId: Id<"tools"> }) {
  const tool = useQuery(api.tools.detail, { toolId });
  const [selected, setSelected] = useState(0);
  if (tool === undefined) return <Loader label="Loading item…" />;
  if (!tool)
    return (
      <div className="app-empty">
        <h1>Item unavailable</h1>
        <Link href="/dashboard">Back to Explore</Link>
      </div>
    );
  const selectedPhotoUrl = tool.photos[selected]?.url;
  return (
    <article>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={tool.isOwner ? "/dashboard/listings" : "/dashboard"}>
          {tool.isOwner ? "My Listings" : "Explore"}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{tool.category}</span>
      </nav>
      <div className={styles.layout}>
        <div className={styles.editorial}>
          <div className={styles.image}>
            {selectedPhotoUrl ? (
              <img
                src={selectedPhotoUrl}
                alt={`${tool.name}, photo ${selected + 1}`}
                className="size-full object-cover"
              />
            ) : (
              <PackageOpen size={64} strokeWidth={1.2} />
            )}
          </div>
          {tool.photos.length > 1 && (
            <div
              className={styles.thumbnails}
              role="group"
              aria-label="Listing photos"
            >
              {tool.photos.map((photo, index) => (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  key={photo.id}
                >
                  {photo.url && (
                    <img
                      src={photo.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </Button>
              ))}
            </div>
          )}
          <section className={styles.about}>
            <h2>About this item</h2>
            <p>{tool.description}</p>
            <dl className={styles.facts}>
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
          {!tool.isOwner && (
            <section className={styles.lender} aria-label="Lender">
              <span
                className={`grid size-[42px] place-items-center rounded-full ${styles.avatar}`}
                aria-hidden="true"
              >
                {tool.ownerName.slice(0, 1).toLocaleUpperCase()}
              </span>
              <div className="grid gap-0.5">
                <span>Shared by</span>
                <strong className="text-[14px]">{tool.ownerName}</strong>
              </div>
              {tool.trustedLender && (
                <span className={styles.badge}>Trusted Lender</span>
              )}
            </section>
          )}
          {!tool.isOwner && (
            <section className={styles.steps}>
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
          )}
        </div>
        <div className={styles.copy}>
          <span className={`catalog-category ${styles.category}`}>
            {tool.category}
          </span>
          <h1>{tool.name}</h1>
          <p className="text-[14px]">{relation(tool.distanceMeters)}</p>
          {tool.isOwner ? (
            <div className={styles.ownerPanel}>
              <div className={styles.ownerStatus}>
                <span className="size-2 rounded-full bg-[#8bb52b]" />
                {tool.archived
                  ? "Archived"
                  : tool.active
                    ? "Listed"
                    : "Unlisted"}
              </div>
              <span className={styles.ownerLabel}>YOUR LISTING</span>
              <p className={styles.ownerPrice}>{price(tool.dailyAmount)}</p>
              <p>
                {tool.archived
                  ? "This listing is archived."
                  : tool.active
                    ? "Your neighbors can discover and request this item."
                    : "This item is hidden from Explore."}
              </p>
              {!tool.archived && (
                <Button asChild className={styles.editLink}>
                  <Link href={`/dashboard/listings/${tool.id}/edit`}>
                    <Pencil size={17} /> Edit listing
                  </Link>
                </Button>
              )}
              <Link className={styles.shelfLink} href="/dashboard/listings">
                Manage my listings →
              </Link>
            </div>
          ) : tool.active && !tool.archived ? (
            <RequestForm toolId={tool.id} dailyAmount={tool.dailyAmount} />
          ) : (
            <p className={styles.price}>{price(tool.dailyAmount)}</p>
          )}
        </div>
      </div>
    </article>
  );
}
