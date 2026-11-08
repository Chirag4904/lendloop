"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Compass, Inbox, Package, UserRound, Wrench } from "lucide-react";
import { useCurrentProfile } from "@/components/use-current-profile";

const items = [
  { href: "/dashboard", label: "Explore", icon: Compass },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/requests", label: "Requests", icon: Compass },
  { href: "/dashboard/incoming", label: "Incoming", icon: Inbox },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

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
  const navigation = items.map(({ href, label, icon: Icon }) => (
    <Link
      href={href}
      key={href}
      className={pathname === href ? "active" : ""}
      aria-current={pathname === href ? "page" : undefined}
    >
      <Icon size={19} />
      {label}
    </Link>
  ));
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="shell app-header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <Wrench size={20} />
            </span>
            LendLoop<span className="brand-dot">.</span>
          </Link>
          <nav className="desktop-nav" aria-label="Dashboard navigation">
            {navigation}
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile dashboard navigation">
        {navigation}
      </nav>
    </div>
  );
}
