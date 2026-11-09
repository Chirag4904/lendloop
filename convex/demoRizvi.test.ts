/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

test("Rizvi demo seed is guarded, scoped, repeatable and links a photo", async () => {
  const t = convexTest(schema, modules);
  const societyId = await t.run((ctx) =>
    ctx.db.insert("societies", {
      name: "Rizvi Oak CHSL",
      city: "Mumbai",
      locality: "Malad East",
      latitude: 19.1910847,
      longitude: 72.8594472,
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    }),
  );
  await expect(
    t.mutation(internal.demoRizvi.seed, { societyId }),
  ).rejects.toThrow("disabled");
  process.env.LENDLOOP_DEMO_SEED_ALLOWED = "true";
  try {
    const wrongSocietyId = await t.run((ctx) =>
      ctx.db.insert("societies", {
        name: "Other Society",
        city: "Mumbai",
        locality: "Malad East",
        latitude: 19.19,
        longitude: 72.86,
        status: "active",
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    await expect(
      t.mutation(internal.demoRizvi.seed, { societyId: wrongSocietyId }),
    ).rejects.toThrow("Target society unavailable");
    expect(await t.mutation(internal.demoRizvi.seed, { societyId })).toEqual({
      users: 4,
      tools: 8,
    });
    expect(await t.mutation(internal.demoRizvi.seed, { societyId })).toEqual({
      users: 0,
      tools: 0,
    });
    const uploads = await t.mutation(internal.demoRizvi.preparePhotos, {
      societyId,
    });
    expect(uploads).toHaveLength(8);
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
          type: "image/jpeg",
        }),
      ),
    );
    expect(
      await t.mutation(internal.demoRizvi.attachPhotos, {
        societyId,
        photos: [{ key: "drill", storageId }],
      }),
    ).toBe(1);
    expect(
      await t.mutation(internal.demoRizvi.attachPhotos, {
        societyId,
        photos: [{ key: "drill", storageId }],
      }),
    ).toBe(0);
    const rows = await t.run((ctx) =>
      ctx.db
        .query("tools")
        .withIndex("by_society_active", (q) =>
          q.eq("societyId", societyId).eq("active", true),
        )
        .take(20),
    );
    expect(rows).toHaveLength(8);
    expect(
      rows.find((row) => row.name === "Demo · Cordless drill kit")?.photoIds,
    ).toHaveLength(1);
  } finally {
    delete process.env.LENDLOOP_DEMO_SEED_ALLOWED;
  }
});
