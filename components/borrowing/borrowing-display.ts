export const money = (minor: number) =>
  minor === 0
    ? "Free"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(minor / 100);
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
export const statusLabel = (status: string, overdue = false) =>
  overdue
    ? "Overdue"
    : ((
        {
          pending: "Pending",
          awaiting_borrower: "Your decision",
          approved: "Approved",
          declined: "Declined",
          cancelled: "Cancelled",
          reserved: "Reserved",
          return_pending: "Return awaiting confirmation",
          returned: "Returned",
        } as Record<string, string>
      )[status] ?? status);
