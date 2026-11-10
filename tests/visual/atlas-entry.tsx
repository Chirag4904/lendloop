import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { DashboardView } from "../../components/dashboard/dashboard-view";
import { ToolDetail } from "../../components/marketplace/tool-detail";
import { ListingForm } from "../../components/listings/listing-form";
import { Admin } from "../../components/admin/admin";
import { Onboarding } from "../../components/onboarding/onboarding";
import { LoanDetail } from "../../components/borrowing/loan-detail";
import { PublicCatalog } from "../../components/public-catalog";
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
    {view === "shelf" ? (
      // Spacers give the pinned gallery a page to scroll through.
      <main>
        <div style={{ height: "60vh", background: "#152d3b" }} />
        <section id="tools" className="catalog-section">
          <PublicCatalog
            heading={
              <div className="shell section-heading">
                <div>
                  <span className="kicker">THE NEIGHBORHOOD SHELF</span>
                  <h2>
                    Find your next
                    <br />
                    <em>“just what I needed.”</em>
                  </h2>
                </div>
                <p>Synthetic catalog fixture.</p>
              </div>
            }
          />
        </section>
        <div style={{ height: "100vh" }} />
      </main>
    ) : view === "admin" || view === "admin-listings" ? (
      <Admin section={view === "admin" ? "overview" : "listings"} />
    ) : view === "onboarding" ? (
      <Onboarding />
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
