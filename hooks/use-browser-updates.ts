"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const updatesPath = "/dashboard/notifications";

async function showUpdate(count: number, tag: string, openUpdates: () => void) {
  const options = {
    tag,
    body:
      count === 1 ? "You have a new update." : `You have ${count} new updates.`,
  };
  try {
    const notification = new Notification("LendLoop", options);
    notification.onclick = () => {
      window.focus();
      openUpdates();
      notification.close();
    };
  } catch {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.register("/updates-worker.js", {
      scope: "/dashboard",
    });
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("LendLoop", options);
  }
}

export function useBrowserUpdates(
  account: string | undefined,
  rows: { unreadId: string | null }[] | undefined,
  viewingUpdates: boolean,
) {
  const router = useRouter();
  const previous = useRef<{ account: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!account || !rows) {
      previous.current = null;
      return;
    }
    const ids = new Set(
      rows.flatMap((row) => (row.unreadId ? [row.unreadId] : [])),
    );
    const snapshot = previous.current;
    previous.current = { account, ids };
    if (
      snapshot?.account !== account ||
      (viewingUpdates && document.visibilityState === "visible") ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;

    const fresh = [...ids].filter((id) => !snapshot.ids.has(id));
    if (fresh.length)
      void showUpdate(fresh.length, `lendloop-${fresh[0]}`, () =>
        router.push(updatesPath),
      ).catch(() => {
        // Updates and its badge remain available if the browser cannot alert.
      });
  }, [account, rows, viewingUpdates, router]);
}
