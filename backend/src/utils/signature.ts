import crypto from "node:crypto";

/**
 * Verifies the X-Signature header using HMAC-SHA256 and constant-time comparison.
 * Expected format: sha256=<hex>
 *
 * @param rawBody - Unparsed request body Buffer
 * @param signatureHeader - The raw X-Signature or x-signature header value
 * @param secret - The WEBHOOK_SECRET key
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  secret: string,
): { valid: boolean; reason?: string } {
  if (!signatureHeader || typeof signatureHeader !== "string") {
    return { valid: false, reason: "Missing X-Signature header" };
  }

  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    return { valid: false, reason: "Missing request body" };
  }

  if (!secret) {
    return { valid: false, reason: "WEBHOOK_SECRET is not configured on server" };
  }

  // Extract hex digest from sha256=<hex> or raw <hex>
  const cleanHeader = signatureHeader.trim();
  const providedHex = cleanHeader.startsWith("sha256=")
    ? cleanHeader.slice(7).trim()
    : cleanHeader;

  // Validate hex format (64 chars for sha256)
  if (!/^[a-fA-F0-9]{64}$/.test(providedHex)) {
    return { valid: false, reason: "Malformed X-Signature format (expected sha256=<64-hex>)" };
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const computedHex = hmac.digest("hex");

  const providedBuf = Buffer.from(providedHex.toLowerCase(), "utf8");
  const computedBuf = Buffer.from(computedHex.toLowerCase(), "utf8");

  if (providedBuf.length !== computedBuf.length) {
    return { valid: false, reason: "Signature length mismatch" };
  }

  const matches = crypto.timingSafeEqual(providedBuf, computedBuf);
  return {
    valid: matches,
    reason: matches ? undefined : "Signature mismatch",
  };
}

/**
 * Helper to compute an X-Signature header value for a given payload and secret.
 * Useful for automated tests and curl command generation.
 */
export function generateWebhookSignature(body: string | Buffer, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}
