"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export function BorrowCalendar({
  toolId,
  today,
  start,
  end,
  onSelect,
}: {
  toolId: Id<"tools">;
  today: string;
  start: string;
  end: string;
  onSelect: (date: string) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const reserved = useQuery(api.requests.reservedDates, { toolId, month });
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    setMonth(next.toISOString().slice(0, 7));
  }
  return (
    <details className="borrow-calendar" ref={details}>
      <summary>
        <CalendarDays size={18} aria-hidden="true" />
        <span>
          {start
            ? `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${start}T00:00:00Z`))}${end ? ` – ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${end}T00:00:00Z`))}` : " – Choose end date"}`
            : "Choose dates on a calendar"}
        </span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="calendar-content">
        <div className="calendar-heading">
          <button
            type="button"
            aria-label="Previous month"
            disabled={month <= today.slice(0, 7)}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <strong aria-live="polite">
            {new Intl.DateTimeFormat("en-IN", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(first)}
          </strong>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-grid" aria-label="Calendar days">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <span className="calendar-weekday" aria-hidden="true" key={i}>
              {day}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const selected = date === start || date === end;
            const unavailable =
              reserved?.some(
                (range) => range.startDate <= date && date <= range.endDate,
              ) ?? false;
            return (
              <button
                type="button"
                key={date}
                disabled={date < today || reserved === undefined || unavailable}
                aria-pressed={selected}
                aria-label={`${new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}${unavailable ? ", reserved" : ""}`}
                className={
                  unavailable
                    ? "is-reserved"
                    : start && end && date > start && date < end
                      ? "in-range"
                      : ""
                }
                onClick={() => {
                  onSelect(date);
                  if (start && !end && date >= start && details.current) {
                    details.current.open = false;
                    details.current.querySelector("summary")?.focus();
                  }
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p aria-live="polite">
          {reserved === undefined
            ? "Checking reserved dates…"
            : "Red dates are reserved. Select available dates for your request."}
        </p>
        <p>
          {!start || end
            ? "Select a start date, then an end date."
            : "Now select an end date. Select the same day for a one-day borrow."}
        </p>
        <button
          type="button"
          className="calendar-done"
          onClick={() => {
            if (details.current) {
              details.current.open = false;
              details.current.querySelector("summary")?.focus();
            }
          }}
        >
          Done
        </button>
      </div>
    </details>
  );
}
