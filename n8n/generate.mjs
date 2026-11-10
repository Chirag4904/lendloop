import fs from "node:fs";

const code = (name, jsCode, x, y) => ({
  name,
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [x, y],
  parameters: { mode: "runOnceForAllItems", jsCode },
});
const link = (from, to, branch = 0) => ({ from, to, branch });
const connections = (links) =>
  Object.fromEntries(
    [...new Set(links.map((x) => x.from))].map((from) => [
      from,
      {
        main: Array.from(
          {
            length:
              Math.max(
                ...links.filter((x) => x.from === from).map((x) => x.branch),
              ) + 1,
          },
          (_, i) =>
            links
              .filter((x) => x.from === from && x.branch === i)
              .map((x) => ({ node: x.to, type: "main", index: 0 })),
        ),
      },
    ]),
  );
const workflow = (id, name, nodes, links, settings = {}) => ({
  id,
  name,
  active: false,
  nodes: nodes.map((n, i) => ({ id: `${id}-${i + 1}`, ...n })),
  connections: connections(links),
  settings: { executionOrder: "v1", timezone: "Asia/Kolkata", ...settings },
  pinData: {},
  staticData: null,
  tags: [],
});
const hmac = `const crypto = require('crypto');
const secret = $env.LENDLOOP_INBOUND_SECRET;
const base = $env.LENDLOOP_CONVEX_SITE_URL;
if (!secret || !base || !base.startsWith('https://')) throw new Error('Missing secure Convex configuration');
const url = base.replace(/\\/$/, '') + path;
const timestamp = String(Date.now());
const nonce = crypto.randomUUID();
const signature = crypto.createHmac('sha256', secret).update(method + '\\n' + path + '\\n' + timestamp + '\\n' + nonce + '\\n' + body, 'utf8').digest('hex');
return [{json:{url,body,timestamp,nonce,signature}}];`;
const signedPost = (path, body) =>
  `const path = '${path}';\nconst method = 'POST';\nconst body = ${body};\n${hmac}`;
const signedGet = `const cursor = $input.first().json.cursor;\nconst path = '/automation/overdue-loans' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '');\nconst method = 'GET';\nconst body = '';\n${hmac}`;
const signedBatch = (
  path,
  expression,
  filter = "true",
) => `const crypto=require('crypto');
const secret=$env.LENDLOOP_INBOUND_SECRET, base=$env.LENDLOOP_CONVEX_SITE_URL;
if(!secret || !base || !base.startsWith('https://')) throw new Error('Missing secure Convex configuration');
const path='${path}';
const url=base.replace(/\\/$/, '') + path;
return $input.all().map(x=>x.json).filter(row=>${filter}).map(row=>{
  const body=JSON.stringify(${expression});
  const timestamp=String(Date.now()), nonce=crypto.randomUUID();
  const signature=crypto.createHmac('sha256',secret).update('POST\\n'+path+'\\n'+timestamp+'\\n'+nonce+'\\n'+body,'utf8').digest('hex');
  return {json:{url,body,timestamp,nonce,signature}};
});`;
const httpNode = (name, method, x, y) => ({
  name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [x, y],
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 2000,
  parameters: {
    method,
    url: "={{$json.url}}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "X-LendLoop-Timestamp", value: "={{$json.timestamp}}" },
        { name: "X-LendLoop-Nonce", value: "={{$json.nonce}}" },
        { name: "X-LendLoop-Signature", value: "={{$json.signature}}" },
      ],
    },
    ...(method === "POST"
      ? {
          sendBody: true,
          contentType: "raw",
          rawContentType: "application/json",
          body: "={{$json.body}}",
        }
      : {}),
    options: { timeout: 30000 },
  },
});
const boolIf = (name, field, x, y) => ({
  name,
  type: "n8n-nodes-base.if",
  typeVersion: 2.2,
  position: [x, y],
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: "",
        typeValidation: "strict",
        version: 2,
      },
      combinator: "and",
      conditions: [
        {
          id: `${name}-condition`,
          leftValue: `={{$json.${field}}}`,
          rightValue: true,
          operator: { type: "boolean", operation: "true" },
        },
      ],
    },
  },
});
const respond = (name, status, x, y) => ({
  name,
  type: "n8n-nodes-base.respondToWebhook",
  typeVersion: 1.4,
  position: [x, y],
  parameters: {
    respondWith: "json",
    responseBody:
      status === 200
        ? { delivered: true }
        : status === 401
          ? { error: "unauthorized" }
          : { error: "delivery_unavailable" },
    options: { responseCode: status },
  },
});
const verifyCode = `const crypto = require('crypto');
const input = $input.first().json;
const headers = input.headers || {};
const raw = $input.first().binary?.data ? (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8') : null;
const timestamp = headers['x-lendloop-timestamp'];
const nonce = headers['x-lendloop-nonce'];
const signature = headers['x-lendloop-signature'];
const secret = $env.LENDLOOP_OUTBOUND_SECRET;
if (!secret) throw new Error('Missing outbound secret');
let valid = !!raw && /^\\d{13}$/.test(timestamp || '') && Math.abs(Date.now()-Number(timestamp)) <= 300000 && /^[a-f0-9-]{16,100}$/i.test(nonce || '') && /^[a-f0-9]{64}$/i.test(signature || '');
if (valid) {
  const expected = crypto.createHmac('sha256', secret).update('POST\\n/webhook/lendloop-request\\n' + timestamp + '\\n' + nonce + '\\n' + raw,'utf8').digest();
  valid = crypto.timingSafeEqual(expected, Buffer.from(signature,'hex'));
}
if (!valid) return [{json:{valid:false}}];
let event;
try { event = JSON.parse(raw); } catch { return [{json:{valid:false}}]; }
const messages = {
  'borrow_request.created': 'A neighbor requested your item',
  'borrower.offer': 'A neighbor made an offer for your item',
  'borrow_request.approved': 'Your borrowing request was approved',
  'borrow_request.declined': 'Your borrowing request was declined',
  'borrow_request.cancelled': 'A borrowing request was cancelled',
  'lender.offer_accepted': 'Your offer was accepted',
  'lender.countered': 'The lender sent a counteroffer',
  'lender.kept_listed_price': 'The lender kept the listed price',
  'borrower.final_accepted': 'The borrower accepted the final price',
  'borrower.walked_away': 'The borrower declined the final price',
  'return.initiated': 'The borrower reported returning your item',
  'return.confirmed': 'Your return was confirmed'
};
if (!messages[event.type] || typeof event.eventId !== 'string' || typeof event.lease !== 'string' || typeof event.toolName !== 'string' || event.toolName.length > 120) return [{json:{valid:false}}];
return [{json:{valid:true,eventId:event.eventId,lease:event.lease,message:messages[event.type] + ': ' + event.toolName + '.'}}];`;
const request = workflow(
  "lendloop-request-notification",
  "LendLoop Request Notification",
  [
    {
      name: "Signed Request",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, 0],
      webhookId: "lendloop-request",
      parameters: {
        httpMethod: "POST",
        path: "lendloop-request",
        responseMode: "responseNode",
        options: { rawBody: true },
      },
    },
    code("Verify signature", verifyCode, 220, 0),
    boolIf("Authenticated", "valid", 440, 0),
    code(
      "Sign delivery acknowledgement",
      signedPost(
        "/automation/events/complete",
        `JSON.stringify({eventId:$input.first().json.eventId,lease:$input.first().json.lease,message:$input.first().json.message})`,
      ),
      660,
      -100,
    ),
    httpNode("Record notification", "POST", 880, -100),
    boolIf("Recorded", "completed", 1100, -100),
    respond("Delivered", 200, 1320, -160),
    respond("Invalid signature", 401, 660, 140),
    respond("Delivery unavailable", 503, 1320, 0),
  ],
  [
    link("Signed Request", "Verify signature"),
    link("Verify signature", "Authenticated"),
    link("Authenticated", "Sign delivery acknowledgement", 0),
    link("Authenticated", "Invalid signature", 1),
    link("Sign delivery acknowledgement", "Record notification"),
    link("Record notification", "Recorded"),
    link("Recorded", "Delivered", 0),
    link("Recorded", "Delivery unavailable", 1),
  ],
  { errorWorkflow: "lendloop-error-handler" },
);
const schedule = workflow(
  "lendloop-overdue-reminders",
  "LendLoop Overdue Reminders",
  [
    {
      name: "Daily 09:00 IST",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [0, 0],
      parameters: {
        rule: {
          interval: [{ field: "days", triggerAtHour: 9, triggerAtMinute: 0 }],
        },
      },
    },
    code("First page", `return [{json:{cursor:null}}];`, 200, 0),
    code("Sign overdue page", signedGet, 400, 0),
    httpNode("Fetch overdue loans", "GET", 600, 0),
    code(
      "Expand page",
      `const page=$input.first().json; if(!Array.isArray(page.loans)) throw new Error('Invalid overdue page'); return [...page.loans.map(x=>({json:{kind:'loan',loanId:x.loanId}})),...(page.cursor?[{json:{kind:'page',cursor:page.cursor}}]:[])];`,
      800,
      0,
    ),
    boolIf("More pages", "kind", 1000, 0),
    code(
      "Sign reminder claim",
      signedBatch(
        "/automation/reminders/claim",
        `{loanId:row.loanId,lease:crypto.randomUUID()}`,
      ),
      1200,
      100,
    ),
    httpNode("Claim reminder", "POST", 1400, 100),
    code(
      "Sign mock delivery",
      signedBatch(
        "/automation/reminders/complete",
        `{key:row.claim.key,lease:row.claim.lease,success:true}`,
        "!!row.claim",
      ),
      1600,
      100,
    ),
    httpNode("Record reminder sent", "POST", 1800, 100),
    code(
      "Confirm recorded",
      `if(!$input.first().json.completed) throw new Error('Reminder acknowledgement rejected'); return [{json:{sent:true}}];`,
      2000,
      100,
    ),
  ],
  [
    link("Daily 09:00 IST", "First page"),
    link("First page", "Sign overdue page"),
    link("Sign overdue page", "Fetch overdue loans"),
    link("Fetch overdue loans", "Expand page"),
    link("Expand page", "More pages"),
    link("More pages", "Sign overdue page", 0),
    link("More pages", "Sign reminder claim", 1),
    link("Sign reminder claim", "Claim reminder"),
    link("Claim reminder", "Sign mock delivery"),
    link("Sign mock delivery", "Record reminder sent"),
    link("Record reminder sent", "Confirm recorded"),
  ],
  { errorWorkflow: "lendloop-error-handler" },
);
// The branch compares a string, so use a string equality condition instead of the boolean helper.
schedule.nodes.find(
  (n) => n.name === "More pages",
).parameters.conditions.conditions[0] = {
  id: "more-pages",
  leftValue: "={{$json.kind}}",
  rightValue: "page",
  operator: { type: "string", operation: "equals" },
};
const errors = workflow(
  "lendloop-error-handler",
  "LendLoop Automation Errors",
  [
    {
      name: "Workflow failed",
      type: "n8n-nodes-base.errorTrigger",
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    },
    code(
      "Sanitize failure",
      `const x=$input.first().json; let summary=String(x.execution?.error?.message||'workflow failed').replace(/https?:\\/\\/\\S+/g,'[url]'); for(const secret of [$env.LENDLOOP_INBOUND_SECRET,$env.LENDLOOP_OUTBOUND_SECRET]) if(secret) summary=summary.replaceAll(secret,'[redacted]'); summary=summary.replace(/[a-f0-9]{64}/gi,'[digest]').slice(0,160); const record={workflow:String(x.workflow?.name||'unknown').slice(0,80),executionId:String(x.execution?.id||'unknown').slice(0,80),failedAt:new Date().toISOString(),step:String(x.execution?.lastNodeExecuted||'unknown').slice(0,80),summary}; console.error(JSON.stringify(record)); return [{json:record}];`,
      220,
      0,
    ),
  ],
  [link("Workflow failed", "Sanitize failure")],
);
for (const [name, value] of [
  ["request-notification", request],
  ["overdue-reminders", schedule],
  ["error-handler", errors],
])
  fs.writeFileSync(
    new URL(`${name}.json`, import.meta.url),
    JSON.stringify(value, null, 2) + "\n",
  );
