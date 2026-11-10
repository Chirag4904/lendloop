export const price = (amount: number | null) =>
  amount === null
    ? "Free to borrow"
    : `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount / 100)} / day`;
export const relation = (distance: number) =>
  distance === 0
    ? "Your society"
    : distance < 0
      ? "Nearby society"
      : `About ${Math.round(distance)} m away`;
