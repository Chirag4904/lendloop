export async function hmac(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const bytes = new TextEncoder().encode(
    `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${body}`,
  );
  const signature = await crypto.subtle.sign("HMAC", key, bytes);
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function verify(secret: string, request: Request, body: string) {
  const timestamp = request.headers.get("x-lendloop-timestamp") ?? "";
  const nonce = request.headers.get("x-lendloop-nonce") ?? "";
  const signature = request.headers.get("x-lendloop-signature") ?? "";
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(Date.now() - Number(timestamp)) > 300_000 ||
    !/^[a-f0-9-]{16,100}$/i.test(nonce) ||
    !/^[a-f0-9]{64}$/i.test(signature)
  )
    return false;
  const url = new URL(request.url);
  const expected = await hmac(
    secret,
    request.method,
    url.pathname + url.search,
    timestamp,
    nonce,
    body,
  );
  // Compare all bytes without a content-dependent early exit.
  let mismatch = 0;
  for (let i = 0; i < 64; i++)
    mismatch |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
  return mismatch === 0;
}
