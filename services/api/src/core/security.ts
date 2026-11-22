import crypto from "node:crypto";

export interface SessionClaims {
  sub: string;
  sid: string;
  role: string;
  orgId: string;
  teamId?: string | null;
  partnerId?: string | null;
  aal: "aal1" | "aal2";
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function signToken(claims: SessionClaims, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string, secret: string): SessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

// RFC 6238 TOTP (6 digits, 30s step)
export function generateTotpCode(secretHex: string, atEpochSec = Math.floor(Date.now() / 1000)): string {
  const step = Math.floor(atEpochSec / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac("sha1", Buffer.from(secretHex, "hex")).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secretHex: string, candidate: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!/^\d{6}$/.test(candidate)) return false;
  for (const drift of [-30, 0, 30]) {
    const expected = generateTotpCode(secretHex, nowSec + drift);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) return true;
  }
  return false;
}

// Short-lived signed URL for private documents
export function createSignedDocumentToken(docId: string, userId: string, secret: string, ttlSeconds = 120): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = `${docId}:${userId}:${expiresAt}`;
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return { token: Buffer.from(`${body}:${mac}`).toString("base64url"), expiresAt };
}

export function verifySignedDocumentToken(token: string, expectedDocId: string, secret: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [docId, userId, expStr, mac] = parts;
    if (docId !== expectedDocId) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const expectedMac = crypto.createHmac("sha256", secret).update(`${docId}:${userId}:${expStr}`).digest("base64url");
    if (mac.length !== expectedMac.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expectedMac))) return null;
    return { userId };
  } catch {
    return null;
  }
}

// Magic-byte MIME verification against executable/script spoofing
const ALLOWED_UPLOAD_TYPES: Record<string, { ext: string[]; magic: number[] }> = {
  "application/pdf": { ext: [".pdf"], magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  "image/png": { ext: [".png"], magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: [".jpg", ".jpeg"], magic: [0xff, 0xd8, 0xff] },
};

export function validateUploadBytes(fileName: string, claimedMime: string, bytes: Buffer): { ok: true } | { ok: false; reason: string } {
  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (bytes.length === 0 || bytes.length > maxBytes) {
    return { ok: false, reason: "File size must be between 1 byte and 10 MB" };
  }
  // Reject PE/ELF/Mach-O/script binaries outright
  if (
    (bytes[0] === 0x4d && bytes[1] === 0x5a) || // MZ (.exe/.dll)
    (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) || // ELF
    bytes.subarray(0, 2).toString("utf8") === "#!" // shell script
  ) {
    return { ok: false, reason: "Executable or script payloads are forbidden" };
  }

  const rule = ALLOWED_UPLOAD_TYPES[claimedMime];
  if (!rule) {
    return { ok: false, reason: `Unsupported MIME type: ${claimedMime}` };
  }
  const lower = fileName.toLowerCase();
  if (!rule.ext.some((e) => lower.endsWith(e))) {
    return { ok: false, reason: `File extension does not match ${claimedMime}` };
  }
  for (let i = 0; i < rule.magic.length; i++) {
    if (bytes[i] !== rule.magic[i]) {
      return { ok: false, reason: "File magic bytes do not match claimed MIME type" };
    }
  }
  return { ok: true };
}

// Neutralize CSV formula injection (=, +, -, @, tab, CR)
export function sanitizeCsvCell(value: unknown): string {
  let str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(sanitizeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(sanitizeCsvCell).join(","));
  }
  return lines.join("\n");
}

const SENSITIVE_KEYS = new Set(["password", "password_hash", "token", "secret", "mfa_secret", "passport", "passport_number", "authorization"]);

export function redactPii<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => redactPii(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = redactPii(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export class SlidingRateLimiter {
  private buckets = new Map<string, number[]>();

  allow(key: string, maxRequests: number, windowMs: number, nowMs = Date.now()): boolean {
    const arr = (this.buckets.get(key) ?? []).filter((t) => nowMs - t < windowMs);
    if (arr.length >= maxRequests) {
      this.buckets.set(key, arr);
      return false;
    }
    arr.push(nowMs);
    this.buckets.set(key, arr);
    return true;
  }
}
