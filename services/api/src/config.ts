import crypto from "node:crypto";

export interface AppConfig {
  port: number;
  host: string;
  dbPath: string;
  jwtSigningSecret: string;
  signedUrlSecret: string;
  defaultOrgId: string;
  environment: string;
}

// Ephemeral dev-only secret generated at runtime if env var omitted (never hardcoded static secret)
const fallbackRuntimeSecret = crypto.randomBytes(32).toString("hex");

export function loadConfig(): AppConfig {
  const env = process.env.NODE_ENV ?? "development";
  const jwtSecret = process.env.OS_JWT_SECRET;
  const urlSecret = process.env.OS_SIGNED_URL_SECRET;

  if (env === "production" && (!jwtSecret || !urlSecret)) {
    throw new Error("OS_JWT_SECRET and OS_SIGNED_URL_SECRET are mandatory in production");
  }

  return {
    port: Number(process.env.PORT ?? "4000"),
    host: process.env.HOST ?? "127.0.0.1",
    dbPath: process.env.OS_DB_PATH ?? ":memory:",
    jwtSigningSecret: jwtSecret ?? fallbackRuntimeSecret,
    signedUrlSecret: urlSecret ?? fallbackRuntimeSecret,
    defaultOrgId: "00000000-0000-4000-8000-000000000001",
    environment: env,
  };
}
