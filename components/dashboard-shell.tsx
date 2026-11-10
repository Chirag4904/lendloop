"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Compass, Package, UserRound, Activity } from "lucide-react";
import { useCurrentProfile } from "@/hooks/use-current-profile";

const items = [
  { href: "/dashboard", label: "Explore", icon: Compass },
  { href: "/dashboard/requests", label: "My Activity", icon: Activity },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/notifications", label: "Updates", icon: Bell },
];

function DashboardNavigation({
  pathname,
  mobile = false,
}: {
  pathname: string;
  mobile?: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const container = nav.current;
    if (!container) return;
    const indicator = container.querySelector<HTMLElement>(".nav-indicator");
    if (!indicator) return;
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
      className={mobile ? "mobile-nav" : "desktop-nav"}
      aria-label={
        mobile ? "Mobile dashboard navigation" : "Dashboard navigation"
      }
    >
      <span className="nav-indicator" aria-hidden="true" />
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/dashboard/requests" &&
            pathname === "/dashboard/incoming");
        return (
          <Link
            href={href}
            key={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              if (event.detail === 0 && !active && nav.current)
                nav.current.dataset.instant = "true";
            }}
          >
            <Icon size={19} />
            {label}
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
    <div className="app-layout">
      <header className="app-header">
        <div className="shell app-header-inner">
          <Link className="wordmark" href="/">
            ↔ lendloop.
          </Link>
          <DashboardNavigation pathname={pathname} />
          <Link
            className="profile-link"
            href="/dashboard/profile"
            aria-label="Profile"
          >
            <UserRound size={18} />
            <span>Profile</span>
          </Link>
          {profile.role === "admin" && (
            <Link className="text-link" href="/admin">
              Admin
            </Link>
          )}
          <UserButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
      <DashboardNavigation pathname={pathname} mobile />
    </div>
  );
}
