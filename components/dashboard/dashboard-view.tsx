import { Profile } from "@/components/profile/profile";
import { RequestList } from "@/components/borrowing/borrowing";
import { ExploreTools } from "@/components/marketplace/explore";
import { MyListings } from "@/components/marketplace/my-listings";
import { Notifications } from "@/components/notifications/notifications";

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
