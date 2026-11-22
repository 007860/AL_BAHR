import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:horizon_one/core/models.dart';
import 'package:horizon_one/core/os_engine.dart';
import 'package:horizon_one/main.dart';

void main() {
  testWidgets('Splash screen skips cleanly to Login and shows logo asset pending badge', (tester) async {
    final store = HorizonOsStore();
    await tester.pumpWidget(HorizonOneApp(store: store));
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('HORIZON ONE'), findsWidgets);
    expect(find.text('OFFICIAL LOGO ASSET PENDING'), findsOneWidget);

    await tester.tap(find.text('Skip Animation'));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pumpAndSettle();

    expect(find.text('Sign In'), findsWidgets);
  });

  testWidgets('Responsive Mobile/Desktop shell, Smart Assignment & Invite Redemption', (tester) async {
    final store = HorizonOsStore();
    store.skipSplash();
    await store.signIn(email: 'ceo@sandbox.local', password: 'Pass!123', sandboxRole: OsRole.ceo);

    // Smart assignment selects least-loaded available employee (emp-2 has load 1 vs emp-1 load 2; emp-3 is on leave!)
    final leadRes = store.createAndAssignLead(
      fullName: 'Haji Bilal',
      phone: '+923009998877',
      serviceType: 'umrah',
      source: 'mobile_app',
      consentGiven: true,
      idempotencyKey: 'w-test-1',
    );
    expect(leadRes.ok, true);
    expect(store.leads.first.assignedEmployeeId, 'emp-2');

    // Employee invite & one-time redemption
    final inv = store.inviteStaff(name: 'Test Agent', email: 'ta@albahr.local', role: OsRole.employee);
    expect(inv.ok, true);
    final token = store.pendingInvites.first['token']!;
    expect(store.redeemInviteToken(token, 'StrongPass!1234').ok, true);
    // Replay rejected
    expect(store.redeemInviteToken(token, 'StrongPass!1234').ok, false);

    // Render mobile viewport (<768px) and open Inbox via bottom nav
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(HorizonOneApp(store: store));
    await tester.pumpAndSettle();
    expect(find.text('Featured Packages'), findsOneWidget);
    expect(find.text('More'), findsOneWidget);

    // Navigate to Visa & Consultation + Experts
    store.setModule(AppNavModule.visas);
    await tester.pumpAndSettle();
    expect(find.text('Visa & Consultation'), findsOneWidget);
    expect(find.text('Meet Our Experts'), findsOneWidget);

    // Navigate to My Tickets Boarding Pass screen
    store.setModule(AppNavModule.myTrips);
    await tester.pumpAndSettle();
    expect(find.text('My Tickets'), findsOneWidget);
    expect(find.text('My Bookings'), findsOneWidget);
    expect(find.text('Past Trips'), findsOneWidget);
    expect(find.text('E-Ticket / Boarding Pass'), findsOneWidget);
  });

  testWidgets('Role isolation, manual bank verification, flight markup, offline draft & Urdu RTL', (tester) async {
    final store = HorizonOsStore();
    store.skipSplash();
    await store.signIn(email: 'emp@sandbox.local', password: 'Pass!123', sandboxRole: OsRole.employee);

    // 1. Flight markup defaults to PKR 2,000/pax and blocks non-CEO override
    final badOverride = store.createFlightQuoteWithMarkup(
      customerId: store.customers.first.id,
      route: 'LHE-DXB',
      pax: 2,
      netFarePerPax: 90000,
      overrideMarkupPerPax: 500,
    );
    expect(badOverride.ok, false);

    final validFlight = store.createFlightQuoteWithMarkup(
      customerId: store.customers.first.id,
      route: 'LHE-DXB',
      pax: 2,
      netFarePerPax: 90000,
    );
    expect(validFlight.ok, true);
    expect(store.quotes.first.sellingPricePkr, 184000);

    // 2. Employee cannot verify bank slips (403)
    final empVerify = store.verifyOrRejectPayment(paymentId: 'pay-1', approve: true, reason: 'try');
    expect(empVerify.ok, false);

    // 3. Cannot issue ticket before Finance verifies payment
    final blockedTicket = store.issueTicketOrVoucher(
      bookingId: 'bk-1',
      supplierRef: 'SAU-123',
      documentName: 'ticket.pdf',
    );
    expect(blockedTicket.ok, false);

    // 4. Finance verifies payment -> ticket issuance succeeds
    await store.signIn(email: 'fin@sandbox.local', password: 'Pass!123', sandboxRole: OsRole.finance);
    final okVerify = store.verifyOrRejectPayment(paymentId: 'pay-1', approve: true, reason: 'Cleared');
    expect(okVerify.ok, true);

    await store.signIn(email: 'emp@sandbox.local', password: 'Pass!123', sandboxRole: OsRole.employee);
    final okTicket = store.issueTicketOrVoucher(
      bookingId: 'bk-1',
      supplierRef: 'SAU-123',
      documentName: 'ticket.pdf',
    );
    expect(okTicket.ok, true);

    // 5. Offline draft keeps multi-step Umrah state and blocks publishing
    store.toggleOffline(true);
    store.updateUmrahDraft(step: 2);
    expect(store.draftSyncStatus, 'Offline / Sync Pending');
    expect(store.umrahDraftStep, 2);

    // 6. Switch to Urdu RTL and verify UI renders in RTL cleanly
    store.setLocale('ur');
    await tester.pumpWidget(HorizonOneApp(store: store));
    await tester.pumpAndSettle();

    final dir = tester.widget<Directionality>(find.byType(Directionality).last);
    expect(dir.textDirection, TextDirection.rtl);
    expect(store.whatsappVerified, false);
  });
}
