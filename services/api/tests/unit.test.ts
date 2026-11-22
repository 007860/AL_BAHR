import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createDatabase, newId } from "../src/db/database.ts";
import { loadConfig } from "../src/config.ts";
import {
  createSignedDocumentToken,
  generateTotpCode,
  hashPassword,
  redactPii,
  sanitizeCsvCell,
  toCsv,
  validateUploadBytes,
  verifyPassword,
  verifySignedDocumentToken,
  verifyTotpCode,
} from "../src/core/security.ts";
import { evaluateConditions, validateRuleDefinition } from "../src/core/rules-engine.ts";
import { addVerifiedFlightFare, createFlightRequest } from "../src/modules/travel-commercial.ts";
import { transitionCaseState } from "../src/modules/crm-cases.ts";

test("Security: scrypt password hashing, TOTP MFA, signed URLs, CSV injection & magic-byte validation", () => {
  const hash = hashPassword("StrongPass!2026");
  assert.equal(verifyPassword("StrongPass!2026", hash), true);
  assert.equal(verifyPassword("WrongPass", hash), false);

  const secret = crypto.randomBytes(20).toString("hex");
  const code = generateTotpCode(secret, 1_700_000_000);
  assert.equal(verifyTotpCode(secret, code, 1_700_000_000), true);
  assert.equal(verifyTotpCode(secret, "000000", 1_700_000_000), false);

  const signed = createSignedDocumentToken("doc-1", "user-1", "url-secret", 60);
  assert.deepEqual(verifySignedDocumentToken(signed.token, "doc-1", "url-secret"), { userId: "user-1" });
  assert.equal(verifySignedDocumentToken(signed.token, "doc-2", "url-secret"), null);

  assert.equal(sanitizeCsvCell("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0");
  assert.equal(sanitizeCsvCell("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.ok(toCsv(["Name"], [["@EVIL"]]).includes("'@EVIL"));

  const validPdf = Buffer.from("%PDF-1.4\n%fake-pdf-body");
  assert.equal(validateUploadBytes("ticket.pdf", "application/pdf", validPdf).ok, true);

  const spoofedExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable renamed to .pdf
  assert.equal(validateUploadBytes("evil.pdf", "application/pdf", spoofedExe).ok, false);

  const redacted = redactPii({ email: "a@b.com", password: "secret", passport: "AB12345" });
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.passport, "[REDACTED]");
});

test("Rules Engine: allowlist blocks arbitrary fields/operators and evaluates deterministically", () => {
  const bad = validateRuleDefinition("lead.created", [{ field: "__proto__", op: "eval", value: "1" }], [{ type: "assign_least_loaded" }]);
  assert.equal(bad.ok, false);

  const good = validateRuleDefinition("lead.created", [{ field: "service_type", op: "eq", value: "umrah" }], [{ type: "assign_least_loaded" }]);
  assert.equal(good.ok, true);

  assert.equal(evaluateConditions([{ field: "service_type", op: "eq", value: "umrah" }], { service_type: "umrah" }), true);
  assert.equal(evaluateConditions([{ field: "service_type", op: "eq", value: "umrah" }], { service_type: "visa" }), false);
});

test("Flight Markup Math: defaults to PKR 2,000/passenger and blocks non-CEO override", () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const now = new Date().toISOString();
  const empId = newId();
  const ceoId = newId();
  const custId = newId();
  const caseId = newId();
  const supId = newId();

  db.prepare("INSERT INTO os_users VALUES (?, ?, 'emp@t.local', 'h', 'Emp', NULL, 'en', 0, NULL, 'active', ?, ?)").run(empId, cfg.defaultOrgId, now, now);
  db.prepare("INSERT INTO os_users VALUES (?, ?, 'ceo@t.local', 'h', 'CEO', NULL, 'en', 0, NULL, 'active', ?, ?)").run(ceoId, cfg.defaultOrgId, now, now);
  db.prepare("INSERT INTO os_customers (id, organization_id, full_name, primary_phone, created_at, updated_at) VALUES (?, ?, 'Ali', '+923001', ?, ?)").run(custId, cfg.defaultOrgId, now, now);
  db.prepare("INSERT INTO os_cases (id, organization_id, case_number, customer_id, service_type, title, status, created_at, updated_at) VALUES (?, ?, 'CASE-1', ?, 'flight', 'LHE-JED', 'assigned', ?, ?)").run(caseId, cfg.defaultOrgId, custId, now, now);
  db.prepare("INSERT INTO os_suppliers (id, organization_id, name, category, created_at) VALUES (?, ?, 'PIA GDS', 'airline', ?)").run(supId, cfg.defaultOrgId, now);

  const empClaims = { sub: empId, sid: "s1", role: "employee", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };
  const ceoClaims = { sub: ceoId, sid: "s2", role: "ceo", orgId: cfg.defaultOrgId, aal: "aal2" as const, exp: 9999999999 };

  const req = createFlightRequest(db, empClaims, { caseId, originIata: "LHE", destinationIata: "JED", departureDate: "2026-12-15", passengerCount: 3 }, "r1");
  assert.equal(req.status, 201);
  const frId = (req.body as { id: string }).id;

  const future = new Date(Date.now() + 86400_000).toISOString();
  const fare = addVerifiedFlightFare(db, empClaims, frId, { supplierId: supId, netFarePerPaxPkr: 100000, validUntil: future }, "r2");
  assert.equal(fare.status, 201);
  // 3 pax * (100,000 + 2,000) = 306,000
  assert.equal((fare.body as { totalSellingPkr: number }).totalSellingPkr, 306000);

  const empOverride = addVerifiedFlightFare(db, empClaims, frId, { supplierId: supId, netFarePerPaxPkr: 100000, overrideMarkupPerPaxPkr: 500, validUntil: future }, "r3");
  assert.equal(empOverride.status, 403);

  const ceoOverride = addVerifiedFlightFare(db, ceoClaims, frId, { supplierId: supId, netFarePerPaxPkr: 100000, overrideMarkupPerPaxPkr: 1000, validUntil: future }, "r4");
  assert.equal(ceoOverride.status, 201);
  assert.equal((ceoOverride.body as { totalSellingPkr: number }).totalSellingPkr, 303000);
});

test("Case State Machine: invalid transitions and stale version conflicts are rejected", () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const now = new Date().toISOString();
  const mgrId = newId();
  const custId = newId();
  const caseId = newId();
  db.prepare("INSERT INTO os_users VALUES (?, ?, 'mgr@t.local', 'h', 'Mgr', NULL, 'en', 0, NULL, 'active', ?, ?)").run(mgrId, cfg.defaultOrgId, now, now);
  db.prepare("INSERT INTO os_customers (id, organization_id, full_name, primary_phone, created_at, updated_at) VALUES (?, ?, 'Sara', '+923002', ?, ?)").run(custId, cfg.defaultOrgId, now, now);
  db.prepare("INSERT INTO os_cases (id, organization_id, case_number, customer_id, service_type, title, status, version, created_at, updated_at) VALUES (?, ?, 'CASE-2', ?, 'visa', 'Schengen', 'draft', 1, ?, ?)").run(caseId, cfg.defaultOrgId, custId, now, now);

  const mgrClaims = { sub: mgrId, sid: "s", role: "manager", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };
  // Cannot jump directly draft -> completed
  const invalid = transitionCaseState(db, mgrClaims, caseId, { toStatus: "completed", version: 1 }, "r1");
  assert.equal(invalid.status, 422);

  // Stale version rejected with 409
  const stale = transitionCaseState(db, mgrClaims, caseId, { toStatus: "submitted", version: 99 }, "r2");
  assert.equal(stale.status, 409);

  const valid = transitionCaseState(db, mgrClaims, caseId, { toStatus: "submitted", version: 1 }, "r3");
  assert.equal(valid.status, 200);
});
