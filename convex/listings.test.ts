/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
const auth = (subject: string) => ({
  subject,
  tokenIdentifier: `test|${subject}`,
});
const item = {
  name: "Cordless drill",
  category: "Power Tools" as const,
  condition: "good" as const,
  description: "Drill and two batteries",
};
async function setup() {
  const t = convexTest(schema, modules);
  const societies = await t.run(async (ctx) => {
    const now = Date.now();
    const ids = [];
    for (const [name, longitude] of [
      ["Home", 73.8],
      ["Near", 73.804],
      ["Middle", 73.808],
      ["Far", 73.812],
    ] as const)
      ids.push(
        await ctx.db.insert("societies", {
          name,
          city: "Pune",
          locality: "Baner",
          latitude: 18.55,
          longitude,
          status: "active",
          createdAt: now,
          updatedAt: now,
        }),
      );
    return ids;
  });
  const people = ["one", "two", "three", "four"].map((name) =>
    t.withIdentity(auth(name)),
  );
  for (const [i, person] of people.entries()) {
    await person.mutation(api.users.ensureCurrent, {
      displayName: `Neighbor ${i}`,
    });
    await person.mutation(api.users.selectSociety, { societyId: societies[i] });
  }
  return { t, people, societies };
}

test("creation requires onboarding, validates fields, and assigns the caller's society", async () => {
  const { t, people, societies } = await setup();
  await expect(t.mutation(api.tools.create, item)).rejects.toThrow(
    "Authentication required",
  );
  await expect(
    people[0].mutation(api.tools.create, {
      ...item,
      category: "Cars",
    } as never),
  ).rejects.toThrow();
  await expect(
    people[0].mutation(api.tools.create, { ...item, dailyAmount: 0 }),
  ).rejects.toThrow();
  await expect(
    people[0].mutation(api.tools.create, { ...item, dailyAmount: 1.5 }),
  ).rejects.toThrow();
  await expect(
    people[0].mutation(api.tools.create, {
      ...item,
      societyId: societies[1],
    } as never),
  ).rejects.toThrow();
  const id = await people[0].mutation(api.tools.create, {
    ...item,
    dailyAmount: 15000,
  });
  const row = await t.run((ctx) => ctx.db.get(id));
  expect(row).toMatchObject({
    societyId: societies[0],
    pricing: { dailyAmount: 15000, currency: "INR" },
    active: false,
  });
  expect(await t.query(api.tools.publicList, {})).toEqual([]);
  await people[0].mutation(api.tools.setStatus, {
    toolId: id,
    status: "active",
  });
  expect(await t.query(api.tools.publicList, {})).toEqual([
    { name: item.name, category: item.category },
  ]);
});

test("only the owner changes status, content and photos; archived tools disappear", async () => {
  const { t, people } = await setup();
  const id = await people[0].mutation(api.tools.create, item);
  await expect(
    people[1].mutation(api.tools.update, {
      toolId: id,
      ...item,
      name: "Stolen",
    }),
  ).rejects.toThrow("Listing unavailable");
  await expect(
    people[1].mutation(api.tools.setStatus, { toolId: id, status: "unlisted" }),
  ).rejects.toThrow("Listing unavailable");
  await expect(
    people[1].mutation(api.photos.setForTool, { toolId: id, photoIds: [] }),
  ).rejects.toThrow("Listing unavailable");
  await people[0].mutation(api.tools.update, {
    toolId: id,
    ...item,
    name: "Updated drill",
  });
  await people[0].mutation(api.tools.setStatus, {
    toolId: id,
    status: "active",
  });
  await people[0].mutation(api.tools.setStatus, {
    toolId: id,
    status: "unlisted",
  });
  expect(await t.query(api.tools.publicList, {})).toEqual([]);
  await people[0].mutation(api.tools.setStatus, {
    toolId: id,
    status: "active",
  });
  expect(await t.query(api.tools.publicList, {})).toHaveLength(1);
  await people[0].mutation(api.tools.setStatus, {
    toolId: id,
    status: "archived",
  });
  expect(await t.query(api.tools.publicList, {})).toEqual([]);
  await expect(
    people[0].mutation(api.tools.setStatus, { toolId: id, status: "active" }),
  ).rejects.toThrow("Archived");
});

test("discovery starts at home and respects 500 m and 1 km scopes", async () => {
  const { people } = await setup();
  for (const [i, person] of people.entries()) {
    const id = await person.mutation(api.tools.create, {
      ...item,
      name: `Tool ${i}`,
      category: i === 0 ? "Garden" : "Power Tools",
      dailyAmount: i === 0 ? undefined : 500,
    });
    await person.mutation(api.tools.setStatus, {
      toolId: id,
      status: "active",
    });
  }
  const browse = (scope: "society" | "500" | "1000", category?: "Garden") =>
    people[0].query(api.tools.explore, {
      scope,
      category,
      text: "",
      price: "all",
      sort: "nearest",
    });
  expect(
    (await browse("society")).map((x: { name: string }) => x.name),
  ).toEqual(["Tool 0"]);
  expect((await browse("500")).map((x: { name: string }) => x.name)).toEqual([
    "Tool 0",
    "Tool 1",
  ]);
  expect((await browse("1000")).map((x: { name: string }) => x.name)).toEqual([
    "Tool 0",
    "Tool 1",
    "Tool 2",
  ]);
  expect(await browse("1000", "Garden")).toHaveLength(1);
  expect(
    await people[0].query(api.tools.explore, {
      scope: "1000",
      text: "tool",
      price: "free",
      sort: "nearest",
    }),
  ).toHaveLength(1);
});

test("photo registration rejects oversized, invalid and another owner's images", async () => {
  const { t, people } = await setup();
  const toolId = await people[0].mutation(api.tools.create, item);
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l3sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const fingerprint = (bytes: Uint8Array) =>
    createHash("sha256").update(bytes).digest("base64");
  const { ticketId } = await people[0].mutation(api.photos.uploadUrl, {
    sha256: fingerprint(png),
  });
  const id = await t.run((ctx) =>
    ctx.storage.store(new Blob([png], { type: "image/png" })),
  );
  await expect(
    people[1].mutation(api.photos.register, { ticketId, storageId: id }),
  ).rejects.toThrow("Upload expired");
  const wrongTicket = await people[0].mutation(api.photos.uploadUrl, {
    sha256: fingerprint(new Uint8Array([1, 2, 3])),
  });
  await expect(
    people[0].mutation(api.photos.register, {
      ticketId: wrongTicket.ticketId,
      storageId: id,
    }),
  ).rejects.toThrow("Upload unavailable");
  const photoId = await people[0].mutation(api.photos.register, {
    ticketId,
    storageId: id,
  });
  await expect(
    people[1].mutation(api.photos.setForTool, { toolId, photoIds: [photoId] }),
  ).rejects.toThrow("Listing unavailable");
  await expect(
    people[0].mutation(api.photos.setForTool, {
      toolId,
      photoIds: Array(6).fill(photoId),
    }),
  ).rejects.toThrow("five");
  await people[0].mutation(api.photos.setForTool, {
    toolId,
    photoIds: [photoId],
  });
  const otherTool = await people[1].mutation(api.tools.create, item);
  await expect(
    people[1].mutation(api.photos.setForTool, {
      toolId: otherTool,
      photoIds: [photoId],
    }),
  ).rejects.toThrow("Photo unavailable");
  const secondTicket = await people[0].mutation(api.photos.uploadUrl, {
    sha256: fingerprint(png),
  });
  const secondStorageId = await t.run((ctx) =>
    ctx.storage.store(new Blob([png], { type: "image/png" })),
  );
  const secondPhotoId = await people[0].mutation(api.photos.register, {
    ticketId: secondTicket.ticketId,
    storageId: secondStorageId,
  });
  await people[0].mutation(api.photos.setForTool, {
    toolId,
    photoIds: [secondPhotoId, photoId],
  });
  expect(
    (await people[0].query(api.tools.detail, { toolId }))?.photos,
  ).toMatchObject([{ id: secondPhotoId }, { id: photoId }]);
  await people[0].mutation(api.photos.setForTool, {
    toolId,
    photoIds: [photoId],
  });
  expect(
    (await people[0].query(api.tools.detail, { toolId }))?.photos,
  ).toMatchObject([{ id: photoId }]);
  await people[0].mutation(api.photos.setForTool, { toolId, photoIds: [] });
  expect(
    (await people[0].query(api.tools.detail, { toolId }))?.photos,
  ).toHaveLength(0);
  const badBytes = new Uint8Array([1, 2, 3]);
  const ticket = await people[0].mutation(api.photos.uploadUrl, {
    sha256: fingerprint(badBytes),
  });
  const bad = await t.run((ctx) =>
    ctx.storage.store(new Blob([badBytes], { type: "image/png" })),
  );
  await expect(
    people[0].mutation(api.photos.register, {
      ticketId: ticket.ticketId,
      storageId: bad,
    }),
  ).rejects.toThrow("contents");
  const largeBytes = new Uint8Array(5_000_001);
  const largeTicket = await people[0].mutation(api.photos.uploadUrl, {
    sha256: fingerprint(largeBytes),
  });
  const large = await t.run((ctx) =>
    ctx.storage.store(new Blob([largeBytes], { type: "image/png" })),
  );
  await expect(
    people[0].mutation(api.photos.register, {
      ticketId: largeTicket.ticketId,
      storageId: large,
    }),
  ).rejects.toThrow("5 MB");
});
