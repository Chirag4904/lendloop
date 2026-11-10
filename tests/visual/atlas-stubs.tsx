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
  _id: "user1",
  displayName: "Asha Mehta",
  societyId: "society1",
  role: "admin",
  trustedLender: true,
  trustedBorrower: true,
};
export const useConvexAuth = () => ({
  isAuthenticated:
    new URLSearchParams(location.search).get("view") !== "loading",
  isLoading: new URLSearchParams(location.search).get("view") === "loading",
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
export const useRouter = () => ({
  replace: (path: string) =>
    Object.assign(window, { __atlasReplacedPath: path }),
  push: (path: string) => Object.assign(window, { __atlasPushedPath: path }),
});
export const usePathname = () => {
  const search = React.useSyncExternalStore(
    (callback) => {
      window.addEventListener("popstate", callback);
      return () => window.removeEventListener("popstate", callback);
    },
    () => location.search,
    () => "?view=explore",
  );
  const v = new URLSearchParams(search).get("view");
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
type ListingStatus = "active" | "unlisted" | "archived";
const listingStatuses = new Map<string, ListingStatus>();
const removedListings = new Set<string>();
let loanReturnStatus: "return_pending" | "returned" | undefined;

export function useMutation(ref: never) {
  const [, refresh] = React.useReducer((version: number) => version + 1, 0);
  return async (
    args:
      | { toolId: string; status: ListingStatus }
      | { toolId: string }
      | { loanId: string }
      | { ids: string[] },
  ) => {
    const name = getFunctionName(ref);
    const fixtureMutation = (
      window as Window & {
        __atlasMutation?: (name: string, args: unknown) => unknown;
      }
    ).__atlasMutation;
    if (fixtureMutation) return fixtureMutation(name, args);
    if (name === "automation:markRead") {
      Object.assign(window, { __atlasReadArgs: args });
      return null;
    }
    if (name === "loans:saveHandover") {
      Object.assign(window, { __atlasHandoverArgs: args });
      return null;
    }
    if (
      (name === "loans:reportReturn" || name === "loans:confirmReturn") &&
      "loanId" in args &&
      args.loanId === "loan0"
    ) {
      loanReturnStatus =
        name === "loans:reportReturn" ? "return_pending" : "returned";
      refresh();
      return null;
    }
    if (name === "tools:setStatus" && "status" in args) {
      listingStatuses.set(args.toolId, args.status);
      refresh();
      return null;
    }
    if (name === "admin:removeListing" && "toolId" in args) {
      removedListings.add(args.toolId);
      refresh();
      return null;
    }
    throw new Error("Mutations disabled in visual QA");
  };
}
export function usePaginatedQuery(
  ref: never,
  args?: Record<string, unknown> | "skip",
) {
  if (getFunctionName(ref) === "requests:activityPage") {
    if (args === "skip")
      return { results: [], status: "Exhausted", loadMore: () => {} };
    const rows = fixtureQuery(ref, args) as {
      status: string;
      loanStatus: string | null;
    }[];
    return {
      results: rows.filter((row) =>
        row.loanStatus
          ? row.loanStatus === args?.kind
          : row.status === args?.kind,
      ),
      status: "Exhausted",
      loadMore: () => {},
    };
  }
  const results =
    getFunctionName(ref) === "admin:listings"
      ? items.slice(0, 3).map((item, index) => ({
          ...item,
          owner: "A neighbor",
          society: "Paper Gardens",
          societyId: "society1",
          status: removedListings.has(item.id) ? "removed" : "active",
          coverUrl: index === 1 ? null : item.photos[0].url,
          createdAt: 1794200000000,
          updatedAt: 1794200000000,
        }))
      : [];
  return { results, status: "Exhausted", loadMore: () => {} };
}
export const useQuery = fixtureQuery;
function fixtureQuery(ref: never, args?: Record<string, unknown> | "skip") {
  const name = getFunctionName(ref);
  if (args === "skip") return undefined;
  if (name === "users:me")
    return new URLSearchParams(location.search).get("view") === "onboarding"
      ? { ...profile, societyId: undefined }
      : profile;
  if (name === "handover:mine")
    return {
      phone: "+91 98765 43210",
      pickupPoint: "Lobby",
      instructions: "Call on arrival",
      returnInstructions: "Leave with security",
    };
  const pendingReturn = new URLSearchParams(location.search).has(
    "pendingReturn",
  );
  if (name === "automation:loanActivity")
    return [
      {
        id: "event0",
        message: "return · confirmed",
        at: 1794200000000,
        status: "failed",
      },
      ...(pendingReturn
        ? [
            {
              id: "event1",
              message: "Return reported",
              at: 1794200000000,
              status: "delivered",
            },
            {
              id: "event2",
              message: "Return update",
              at: 1794200000000,
              status: "retry_pending",
            },
          ]
        : []),
    ];
  if (name === "loans:detail") {
    const status =
      loanReturnStatus ?? (pendingReturn ? "return_pending" : "reserved");
    return {
      id: "loan0",
      toolName: "Cordless drill",
      coverUrl: items[0].photos[0].url,
      borrowerName: "Rohan",
      lenderName: "Asha",
      isLender:
        new URLSearchParams(location.search).get("view") !== "loan-borrower",
      startDate: "2026-11-09",
      endDate: "2026-11-12",
      days: 4,
      rateMinor: 15000,
      totalMinor: 60000,
      status,
      overdue: false,
      requestCreatedAt: 1794200000000,
      approvedAt: 1794200000000,
      returnReportedAt: status === "reserved" ? null : 1794200000000,
      returnedAt: status === "returned" ? 1794200001000 : null,
      details:
        new URLSearchParams(location.search).get("view") === "loan-shared"
          ? [
              {
                authorId: "user0",
                isMine: true,
                authorName: "Asha",
                phone: "+91 98765 43210",
                pickupPoint: null,
                instructions: null,
                returnInstructions: null,
                updatedAt: 1794200000000,
              },
            ]
          : [],
    };
  }
  if (name === "societies:search")
    return [
      {
        _id: "society1",
        name: "Paper Gardens",
        locality: "Illustrative neighborhood",
        city: "Demo city",
      },
    ].filter((s) =>
      `${s.name} ${s.locality} ${s.city}`.toLowerCase().includes(
        String(args?.term ?? "")
          .trim()
          .toLowerCase(),
      ),
    );
  if (name === "suggestions:mine")
    return [{ name: "Oak Court", status: "pending", societyName: null }];
  if (name === "tools:publicList")
    return items.map(({ name, category }) => ({
      name: `Demo · ${name}`,
      category,
    }));
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
    return items.map((x, i) => {
      const status =
        listingStatuses.get(x.id) ?? (i === 2 ? "unlisted" : "active");
      return {
        ...x,
        isOwner: true,
        active: status === "active",
        archived: status === "archived",
      };
    });
  if (name === "tools:detail")
    return new URLSearchParams(location.search).get("view") === "detail-owner"
      ? { ...items[0], isOwner: true }
      : new URLSearchParams(location.search).get("view") === "detail-multi"
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
  const pendingOffer =
    (name === "requests:incoming" ||
      (name === "requests:activityPage" && args?.incoming)) &&
    new URLSearchParams(location.search).has("pendingOffer");
  if (name === "requests:activityTarget") return null;
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
      borrowerOfferMinor: i === 1 || (i === 0 && pendingOffer) ? 10000 : null,
      lenderCounterMinor: i === 1 ? 12500 : null,
      priceDecision: i === 1 ? "countered" : null,
      createdAt: 1794200000000,
      lenderRespondedAt: 1794200010000,
    }));
  if (name === "automation:mine") {
    const state = new URLSearchParams(location.search).get("updates");
    if (state === "loading") return undefined;
    if (state === "empty") return [];
    return [
      {
        id: "event1",
        type: "borrow_request.created",
        href: "/dashboard/incoming#request-request0",
        message: "Your request for the cordless drill was approved.",
        status: "delivered",
        createdAt: 1794200000000,
        unreadId: state === "unread" ? "notification1" : null,
      },
      {
        id: "event2",
        type: "lender.countered",
        href: "/dashboard/requests#request-request1",
        message: "The lender suggested a new price.",
        status: "retry_pending",
        createdAt: 1794190000000,
        unreadId: null,
      },
      ...(state === "sent"
        ? [
            {
              id: "event3",
              type: "overdue",
              href: "/dashboard/loans/loan1",
              message: "Overdue reminder",
              status: "sent",
              createdAt: 1794180000000,
              unreadId: null,
            },
          ]
        : []),
    ];
  }
  if (name === "admin:access")
    return !new URLSearchParams(location.search).has("adminDenied");
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
