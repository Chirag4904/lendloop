import { Profile } from "./profile";
import { RequestList } from "@/components/borrowing";
import { ExploreTools, MyListings } from "@/components/marketplace";
import { Notifications } from "@/components/notifications";

export function DashboardView({
  section,
}: {
  section?: "listings" | "requests" | "incoming" | "notifications" | "profile";
}) {
  if (!section) return <ExploreTools />;
  if (section === "listings") return <MyListings />;
  if (section === "requests") return <RequestList incoming={false} />;
  if (section === "incoming") return <RequestList incoming />;
  if (section === "notifications") return <Notifications />;
  if (section === "profile") return <Profile />;
  return null;
}
