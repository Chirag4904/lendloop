import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { PackageOpen } from "lucide-react";
import { conditions } from "@/components/listings/listing-options";
import { cn } from "@/lib/utils";
import { price, relation } from "./tool-display";
import "./tool-card.css";

export type Tool = {
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
        {actions}
      </div>
    </article>
  );
}
