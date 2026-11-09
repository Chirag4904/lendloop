import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/dashboard-shell";
import { DashboardView } from "../../components/dashboard-view";
import { ToolDetail } from "../../components/marketplace";
import { ListingForm } from "../../components/listing-form";
import { Admin } from "../../components/admin";
import { LoanDetail } from "../../components/borrowing";
const view = new URLSearchParams(location.search).get("view") || "explore";
createRoot(document.getElementById("root")!).render(
  <>
    <div
      style={{
        padding: 8,
        background: "#d9f36a",
        color: "#152d3b",
        fontSize: 12,
      }}
    >
      Visual QA fixture · synthetic data · no live account or mutations
    </div>
    {view === "admin" || view === "admin-listings" ? (
      <Admin section={view === "admin" ? "overview" : "listings"} />
    ) : (
      <DashboardShell>
        {view === "loan" ||
        view === "loan-borrower" ||
        view === "loan-shared" ? (
          <LoanDetail loanId={"loan0" as never} />
        ) : view === "listing-new" || view === "listing-edit" ? (
          <ListingForm
            toolId={view === "listing-edit" ? ("tool0" as never) : undefined}
          />
        ) : view === "detail" ||
          view === "detail-multi" ||
          view === "detail-owner" ? (
          <ToolDetail toolId={"tool0" as never} />
        ) : (
          <DashboardView
            section={view === "explore" ? undefined : (view as never)}
          />
        )}
      </DashboardShell>
    )}
  </>,
);
