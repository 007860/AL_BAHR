enum OsRole { ceo, manager, employee, finance, support, customer, partner }

enum AppNavModule {
  dashboard,
  inbox,
  customers,
  cases,
  flights,
  umrah,
  visas,
  appointments,
  hotels,
  studyAbroad,
  quotes,
  invoices,
  payments,
  ledger,
  bookings,
  myTrips,
  documents,
  employees,
  partners,
  suppliers,
  websiteCms,
  campaigns,
  subscribers,
  chat,
  support,
  notifications,
  seo,
  languages,
  reviews,
  analytics,
  websiteHealth,
  reports,
  referrals,
  activityAudit,
  rulesStudio,
  assignmentWorkload,
  backupsDr,
  integrations,
  settings,
}

extension OsRoleExt on OsRole {
  String get code => name;

  String get displayTitle {
    switch (this) {
      case OsRole.ceo:
        return 'CEO / Owner';
      case OsRole.manager:
        return 'Operations Manager';
      case OsRole.employee:
        return 'Travel Consultant';
      case OsRole.finance:
        return 'Finance Reviewer';
      case OsRole.support:
        return 'Support Desk';
      case OsRole.customer:
        return 'Customer';
      case OsRole.partner:
        return 'B2B Partner';
    }
  }

  List<AppNavModule> get permittedModules {
    switch (this) {
      case OsRole.ceo:
        return AppNavModule.values;
      case OsRole.manager:
        return [
          AppNavModule.dashboard,
          AppNavModule.inbox,
          AppNavModule.customers,
          AppNavModule.cases,
          AppNavModule.flights,
          AppNavModule.umrah,
          AppNavModule.visas,
          AppNavModule.appointments,
          AppNavModule.hotels,
          AppNavModule.studyAbroad,
          AppNavModule.quotes,
          AppNavModule.invoices,
          AppNavModule.bookings,
          AppNavModule.documents,
          AppNavModule.employees,
          AppNavModule.suppliers,
          AppNavModule.websiteCms,
          AppNavModule.campaigns,
          AppNavModule.chat,
          AppNavModule.support,
          AppNavModule.notifications,
          AppNavModule.languages,
          AppNavModule.reviews,
          AppNavModule.analytics,
          AppNavModule.websiteHealth,
          AppNavModule.reports,
          AppNavModule.activityAudit,
          AppNavModule.rulesStudio,
          AppNavModule.assignmentWorkload,
        ];
      case OsRole.employee:
        return [
          AppNavModule.dashboard,
          AppNavModule.inbox,
          AppNavModule.customers,
          AppNavModule.cases,
          AppNavModule.flights,
          AppNavModule.umrah,
          AppNavModule.visas,
          AppNavModule.appointments,
          AppNavModule.hotels,
          AppNavModule.studyAbroad,
          AppNavModule.quotes,
          AppNavModule.bookings,
          AppNavModule.documents,
          AppNavModule.employees,
          AppNavModule.chat,
          AppNavModule.support,
          AppNavModule.notifications,
          AppNavModule.languages,
        ];
      case OsRole.finance:
        return [
          AppNavModule.dashboard,
          AppNavModule.invoices,
          AppNavModule.payments,
          AppNavModule.ledger,
          AppNavModule.quotes,
          AppNavModule.partners,
          AppNavModule.suppliers,
          AppNavModule.referrals,
          AppNavModule.reports,
          AppNavModule.notifications,
          AppNavModule.activityAudit,
        ];
      case OsRole.support:
        return [
          AppNavModule.dashboard,
          AppNavModule.inbox,
          AppNavModule.customers,
          AppNavModule.cases,
          AppNavModule.chat,
          AppNavModule.support,
          AppNavModule.notifications,
          AppNavModule.languages,
          AppNavModule.reviews,
        ];
      case OsRole.customer:
        return [
          AppNavModule.dashboard,
          AppNavModule.myTrips,
          AppNavModule.umrah,
          AppNavModule.flights,
          AppNavModule.visas,
          AppNavModule.quotes,
          AppNavModule.invoices,
          AppNavModule.payments,
          AppNavModule.documents,
          AppNavModule.chat,
          AppNavModule.support,
          AppNavModule.notifications,
          AppNavModule.languages,
          AppNavModule.reviews,
        ];
      case OsRole.partner:
        return [
          AppNavModule.dashboard,
          AppNavModule.inbox,
          AppNavModule.cases,
          AppNavModule.umrah,
          AppNavModule.quotes,
          AppNavModule.invoices,
          AppNavModule.myTrips,
          AppNavModule.partners,
          AppNavModule.referrals,
          AppNavModule.support,
          AppNavModule.notifications,
          AppNavModule.languages,
        ];
    }
  }
}

extension AppNavModuleExt on AppNavModule {
  String get title {
    switch (this) {
      case AppNavModule.dashboard:
        return 'Dashboard';
      case AppNavModule.inbox:
        return 'Inbox & Leads';
      case AppNavModule.customers:
        return 'Customers';
      case AppNavModule.cases:
        return 'Cases & Tasks';
      case AppNavModule.flights:
        return 'Flights';
      case AppNavModule.umrah:
        return 'Umrah & Hajj';
      case AppNavModule.visas:
        return 'Visas';
      case AppNavModule.appointments:
        return 'Appointments';
      case AppNavModule.hotels:
        return 'Hotels & Transfers';
      case AppNavModule.studyAbroad:
        return 'Study Abroad';
      case AppNavModule.quotes:
        return 'Quotes';
      case AppNavModule.invoices:
        return 'Invoices';
      case AppNavModule.payments:
        return 'Payments';
      case AppNavModule.ledger:
        return 'Ledger';
      case AppNavModule.bookings:
        return 'Bookings';
      case AppNavModule.myTrips:
        return 'My Trips';
      case AppNavModule.documents:
        return 'Documents';
      case AppNavModule.employees:
        return 'Employees & HR';
      case AppNavModule.partners:
        return 'Partners B2B';
      case AppNavModule.suppliers:
        return 'Suppliers';
      case AppNavModule.websiteCms:
        return 'Website CMS';
      case AppNavModule.campaigns:
        return 'Campaigns';
      case AppNavModule.subscribers:
        return 'Subscribers';
      case AppNavModule.chat:
        return 'Chat';
      case AppNavModule.support:
        return 'Support Desk';
      case AppNavModule.notifications:
        return 'Notifications';
      case AppNavModule.seo:
        return 'SEO';
      case AppNavModule.languages:
        return 'Languages';
      case AppNavModule.reviews:
        return 'Reviews';
      case AppNavModule.analytics:
        return 'Analytics';
      case AppNavModule.websiteHealth:
        return 'Website Health';
      case AppNavModule.reports:
        return 'Reports & BI';
      case AppNavModule.referrals:
        return 'Referrals';
      case AppNavModule.activityAudit:
        return 'Activity & Audit';
      case AppNavModule.rulesStudio:
        return 'Rules Studio';
      case AppNavModule.assignmentWorkload:
        return 'Assignment';
      case AppNavModule.backupsDr:
        return 'Backups & DR';
      case AppNavModule.integrations:
        return 'Integrations';
      case AppNavModule.settings:
        return 'Settings';
    }
  }
}

class StaffRecord {
  final String id;
  final String name;
  final String email;
  OsRole role;
  final List<String> skills;
  int activeLoad;
  int maxActive;
  bool autoAssignEnabled;
  String leaveStatus; // available, on_leave
  DateTime? lastAssignedAt;
  bool active;
  bool checkedInToday;

  StaffRecord({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.skills,
    this.activeLoad = 0,
    this.maxActive = 10,
    this.autoAssignEnabled = true,
    this.leaveStatus = 'available',
    this.lastAssignedAt,
    this.active = true,
    this.checkedInToday = false,
  });
}

class LeadRecord {
  final String id;
  final String fullName;
  final String phone;
  final String serviceType;
  final String source;
  String? assignedEmployeeId;
  String? partnerId;
  String status; // new, triaged, assigned, contacted, converted, closed, spam
  String? followUpNote;
  final DateTime createdAt;

  LeadRecord({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.serviceType,
    required this.source,
    this.assignedEmployeeId,
    this.partnerId,
    required this.status,
    this.followUpNote,
    required this.createdAt,
  });
}

class CustomerRecord {
  final String id;
  final String fullName;
  final String phone;
  final String email;
  final String? ownerUserId;
  final String? partnerId;
  bool kycVerified;
  bool archived;
  final List<String> internalNotes;
  final List<String> customerSafeEvents;

  CustomerRecord({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.email,
    this.ownerUserId,
    this.partnerId,
    this.kycVerified = false,
    this.archived = false,
    List<String>? internalNotes,
    List<String>? customerSafeEvents,
  })  : internalNotes = internalNotes ?? [],
        customerSafeEvents = customerSafeEvents ?? [];
}

class CaseRecord {
  final String id;
  final String caseNumber;
  final String customerId;
  final String serviceType;
  final String title;
  String? assignedEmployeeId;
  String? partnerId;
  String status; // draft, submitted, assigned, processing, waiting_customer, waiting_supplier, completed, cancelled
  bool escalated;
  final List<TaskItem> tasks;

  CaseRecord({
    required this.id,
    required this.caseNumber,
    required this.customerId,
    required this.serviceType,
    required this.title,
    this.assignedEmployeeId,
    this.partnerId,
    required this.status,
    this.escalated = false,
    List<TaskItem>? tasks,
  }) : tasks = tasks ?? [];
}

class TaskItem {
  final String id;
  final String title;
  bool completed;
  final String? dependsOnId;

  TaskItem({required this.id, required this.title, this.completed = false, this.dependsOnId});
}

class UmrahPackageRecord {
  final String id;
  final String pkgNo;
  final String title;
  final String departureCity;
  final String airline;
  final String makkahHotel;
  final int makkahDistanceM;
  final String madinahHotel;
  final int madinahDistanceM;
  final int totalNights;
  final int priceQuadPkr;
  String status; // draft, approved, published, expired, unpublished

  UmrahPackageRecord({
    required this.id,
    required this.pkgNo,
    required this.title,
    required this.departureCity,
    required this.airline,
    required this.makkahHotel,
    required this.makkahDistanceM,
    required this.madinahHotel,
    required this.madinahDistanceM,
    required this.totalNights,
    required this.priceQuadPkr,
    required this.status,
  });
}

class QuoteRecord {
  final String id;
  final String quoteNumber;
  final String customerId;
  final String? partnerId;
  final String title;
  final int supplierCostPkr;
  final int sellingPricePkr;
  int versionNo;
  String status; // draft, sent, accepted, rejected, expired
  final DateTime validUntil;

  QuoteRecord({
    required this.id,
    required this.quoteNumber,
    required this.customerId,
    this.partnerId,
    required this.title,
    required this.supplierCostPkr,
    required this.sellingPricePkr,
    this.versionNo = 1,
    required this.status,
    required this.validUntil,
  });
}

class InvoiceRecord {
  final String id;
  final String invoiceNumber;
  final String quoteId;
  final String customerId;
  final String? partnerId;
  final int totalPkr;
  int verifiedPaidPkr;
  String status; // issued, partially_paid, paid, void

  InvoiceRecord({
    required this.id,
    required this.invoiceNumber,
    required this.quoteId,
    required this.customerId,
    this.partnerId,
    required this.totalPkr,
    this.verifiedPaidPkr = 0,
    required this.status,
  });
}

class PaymentRecord {
  final String id;
  final String invoiceId;
  final String customerId;
  final int amountPkr;
  final String bankName;
  final String bankRef;
  String status; // pending_review, verified, rejected, refunded
  String? reviewReason;

  PaymentRecord({
    required this.id,
    required this.invoiceId,
    required this.customerId,
    required this.amountPkr,
    required this.bankName,
    required this.bankRef,
    required this.status,
    this.reviewReason,
  });
}

class BookingRecord {
  final String id;
  final String bookingNumber;
  final String customerId;
  final String? partnerId;
  final String? invoiceId;
  final String title;
  String? supplierRef;
  String? ticketOrVoucherFile;
  String status; // requested, supplier_pending, confirmed, documents_issued, cancelled

  BookingRecord({
    required this.id,
    required this.bookingNumber,
    required this.customerId,
    this.partnerId,
    this.invoiceId,
    required this.title,
    this.supplierRef,
    this.ticketOrVoucherFile,
    required this.status,
  });
}

class DocumentRecord {
  final String id;
  final String customerId;
  final String category;
  final String fileName;
  String reviewStatus; // missing, received, approved, rejected
  String? reason;
  int versionNo;

  DocumentRecord({
    required this.id,
    required this.customerId,
    required this.category,
    required this.fileName,
    required this.reviewStatus,
    this.reason,
    this.versionNo = 1,
  });
}

class RuleRecord {
  final String id;
  final String name;
  final String triggerEvent;
  final String conditionSummary;
  final String actionSummary;
  int versionNo;
  bool enabled;

  RuleRecord({
    required this.id,
    required this.name,
    required this.triggerEvent,
    required this.conditionSummary,
    required this.actionSummary,
    this.versionNo = 1,
    this.enabled = true,
  });
}

class AuditEntry {
  final String id;
  final String actorRole;
  final String action;
  final String resource;
  final String summary;
  final DateTime at;

  AuditEntry({
    required this.id,
    required this.actorRole,
    required this.action,
    required this.resource,
    required this.summary,
    required this.at,
  });
}
