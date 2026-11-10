"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { PackageOpen } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { ToolCard, type Tool } from "./tool-card";
import styles from "./my-listings.module.css";

export function MyListings() {
  const tools = useQuery(api.tools.mine, {});
  const setStatus = useMutation(api.tools.setStatus);
  const [error, setError] = useState("");
  async function change(
    tool: Tool,
    status: "active" | "unlisted" | "archived",
  ) {
    if (
      status === "archived" &&
      !window.confirm(`Archive ${tool.name}? This cannot be undone.`)
    )
      return;
    try {
      setError("");
      await setStatus({ toolId: tool.id, status });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section>
      <div className={styles.heading}>
        <div className="app-heading">
          <span className="kicker">YOUR SHELF</span>
          <h1>Your little lending shelf.</h1>
          <p>Good things are even better when they’re shared.</p>
        </div>
        <Button asChild className={`button-primary ${styles.listItem}`}>
          <Link href="/dashboard/listings/new">List an item</Link>
        </Button>
      </div>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
      {tools === undefined ? (
        <Loader label="Loading your listings…" />
      ) : tools.length ? (
        <div className={styles.grid}>
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              actions={
                <div className={styles.actions}>
                  {!tool.archived && (
                    <>
                      <Button asChild variant="ghost">
                        <Link href={`/dashboard/listings/${tool.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          void change(tool, tool.active ? "unlisted" : "active")
                        }
                      >
                        {tool.active ? "Unlist" : "Relist"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={styles.archive}
                        onClick={() => void change(tool, "archived")}
                      >
                        Archive
                      </Button>
                    </>
                  )}
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <div className="app-empty">
          <PackageOpen size={36} />
          <h2>Your shelf is ready.</h2>
          <p>List something useful for a neighbor to borrow.</p>
          <Button asChild className="button-primary leading-[inherit]">
            <Link href="/dashboard/listings/new">
              Create your first listing
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
