import { Compass, Inbox, Package, UserRound } from "lucide-react";
import { PublicCatalog } from "@/components/public-catalog";

const pages = {
  listings: {
    title: "My Listings",
    description: "The place for things you choose to share.",
    icon: Package,
    empty: "Your shelf is ready when you are.",
  },
  requests: {
    title: "My Requests",
    description: "Keep track of the things you ask to borrow.",
    icon: Compass,
    empty: "No requests here yet.",
  },
  incoming: {
    title: "Incoming Requests",
    description: "Requests from neighbors will appear here.",
    icon: Inbox,
    empty: "All quiet for now.",
  },
  profile: {
    title: "Profile",
    description: "Your LendLoop account and neighborhood.",
    icon: UserRound,
    empty: "Profile details are coming soon.",
  },
};

export function DashboardView({ section }: { section?: keyof typeof pages }) {
  if (!section)
    return (
      <>
        <div className="app-heading">
          <span className="kicker">EXPLORE TOOLS</span>
          <h1>Find something useful nearby.</h1>
          <p>
            Available tools are shown here with public details only. More ways
            to explore are coming in a future phase.
          </p>
        </div>
        <div className="app-catalog">
          <PublicCatalog />
        </div>
      </>
    );
  const page = pages[section];
  const Icon = page.icon;
  return (
    <>
      <div className="app-heading">
        <span className="kicker">YOUR SPACE</span>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </div>
      <div className="app-empty">
        <Icon size={34} strokeWidth={1.4} />
        <h2>{page.empty}</h2>
        <p>
          This area is part of the LendLoop foundation. Its tools and actions
          will arrive in a future phase.
        </p>
        <span className="future-tag">Coming in a future phase</span>
      </div>
    </>
  );
}
