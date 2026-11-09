import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/dashboard-shell";
import { DashboardView } from "../../components/dashboard-view";
import { ToolDetail } from "../../components/marketplace";
import { Admin } from "../../components/admin";
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
    {view === "admin" ? (
      <Admin section="overview" />
    ) : (
      <DashboardShell>
        {view === "detail" ? (
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
