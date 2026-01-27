import { createHmac, timingSafeEqual } from "node:crypto";

export type AccessCookieEntry = {
  access: true;
  ts: number;
  productId?: string;
};

export type AccessCookiePayload = {
  v: 1;
  ts: number;
  exp: number;
  entries: Record<string, AccessCookieEntry>;
};

const COOKIE_VERSION = 1 as const;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function decodeAccessCookie(params: {
  value?: string;
  secret: string;
  now: number;
}): AccessCookiePayload | null {
  const { value, secret, now } = params;
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 2) return null;

  const [payloadPart, signaturePart] = parts;
  const expectedSignature = sign(payloadPart, secret);

  try {
    const signatureBuffer = Buffer.from(signaturePart);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      base64UrlDecode(payloadPart),
    ) as AccessCookiePayload;
    if (
      !decoded ||
      decoded.v !== COOKIE_VERSION ||
      typeof decoded.exp !== "number" ||
      decoded.exp < now ||
      !decoded.entries
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function encodeAccessCookie(params: {
  payload: AccessCookiePayload;
  secret: string;
}): string {
  const { payload, secret } = params;
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadPart, secret);
  return `${payloadPart}.${signature}`;
}

export function getAccessCookieEntry(params: {
  payload: AccessCookiePayload | null;
  contentId: string;
  now: number;
}): AccessCookieEntry | null {
  const { payload, contentId, now } = params;
  if (!payload || payload.exp < now) return null;
  return payload.entries?.[contentId] ?? null;
}

export function upsertAccessCookie(params: {
  payload: AccessCookiePayload | null;
  contentId: string;
  productId?: string;
  now: number;
  ttlSeconds: number;
  maxEntries: number;
}): AccessCookiePayload {
  const { payload, contentId, productId, now, ttlSeconds, maxEntries } = params;

  const nextPayload: AccessCookiePayload =
    payload && payload.exp >= now
      ? {
          v: COOKIE_VERSION,
          ts: payload.ts,
          exp: payload.exp,
          entries: { ...payload.entries },
        }
      : {
          v: COOKIE_VERSION,
          ts: now,
          exp: now + ttlSeconds,
          entries: {},
        };

  nextPayload.entries[contentId] = {
    access: true,
    ts: now,
    productId,
  };
  nextPayload.ts = now;
  nextPayload.exp = now + ttlSeconds;

  const entries = Object.entries(nextPayload.entries);
  if (entries.length > maxEntries) {
    entries
      .sort(([, a], [, b]) => (a.ts ?? 0) - (b.ts ?? 0))
      .slice(0, entries.length - maxEntries)
      .forEach(([key]) => {
        delete nextPayload.entries[key];
      });
  }

  return nextPayload;
}
