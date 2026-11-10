import type { CSSProperties, ReactNode } from "react";
import {
  CookingPot,
  Dices,
  Drill,
  Dumbbell,
  Gamepad2,
  Leaf,
  Projector,
  Sparkles,
  Tent,
  Wrench,
} from "lucide-react";
import "./public-catalog.css";

const examples = [
  { name: "Cordless drill", category: "Power Tools", icon: Drill },
  { name: "Garden tools", category: "Garden", icon: Leaf },
  { name: "Projector", category: "Electronics", icon: Projector },
  { name: "Gaming console", category: "Electronics", icon: Gamepad2 },
  { name: "Board games", category: "Other", icon: Dices },
  { name: "Camping tent", category: "Camping & Outdoors", icon: Tent },
  { name: "Stand mixer", category: "Kitchen", icon: CookingPot },
  { name: "Fitness equipment", category: "Sports & Fitness", icon: Dumbbell },
  { name: "Cleaning tools", category: "Home & Cleaning", icon: Sparkles },
  { name: "Tool kit", category: "Other", icon: Wrench },
];
const themes = ["ink", "paper", "lime", "sand"] as const;

export function PublicCatalog({ heading }: { heading: ReactNode }) {
  return (
    <div
      className="shelf-gallery is-pinned"
      style={{ "--n": examples.length } as CSSProperties}
    >
      <div className="shelf-pin">
        <span className="shelf-word" aria-hidden="true">
          Next door · Next door · Next door ·
        </span>
        {heading}
        <ul className="shelf-track" aria-label="Examples of things to share">
          {examples.map(({ name, category, icon: Icon }, index) => (
            <li key={name}>
              <article
                className={`catalog-card is-${themes[index % themes.length]}`}
              >
                <span className="shelf-card-top">
                  <span>No. {String(index + 1).padStart(2, "0")}</span>
                  <span>{category}</span>
                </span>
                <span className="shelf-card-art" aria-hidden="true">
                  <Icon strokeWidth={1.25} />
                </span>
                <span className="shelf-card-foot">
                  <h3>{name}</h3>
                  <span className="shelf-card-sample">Example</span>
                </span>
              </article>
            </li>
          ))}
        </ul>
        <span className="shelf-progress" aria-hidden="true">
          <span />
        </span>
      </div>
    </div>
  );
}
