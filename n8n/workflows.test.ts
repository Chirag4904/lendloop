// @vitest-environment node
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

const requireNode = createRequire(import.meta.url);
const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`${name}.json`, import.meta.url), "utf8"));

test("exports contain connected, parseable nodes and a real error workflow", () => {
  for (const name of [
    "request-notification",
    "overdue-reminders",
    "error-handler",
  ]) {
    const workflow = load(name);
    const names = new Set(
      workflow.nodes.map((node: { name: string }) => node.name),
    );
    expect(workflow.nodes.length).toBeGreaterThan(1);
    for (const [from, outputs] of Object.entries(workflow.connections) as [
      string,
      { main: { node: string }[][] },
    ][]) {
      expect(names.has(from)).toBe(true);
      for (const branch of outputs.main)
        for (const edge of branch) expect(names.has(edge.node)).toBe(true);
    }
    for (const node of workflow.nodes)
      if (node.type === "n8n-nodes-base.code")
        new (Object.getPrototypeOf(async function () {}).constructor)(
          node.parameters.jsCode,
        );
  }
  expect(
    load("request-notification").nodes.some(
      (node: { type: string }) => node.type === "n8n-nodes-base.webhook",
    ),
  ).toBe(true);
  expect(
    load("overdue-reminders").nodes.some(
      (node: { type: string }) =>
        node.type === "n8n-nodes-base.scheduleTrigger",
    ),
  ).toBe(true);
  expect(
    load("error-handler").nodes.some(
      (node: { type: string }) => node.type === "n8n-nodes-base.errorTrigger",
    ),
  ).toBe(true);
  for (const name of ["request-notification", "overdue-reminders"])
    for (const node of load(name).nodes.filter(
      (item: { type: string }) => item.type === "n8n-nodes-base.httpRequest",
    )) {
      expect(node.retryOnFail).toBe(true);
      expect(node.maxTries).toBe(3);
    }
});

test("request workflow checks the exact raw body and rejects tampering", async () => {
  const node = load("request-notification").nodes.find(
    (item: { name: string }) => item.name === "Verify signature",
  );
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction(
    "$input",
    "$env",
    "require",
    node.parameters.jsCode,
  );
  const body = JSON.stringify({
    eventId: "evt",
    type: "borrow_request.created",
    lease: "lease",
    toolName: "Drill",
  });
  const timestamp = String(Date.now()),
    nonce = "a0b1c2d3-1234-4567-89ab-0123456789ab",
    secret = "test-outbound-secret";
  const signature = createHmac("sha256", secret)
    .update(`POST\n/webhook/lendloop-request\n${timestamp}\n${nonce}\n${body}`)
    .digest("hex");
  const execute = (raw: string, sig = signature) =>
    run.call(
      { helpers: { getBinaryDataBuffer: async () => Buffer.from(raw) } },
      {
        first: () => ({
          json: {
            headers: {
              "x-lendloop-timestamp": timestamp,
              "x-lendloop-nonce": nonce,
              "x-lendloop-signature": sig,
            },
          },
          binary: { data: {} },
        }),
      },
      { LENDLOOP_OUTBOUND_SECRET: secret },
      requireNode,
    );
  expect((await execute(body))[0].json).toMatchObject({
    valid: true,
    eventId: "evt",
  });
  expect((await execute(body + " "))[0].json.valid).toBe(false);
  expect((await execute(body, "0".repeat(64)))[0].json.valid).toBe(false);
});

test("signing nodes run without URL and sign the exact request path", async () => {
  const origin = "https://lendloop-dev.convex.site";
  const secret = "test-inbound-secret";
  const input = {
    cursor: "a+/=",
    eventId: "event",
    lease: "lease",
    message: "Request received",
    loanId: "loan",
    claim: { key: "overdue:loan:2026-11-10", lease: "lease" },
  };
  for (const [workflow, name, method, path] of [
    [
      "request-notification",
      "Sign delivery acknowledgement",
      "POST",
      "/automation/events/complete",
    ],
    [
      "overdue-reminders",
      "Sign overdue page",
      "GET",
      "/automation/overdue-loans?cursor=a%2B%2F%3D",
    ],
    [
      "overdue-reminders",
      "Sign reminder claim",
      "POST",
      "/automation/reminders/claim",
    ],
    [
      "overdue-reminders",
      "Sign mock delivery",
      "POST",
      "/automation/reminders/complete",
    ],
  ]) {
    const node = load(workflow).nodes.find(
      (item: { name: string }) => item.name === name,
    );
    const [{ json }] = await runInNewContext(
      "(async () => {\n" + node.parameters.jsCode + "\n})()",
      {
        $input: {
          first: () => ({ json: input }),
          all: () => [{ json: input }],
        },
        $env: {
          LENDLOOP_INBOUND_SECRET: secret,
          LENDLOOP_CONVEX_SITE_URL: origin + "/",
        },
        require: requireNode,
      },
    );
    expect(json.url).toBe(origin + path);
    expect(json.signature).toBe(
      createHmac("sha256", secret)
        .update(
          [method, path, json.timestamp, json.nonce, json.body].join("\n"),
        )
        .digest("hex"),
    );
  }
});
