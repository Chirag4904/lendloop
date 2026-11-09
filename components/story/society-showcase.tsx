"use client";

import { useState } from "react";
const scopes = ["My Society", "Within 500 m", "Within 1 km"];
const societies = ["Paper Gardens", "Willow Court", "Little Grove"];
export function SocietyShowcase() {
  const [scope, setScope] = useState(0);
  return (
    <section
      className="discovery-section shell"
      aria-labelledby="discovery-title"
    >
      <div>
        <span className="kicker">A SMALLER SEARCH. A BIGGER POSSIBILITY.</span>
        <h2 id="discovery-title">
          Your world.
          <br />A little closer.
        </h2>
        <p>
          Your society comes first. Expand to nearby societies when you need to.
          Useful things don’t always need to travel far.
        </p>
        <div
          className="scope-controls"
          role="group"
          aria-label="Illustrative discovery radius"
        >
          {scopes.map((label, index) => (
            <button
              type="button"
              key={label}
              aria-pressed={scope === index}
              onClick={() => setScope(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="demo-caption">
          Fictional neighborhood · Interactive demonstration
        </p>
      </div>
      <div className="neighborhood-map">
        <div className={`map-radius radius-${scope}`} aria-hidden="true" />
        {societies.map((name, index) => (
          <div
            className={`map-society map-society-${index} ${index <= scope ? "is-discovered" : ""}`}
            key={name}
          >
            <div className="map-building" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <strong>{name}</strong>
            <span>
              {index === 0
                ? "Your society · Drill"
                : index === 1
                  ? "Nearby · Ladder"
                  : "Nearby · Tent"}
            </span>
          </div>
        ))}
        <p role="status">
          {scope + 1} illustrative {scope === 0 ? "society" : "societies"} in
          view
        </p>
      </div>
    </section>
  );
}
