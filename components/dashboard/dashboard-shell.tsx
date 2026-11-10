"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Compass, Package, UserRound, Activity } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBrowserUpdates } from "@/hooks/use-browser-updates";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./dashboard-shell.module.css";

const items = [
  { href: "/dashboard", label: "Explore", icon: Compass },
  { href: "/dashboard/requests", label: "My Activity", icon: Activity },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/notifications", label: "Updates", icon: Bell },
];

function DashboardNavigation({
  pathname,
  unread,
  mobile = false,
}: {
  pathname: string;
  unread: number;
  mobile?: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const container = nav.current;
    const indicator = marker.current;
    if (!container || !indicator) return;
    function position() {
      if (!container || !indicator || !container.offsetWidth) return;
      const active = container.querySelector<HTMLElement>(
        'a[aria-current="page"]',
      );
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      const rect = active.getBoundingClientRect();
      const parent = container.getBoundingClientRect();
      indicator.style.width = `${rect.width}px`;
      indicator.style.height = `${rect.height}px`;
      indicator.style.transform = `translate3d(${rect.left - parent.left}px, ${rect.top - parent.top}px, 0)`;
      indicator.style.opacity = "1";
      if (!container.dataset.ready)
        requestAnimationFrame(() => {
          if (container.isConnected) container.dataset.ready = "true";
        });
      if (container.dataset.instant)
        requestAnimationFrame(() => {
          delete container.dataset.instant;
        });
    }
    position();
    const observer = new ResizeObserver(position);
    observer.observe(container);
    return () => observer.disconnect();
  }, [pathname]);
  return (
    <nav
      ref={nav}
      className={cn(
        styles.navigation,
        mobile ? styles.mobileNav : styles.desktopNav,
      )}
      aria-label={
        mobile ? "Mobile dashboard navigation" : "Dashboard navigation"
      }
    >
      <span ref={marker} className={styles.indicator} aria-hidden="true" />
      {items.map(({ href, label, icon: Icon }) => {
        const showBadge = label === "Updates" && unread > 0;
        const active =
          pathname === href ||
          (href === "/dashboard/requests" &&
            pathname === "/dashboard/incoming");
        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            aria-label={showBadge ? `Updates, ${unread} unread` : undefined}
            onClick={(event) => {
              if (event.detail === 0 && !active && nav.current)
                nav.current.dataset.instant = "true";
            }}
          >
            <Icon size={19} />
            {label}
            {showBadge && (
              <span className={styles.updatesBadge} aria-hidden="true">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, loading, error } = useCurrentProfile();
  const pathname = usePathname();
  const router = useRouter();
  const updates = useQuery(
    api.automation.mine,
    profile?.societyId ? {} : "skip",
  );
  const unread = updates?.filter((row) => row.unreadId).length ?? 0;
  useBrowserUpdates(
    profile?._id,
    updates,
    pathname === "/dashboard/notifications",
  );
  useEffect(() => {
    if (profile && !profile.societyId) router.replace("/onboarding");
  }, [profile, router]);

  if (error)
    return (
      <main className="app-main" role="alert">
        Could not load your profile: {error}
      </main>
    );
  if (loading || !profile?.societyId)
    return (
      <main className="app-main" role="status">
        Preparing your neighborhood…
      </main>
    );
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={cn("shell", styles.headerInner)}>
          <Link className="wordmark" href="/">
            ↔ lendloop.
          </Link>
          <DashboardNavigation pathname={pathname} unread={unread} />
          <Button asChild variant="outline" className={styles.profileLink}>
            <Link href="/dashboard/profile" aria-label="Profile">
              <UserRound size={18} />
              <span>Profile</span>
            </Link>
          </Button>
          {profile.role === "admin" && (
            <Link className="text-link" href="/admin">
              Admin
            </Link>
          )}
          <UserButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
      <DashboardNavigation pathname={pathname} unread={unread} mobile />
    </div>
  );
}
