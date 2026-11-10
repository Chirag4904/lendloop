"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PackageOpen } from "lucide-react";
import { conditions } from "@/components/listings/listing-options";
import { cn } from "@/lib/utils";
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
export function ToolCard({
  tool,
  actions,
  className,
}: {
  tool: Tool;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("tool-card", className)}>
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
