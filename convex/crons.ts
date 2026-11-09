import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.daily(
  "Clean abandoned listing photos",
  { hourUTC: 3 },
  internal.photos.cleanup,
  {},
);
crons.daily(
  "Clean expired photo tickets",
  { hourUTC: 4 },
  internal.photos.cleanupTickets,
  {},
);
crons.interval(
  "Prune automation nonces",
  { minutes: 5 },
  internal.automation.pruneNonces,
  {},
);
crons.interval(
  "Recover stale reminder leases",
  { minutes: 5 },
  internal.automation.recoverReminders,
  {},
);
export default crons;
