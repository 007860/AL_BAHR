import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HorizonOsEngine } from '../src/core/osStore.ts';
import { translate } from '../src/core/l10n.ts';

describe('AL-BAHR HORIZON ONE Real Production Store & Social Media Connectors', () => {
  it('Splash screen skips cleanly to Login and initializes 7 connected Social Media Connectors', () => {
    const store = new HorizonOsEngine();
    assert.equal(store.splashComplete, false);
    assert.equal(store.socialConnectors.length, 7);
    assert.equal(store.socialConnectors.every((c) => c.connected), true);

    store.skipSplash();
    assert.equal(store.splashComplete, true);
    assert.equal(store.authenticated, false);
  });

  it('Social Media Connectors support API configuration, webhook ping, social lead capture & multi-network publishing', async () => {
    const store = new HorizonOsEngine();
    await store.signIn({
      email: 'ceo@albahrtravels.com',
      password: 'AlBahrHorizon#2026',
      role: 'ceo',
    });
    assert.equal(store.authenticated, true);

    // 1. Test Webhook Ping
    const pingRes = store.testSocialConnector('whatsapp');
    assert.equal(pingRes.ok, true);
    assert.match(pingRes.message, /Webhook handshake succeeded/);

    // 2. Configure Instagram Business Connector
    const cfgRes = store.configureSocialConnector({
      platform: 'instagram',
      handle: '@albahrtravels.pk',
      accountOrPageId: 'IG-BIZ-889900',
      accessToken: 'IGQVJ_REAL_TOKEN_2026_9911',
      autoCaptureLeads: true,
      autoPublishPackages: true,
    });
    assert.equal(cfgRes.ok, true);
    const ig = store.socialConnectors.find((c) => c.platform === 'instagram')!;
    assert.equal(ig.handle, '@albahrtravels.pk');
    assert.equal(ig.accessTokenMasked, 'IGQV••••••••9911');

    // 3. Ingest a Social Media Lead from Instagram & auto-assign to least-loaded consultant
    const prevLeads = ig.leadsCapturedCount;
    const socialLeadRes = store.ingestSocialLead({
      platform: 'instagram',
      fullName: 'Hamza Pilgrim',
      phone: '+92 300 9988776',
      serviceType: 'umrah',
      inquiryText: 'Please share 14-Night Umrah package details from Lahore.',
    });
    assert.equal(socialLeadRes.ok, true);
    assert.match(socialLeadRes.message, /Assigned to Bilal Operations/);
    assert.equal(ig.leadsCapturedCount, prevLeads + 1);
    assert.equal(store.leads[0].socialPlatform, 'instagram');

    // 4. Multi-Network Social Offer Publishing
    const pubRes = store.publishSocialPost({
      title: 'Ramadan & Winter Umrah 2026',
      caption: 'Book verified packages via WhatsApp & Instagram DM.',
      platforms: ['whatsapp', 'facebook', 'instagram', 'tiktok'],
    });
    assert.equal(pubRes.ok, true);
    assert.equal(store.socialPosts[0].title, 'Ramadan & Winter Umrah 2026');
  });

  it('Enforces RBAC role isolation, manual bank verification gate, flight markup & Urdu RTL', async () => {
    const store = new HorizonOsEngine();
    await store.signIn({
      email: 'amina@albahrtravels.com',
      password: 'AlBahrHorizon#2026',
      role: 'employee',
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
    store.switchAccountRole('finance');
    const verifyRes = store.verifyOrRejectPayment({
      paymentId: 'pay-1',
      approve: true,
      reason: 'Verified against Meezan statement',
    });
    assert.equal(verifyRes.ok, true);

    store.switchAccountRole('manager');
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
    assert.equal(translate(store.locale, 'social_hub'), 'سوشل میڈیا کنیکٹرز');
  });
});
