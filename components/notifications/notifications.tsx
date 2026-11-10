"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CalendarClock, Check, Inbox } from "lucide-react";
import styles from "./notifications.module.css";
import "./automation.css";

const permissionChange = "lendloop:notification-permission";
const unsupported = () => "unsupported" as const;

function subscribePermission(callback: () => void) {
  window.addEventListener("focus", callback);
  window.addEventListener(permissionChange, callback);
  return () => {
    window.removeEventListener("focus", callback);
    window.removeEventListener(permissionChange, callback);
  };
}

function browserPermission() {
  return window.isSecureContext && "Notification" in window
    ? Notification.permission
    : unsupported();
}

export function Notifications() {
  const rows = useQuery(api.automation.mine, {});
  const markRead = useMutation(api.automation.markRead);
  const [readError, setReadError] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const permission = useSyncExternalStore(
    subscribePermission,
    browserPermission,
    unsupported,
  );

  useEffect(() => {
    const ids = rows?.flatMap((row) => (row.unreadId ? [row.unreadId] : []));
    if (!ids?.length) return;
    const visibleIds = ids;
    function readVisible() {
      if (document.visibilityState === "visible")
        void markRead({ ids: visibleIds }).then(
          () => setReadError(false),
          () => setReadError(true),
        );
    }
    readVisible();
    document.addEventListener("visibilitychange", readVisible);
    return () => document.removeEventListener("visibilitychange", readVisible);
  }, [rows, markRead]);

  async function enableBrowserNotifications() {
    try {
      await Notification.requestPermission();
      setPermissionError(false);
      window.dispatchEvent(new Event(permissionChange));
    } catch {
      setPermissionError(true);
    }
  }

  return (
    <section className={styles.page}>
      <div className="app-heading">
        <span className="kicker">YOUR UPDATES</span>
        <h1>The latest, from nearby.</h1>
        <p>Requests, returns, and reminders from your neighborhood.</p>
        {permission === "default" && (
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={enableBrowserNotifications}
          >
            Enable browser notifications
          </Button>
        )}
        {permission === "denied" && (
          <p>Allow notifications for LendLoop in your browser settings.</p>
        )}
        {permissionError && (
          <p role="status">Could not request browser permission.</p>
        )}
        {readError && <p role="status">Could not mark your updates as read.</p>}
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
        <div className={styles.feed}>
          <div className={styles.feedHeading}>
            <div>
              <span className="kicker">YOUR ACTIVITY</span>
              <h2>Recent updates</h2>
            </div>
            <span>Latest {rows.length}</span>
          </div>
          <ol className={styles.list} aria-label="Notifications">
            {rows.map((row) => {
              const isLoan = row.href.includes("/loans/");
              const isReminder = row.type === "overdue";
              const Icon = isReminder ? CalendarClock : isLoan ? Check : Inbox;
              return (
                <li key={row.id}>
                  <span className={styles.icon} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <div className={styles.content}>
                    <div className={styles.meta}>
                      <span>
                        {isReminder
                          ? "Reminder"
                          : isLoan
                            ? "Loan update"
                            : "Request update"}
                      </span>
                      <time dateTime={new Date(row.createdAt).toISOString()}>
                        {new Date(row.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
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
                  </div>
                  <Link className={styles.action} href={row.href}>
                    {isLoan ? "View loan" : "View request"}{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
