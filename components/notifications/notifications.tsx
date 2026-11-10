"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import styles from "./notifications.module.css";

export function Notifications() {
  const rows = useQuery(api.automation.mine, {});
  return (
    <section className={styles.page}>
      <div className="app-heading">
        <span className="kicker">YOUR UPDATES</span>
        <h1>The latest, from nearby.</h1>
        <p>Request updates and overdue reminders appear here.</p>
      </div>
      {rows === undefined ? (
        <p role="status">Loading notifications…</p>
      ) : rows.length === 0 ? (
        <div className="app-empty">
          <h2>No notifications yet</h2>
          <p>Updates about your requests will appear here.</p>
          <Button
            asChild
            variant="ghost"
            className="text-link min-h-0 rounded-none p-0 leading-[inherit] hover:bg-transparent"
          >
            <Link href="/dashboard/requests">View your activity →</Link>
          </Button>
        </div>
      ) : (
        <ol
          className={`automation-list ${styles.list}`}
          aria-label="Notifications"
        >
          {rows.map((row) => (
            <li key={row.id}>
              <strong>{row.message}</strong>
              <span className={`automation-state state-${row.status}`}>
                {row.status === "delivered"
                  ? "Delivered"
                  : row.status === "sent"
                    ? "Sent"
                    : row.status === "retry_pending"
                      ? "Retry pending"
                      : row.status}
              </span>
              <time dateTime={new Date(row.createdAt).toISOString()}>
                {new Date(row.createdAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
