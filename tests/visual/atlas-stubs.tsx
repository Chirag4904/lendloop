import React from "react";
import { getFunctionName } from "convex/server";
export const items = [
  "Cordless drill",
  "Weekend camping tent",
  "Garden pruner",
  "Portable projector",
  "Stand mixer",
  "Step ladder",
].map((name, i) => ({
  id: `tool${i}`,
  name,
  category: [
    "Power Tools",
    "Camping & Outdoors",
    "Garden",
    "Electronics",
    "Kitchen",
    "Other",
  ][i],
  condition: "good",
  description:
    "Ready for your next project. Includes the original accessories and a carry case. Please return clean and dry.",
  dailyAmount: i === 2 ? null : 15000 + i * 2500,
  active: true,
  archived: false,
  distanceMeters: 0,
  ownerName: "Asha",
  isOwner: false,
  trustedLender: true,
  photos: [
    {
      id: `photo${i}`,
      url: `/images/demo-rizvi/${["drill", "tent", "pruner", "projector", "mixer", "ladder"][i]}.jpg`,
    },
  ],
}));
const profile = {
  displayName: "Asha Mehta",
  societyId: "society1",
  role: "admin",
  trustedLender: true,
  trustedBorrower: true,
};
export const useConvexAuth = () => ({
  isAuthenticated: true,
  isLoading: false,
});
export const useUser = () => ({ user: null });
export const UserButton = () => (
  <button
    aria-label="Account"
    style={{
      borderRadius: 40,
      padding: 10,
      background: "#d9f36a",
      color: "#152d3b",
    }}
  >
    AM
  </button>
);
export const useRouter = () => ({ replace: () => {} });
export const usePathname = () => {
  const v = new URLSearchParams(location.search).get("view");
  return v === "explore"
    ? "/dashboard"
    : v === "admin"
      ? "/admin"
      : `/dashboard/${v}`;
};
export default function Link({
  href,
  children,
  ...rest
}: React.ComponentProps<"a">) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
export function useMutation() {
  return async () => {
    throw new Error("Mutations disabled in visual QA");
  };
}
export function usePaginatedQuery(ref: never) {
  const results =
    getFunctionName(ref) === "admin:listings"
      ? items.slice(0, 3).map((item, index) => ({
          ...item,
          owner: "A neighbor",
          society: "Paper Gardens",
          societyId: "society1",
          status: "active",
          coverUrl: index === 1 ? null : item.photos[0].url,
          createdAt: 1794200000000,
          updatedAt: 1794200000000,
        }))
      : [];
  return { results, status: "Exhausted", loadMore: () => {} };
}
export function useQuery(ref: never, args?: Record<string, unknown>) {
  const name = getFunctionName(ref);
  if (name === "users:me") return profile;
  if (name === "societies:search")
    return [
      {
        _id: "society1",
        name: "Paper Gardens",
        locality: "Illustrative neighborhood",
        city: "Demo city",
      },
    ];
  if (name === "tools:explore") {
    Object.assign(window, { __atlasExploreArgs: args });
    return items.filter(
      (x) =>
        (!args?.text ||
          x.name.toLowerCase().includes(String(args.text).toLowerCase())) &&
        (!args?.category || x.category === args.category) &&
        (args?.price !== "free" || x.dailyAmount === null) &&
        (args?.price !== "paid" || x.dailyAmount !== null),
    );
  }
  if (name === "tools:mine")
    return items.map((x, i) => ({ ...x, isOwner: true, active: i !== 2 }));
  if (name === "tools:detail")
    return new URLSearchParams(location.search).get("view") === "detail-multi"
      ? {
          ...items[0],
          photos: [
            items[0].photos[0],
            {
              ...items[0].photos[0],
              id: "photo-second",
              url: "/images/demo-rizvi/ladder.jpg",
            },
          ],
        }
      : items[0];
  if (name === "requests:availability") return true;
  if (name === "requests:reservedDates")
    return args?.month === "2026-11"
      ? [{ startDate: "2026-11-10", endDate: "2026-11-12" }]
      : [];
  if (name.startsWith("requests:"))
    return ["pending", "awaiting_borrower", "approved"].map((status, i) => ({
      id: `request${i}`,
      toolId: `tool${i}`,
      toolName: items[i].name,
      coverUrl: items[i].photos[0].url,
      otherName: "Rohan",
      trusted: true,
      status,
      loanStatus: i === 2 ? "returned" : null,
      loanId: i === 2 ? "loan1" : null,
      startDate: "2026-11-12",
      endDate: "2026-11-13",
      days: 2,
      rateMinor: 15000,
      totalMinor: 30000,
      listedRateMinor: 15000,
      borrowerOfferMinor: i === 1 ? 10000 : null,
      lenderCounterMinor: i === 1 ? 12500 : null,
      priceDecision: i === 1 ? "countered" : null,
      createdAt: 1794200000000,
      lenderRespondedAt: 1794200010000,
    }));
  if (name === "automation:mine")
    return [
      {
        id: "event1",
        message: "Your request for the cordless drill was approved.",
        status: "delivered",
        createdAt: 1794200000000,
      },
      {
        id: "event2",
        message: "The lender suggested a new price.",
        status: "retry_pending",
        createdAt: 1794190000000,
      },
    ];
  if (name === "admin:access") return true;
  if (name === "admin:overview")
    return {
      users: 24,
      listings: 16,
      activeLoans: 4,
      pendingRequests: 3,
      overdueLoans: 1,
      pendingSuggestions: 2,
      failedEvents: 0,
      capped: {},
    };
  return [];
}
