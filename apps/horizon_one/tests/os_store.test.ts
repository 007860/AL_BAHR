import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HorizonOsEngine } from '../src/core/osStore.ts';
import { translate } from '../src/core/l10n.ts';

describe('AL-BAHR HORIZON ONE React Store & UI State Engine', () => {
  it('Splash screen skips cleanly to Login and preserves logo asset pending governance', () => {
    const store = new HorizonOsEngine();
    assert.equal(store.splashComplete, false);
    assert.equal(store.logoAssetVerified, false);
    assert.equal(translate('en', 'logo_pending'), 'OFFICIAL LOGO ASSET PENDING');

    store.skipSplash();
    assert.equal(store.splashComplete, true);
    assert.equal(store.authenticated, false);
  });

  it('Smart Least-Load Assignment & One-Time 48h Invite Redemption work deterministically', async () => {
    const store = new HorizonOsEngine();
    await store.signIn({
      email: 'ceo@sandbox.local',
      password: 'HorizonSandbox#2026',
      sandboxRole: 'ceo',
    });
    assert.equal(store.authenticated, true);

    // Bilal (emp-2) has activeLoad 1/10 vs Amina (emp-1) 2/10 for umrah
    const assignRes = store.createAndAssignLead({
      fullName: 'Hamza Pilgrim',
      phone: '+92 300 9988776',
      serviceType: 'umrah',
      source: 'React Web Portal',
      consentGiven: true,
      idempotencyKey: 'idem-lead-1',
    });
    assert.equal(assignRes.ok, true);
    assert.match(assignRes.message, /Assigned to Bilal Operations/);

    // Duplicate idempotency key is blocked cleanly
    const dupRes = store.createAndAssignLead({
      fullName: 'Hamza Pilgrim',
      phone: '+92 300 9988776',
      serviceType: 'umrah',
      source: 'React Web Portal',
      consentGiven: true,
      idempotencyKey: 'idem-lead-1',
    });
    assert.equal(dupRes.ok, true);
    assert.match(dupRes.message, /Duplicate submit prevented/);

    // Invite creation & redemption
    const invRes = store.inviteStaff({
      name: 'Sara Visa Desk',
      email: 'sara@albahrtravels.com',
      role: 'employee',
    });
    assert.equal(invRes.ok, true);
    const token = store.pendingInvites[0].token;
    const redeemRes = store.redeemInviteToken(token, 'StrongPass#2026');
    assert.equal(redeemRes.ok, true);
    assert.equal(store.staff.some((s) => s.email === 'sara@albahrtravels.com'), true);
  });

  it('Enforces RBAC role isolation, manual bank verification gate, flight markup & Urdu RTL', async () => {
    const store = new HorizonOsEngine();
    await store.signIn({
      email: 'employee@sandbox.local',
      password: 'HorizonSandbox#2026',
      sandboxRole: 'employee',
    });

    // Employee cannot access Ledger (403)
    const allowedLedger = store.setModule('ledger');
    assert.equal(allowedLedger, false);
    assert.match(store.lastErrorMessage ?? '', /Access denied \(403\)/);

    // Employee cannot override PKR 2,000 flight markup
    const markupBlocked = store.createFlightQuoteWithMarkup({
      customerId: 'cust-1',
      route: 'LHE-JED',
      pax: 2,
      netFarePerPax: 120000,
      overrideMarkupPerPax: 5000,
    });
    assert.equal(markupBlocked.ok, false);
    assert.match(markupBlocked.message, /Only CEO can override/);

    // Default PKR 2,000 markup succeeds
    const markupOk = store.createFlightQuoteWithMarkup({
      customerId: 'cust-1',
      route: 'LHE-JED',
      pax: 2,
      netFarePerPax: 120000,
    });
    assert.equal(markupOk.ok, true);
    assert.equal(store.quotes[0].sellingPricePkr, 244000);

    // Ticket issuance is blocked while payment is pending_review
    const blockedTicket = store.issueTicketOrVoucher({
      bookingId: 'bk-1',
      supplierRef: 'SV-9988',
      documentName: 'ticket.pdf',
    });
    assert.equal(blockedTicket.ok, false);
    assert.match(blockedTicket.message, /Payment must be verified by Finance/);

    // Switch to Finance to verify payment, then switch to Operations to issue ticket
    store.switchSandboxRole('finance');
    const verifyRes = store.verifyOrRejectPayment({
      paymentId: 'pay-1',
      approve: true,
      reason: 'Verified against Meezan statement',
    });
    assert.equal(verifyRes.ok, true);

    store.switchSandboxRole('manager');
    const issuedTicket = store.issueTicketOrVoucher({
      bookingId: 'bk-1',
      supplierRef: 'SV-9988',
      documentName: 'ticket.pdf',
    });
    assert.equal(issuedTicket.ok, true);
    assert.equal(store.bookings[0].status, 'documents_issued');

    // Offline draft persistence & Urdu RTL
    store.toggleOffline(true);
    store.updateUmrahDraft({ step: 3, city: 'Karachi', nights: 21 });
    assert.equal(store.draftSyncStatus, 'Offline / Sync Pending');
    store.setLocale('ur');
    assert.equal(translate(store.locale, 'skip_animation'), 'اینیمیشن چھوڑیں');
  });
});
