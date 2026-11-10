/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import * as societyFunctions from "./societies";

const modules = import.meta.glob("./**/*.ts");
const identity = (subject: string) => ({
  subject,
  tokenIdentifier: `test|${subject}`,
});

test("public catalog exposes only name and category", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const now = Date.now();
    const societyId = await ctx.db.insert("societies", {
      name: "Maple Court",
      city: "Pune",
      locality: "Baner",
      latitude: 18.55,
      longitude: 73.8,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const ownerId = await ctx.db.insert("users", {
      clerkUserId: "owner",
      displayName: "Asha",
      role: "user",
      trustedLender: false,
      trustedBorrower: false,
      societyId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("tools", {
      ownerId,
      societyId,
      name: "Cordless drill",
      category: "Power Tools",
      condition: "good",
      description: "Private detail",
      active: true,
      pricing: { dailyAmount: 500, currency: "INR" },
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("tools", {
      ownerId,
      societyId,
      name: "Hidden tool",
      category: "Other",
      condition: "good",
      description: "Private detail",
      active: false,
      createdAt: now,
      updatedAt: now,
    });
  });
  expect(await t.query(api.tools.publicList, {})).toEqual([
    { name: "Cordless drill", category: "Power Tools" },
  ]);
});

test("development seed is guarded, repeatable, and keeps public fields limited", async () => {
  const t = convexTest(schema, modules);
  await expect(t.mutation(internal.devSeed.seed, {})).rejects.toThrow(
    "disabled",
  );
  process.env.LENDLOOP_DEMO_SEED_ALLOWED = "true";
  try {
    expect(await t.mutation(internal.devSeed.seed, {})).toEqual({
      societies: 4,
      users: 4,
      tools: 8,
    });
    expect(await t.mutation(internal.devSeed.seed, {})).toEqual({
      societies: 0,
      users: 0,
      tools: 0,
    });
    expect((await t.query(api.societies.search, { term: "Demo" })).length).toBe(
      4,
    );
    const catalog = await t.query(api.tools.publicList, {});
    expect(catalog).toHaveLength(8);
    expect(
      catalog.every(
        (tool) => Object.keys(tool).sort().join() === "category,name",
      ),
    ).toBe(true);
  } finally {
    delete process.env.LENDLOOP_DEMO_SEED_ALLOWED;
  }
});

test("profiles require authentication and cannot grant admin or badges", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.users.ensureCurrent, { displayName: "Anon" }),
  ).rejects.toThrow("Authentication required");
  await expect(
    t.mutation(api.users.updateProfile, { displayName: "Anon" }),
  ).rejects.toThrow("Authentication required");
  const sarah = t.withIdentity(identity("sarah"));
  await sarah.mutation(api.users.ensureCurrent, { displayName: "Sarah" });
  await expect(
    sarah.mutation(api.users.updateProfile, {
      displayName: "Sarah",
      role: "admin",
    } as never),
  ).rejects.toThrow();
  await expect(
    sarah.mutation(api.users.ensureCurrent, {
      displayName: "Sarah",
      trustedLender: true,
    } as never),
  ).rejects.toThrow();
  expect(await sarah.query(api.users.me, {})).toMatchObject({
    role: "user",
    trustedLender: false,
    trustedBorrower: false,
  });
});

test("society selection changes only the caller and requires an active society", async () => {
  const t = convexTest(schema, modules);
  const [activeId, inactiveId] = await t.run(async (ctx) => {
    const fields = {
      name: "Maple Court",
      city: "Pune",
      locality: "Baner",
      latitude: 18.55,
      longitude: 73.8,
      createdAt: 1,
      updatedAt: 1,
    };
    return [
      await ctx.db.insert("societies", { ...fields, status: "active" }),
      await ctx.db.insert("societies", { ...fields, status: "inactive" }),
    ];
  });
  const sarah = t.withIdentity(identity("sarah"));
  const lee = t.withIdentity(identity("lee"));
  await sarah.mutation(api.users.ensureCurrent, { displayName: "Sarah" });
  await lee.mutation(api.users.ensureCurrent, { displayName: "Lee" });
  await expect(
    t.mutation(api.users.selectSociety, { societyId: activeId }),
  ).rejects.toThrow("Authentication required");
  await expect(
    sarah.mutation(api.users.selectSociety, { societyId: inactiveId }),
  ).rejects.toThrow("Society unavailable");
  await sarah.mutation(api.users.selectSociety, { societyId: activeId });
  await sarah.mutation(api.users.updateProfile, { displayName: "Sarah New" });
  expect(await sarah.query(api.users.me, {})).toMatchObject({
    societyId: activeId,
    displayName: "Sarah New",
  });
  const leeProfile = await lee.query(api.users.me, {});
  expect(leeProfile).toMatchObject({ displayName: "Lee" });
  expect(leeProfile?.societyId).toBeUndefined();
});

test("suggestions need authentication and never create an approved society", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.suggestions.create, { name: "Maple Court" }),
  ).rejects.toThrow("Authentication required");
  const sarah = t.withIdentity(identity("sarah"));
  await sarah.mutation(api.users.ensureCurrent, { displayName: "Sarah" });
  await sarah.mutation(api.suggestions.create, {
    name: "Maple Court",
    city: "Pune",
  });
  const state = await t.run(async (ctx) => ({
    societies: await ctx.db.query("societies").collect(),
    suggestions: await ctx.db.query("societySuggestions").collect(),
  }));
  expect(state.societies).toEqual([]);
  expect(state.suggestions[0]).toMatchObject({
    status: "pending",
    name: "Maple Court",
  });
  expect(Object.hasOwn(societyFunctions, "create")).toBe(false);
});

test("demo societies move near Rizvi without changing the real society, and sample photos attach safely", async () => {
  const t = convexTest(schema, modules);
  process.env.LENDLOOP_DEMO_SEED_ALLOWED = "true";
  try {
    const anchor = await t.run((ctx) =>
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
    await t.mutation(internal.devSeed.seed, {});
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("societies").take(10);
      for (const row of rows)
        if (row.name.startsWith("Demo ·"))
          await ctx.db.patch(row._id, {
            city: "Pune",
            locality: "Baner",
            latitude: 18,
            longitude: 73,
          });
    });
    expect(
      await t.mutation(internal.devSeed.relocateDemoSocieties, {
        societyId: anchor,
      }),
    ).toBe(4);
    expect(
      await t.mutation(internal.devSeed.relocateDemoSocieties, {
        societyId: anchor,
      }),
    ).toBe(0);
    const rows = await t.run((ctx) => ctx.db.query("societies").take(10));
    expect(
      rows.every(
        (row) =>
          row.city === "Mumbai" &&
          Math.abs(row.latitude - 19.1910847) < 0.01 &&
          Math.abs(row.longitude - 72.8594472) < 0.01,
      ),
    ).toBe(true);
    expect(rows.find((row) => row._id === anchor)?.updatedAt).toBe(0);
    expect(
      await t.mutation(internal.devSeed.prepareDemoPhotos, {}),
    ).toHaveLength(8);
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob([new Uint8Array([255, 216, 255, 217])], {
          type: "image/jpeg",
        }),
      ),
    );
    expect(
      await t.mutation(internal.devSeed.attachDemoPhotos, {
        photos: [{ key: "drill", storageId }],
      }),
    ).toBe(1);
    expect(
      await t.mutation(internal.devSeed.attachDemoPhotos, {
        photos: [{ key: "drill", storageId }],
      }),
    ).toBe(0);
  } finally {
    delete process.env.LENDLOOP_DEMO_SEED_ALLOWED;
  }
});
