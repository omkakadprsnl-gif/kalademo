import crypto from "crypto";

const COOKIE_NAME = "kalashala_access";
const SESSION_DAYS = 30;

type AccessTokenPayload = {
  courseId: string;
  expiresAt: number;
};

export function accessCookieName() {
  return COOKIE_NAME;
}

export function createAccessToken(courseId: string) {
  const secret = process.env.KALASHALA_ACCESS_SECRET;

  if (!secret) {
    throw new Error("KALASHALA_ACCESS_SECRET is missing.");
  }

  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${courseId}.${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return `${payload}.${signature}`;
}

export function getAccessTokenPayload(token: string | undefined): AccessTokenPayload | null {
  if (!token) return null;

  const secret = process.env.KALASHALA_ACCESS_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [courseId, expiresAtText, signature] = parts;
  if (!courseId || !expiresAtText || !signature) return null;

  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return null;

  const payload = `${courseId}.${expiresAtText}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (signature.length !== expectedSignature.length) return null;

  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!valid) return null;

  return { courseId, expiresAt };
}

export function hasValidAccessToken(token: string | undefined) {
  return getAccessTokenPayload(token) !== null;
}

export { SESSION_DAYS };
