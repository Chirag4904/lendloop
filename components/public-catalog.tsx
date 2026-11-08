"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CookingPot,
  Drill,
  Dumbbell,
  House,
  Leaf,
  Lightbulb,
  PackageOpen,
  Tent,
} from "lucide-react";

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

function CatalogList() {
  const tools = useQuery(api.tools.publicList);
  if (tools === undefined)
    return (
      <div className="catalog-state" role="status">
        Looking for available tools…
      </div>
    );
  if (!tools.length)
    return (
      <div className="catalog-state">
        <PackageOpen size={30} strokeWidth={1.5} />
        <strong>The shelf is getting ready.</strong>
        <p>
          There are no active tools to show yet. Sign in and check back as
          neighbors join.
        </p>
      </div>
    );
  return (
    <div className="catalog-grid">
      {tools.map((tool, index) => {
        const Icon = categoryIcons[tool.category];
        const demo = tool.name.startsWith("Demo · ");
        return (
          <article className="catalog-card" key={`${tool.name}-${index}`}>
            <div className="catalog-icon">
              <Icon aria-hidden="true" />
            </div>
            <div>
              <span className="catalog-category">{tool.category}</span>
              <h3>{demo ? tool.name.slice(7) : tool.name}</h3>
              {demo && <span className="catalog-demo">Sample listing</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PublicCatalog() {
  if (
    !process.env.NEXT_PUBLIC_CONVEX_URL ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  )
    return (
      <div className="catalog-state">
        <PackageOpen size={30} strokeWidth={1.5} />
        <strong>Our neighborhood shelf is getting ready.</strong>
        <p>Live tools will appear here when the catalog is connected.</p>
      </div>
    );
  return <CatalogList />;
}
