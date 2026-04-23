import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];

export type OrganizationRow = Tables["organizations"]["Row"];
export type TutorRow = Tables["tutors"]["Row"];
export type StudentRow = Tables["students"]["Row"];
export type SessionRow = Tables["sessions"]["Row"];
export type SessionStudentRow = Tables["session_students"]["Row"];
export type AttendanceRow = Tables["attendance"]["Row"];
export type AvailabilityRow = Tables["availabilities"]["Row"];
export type InvitationRow = Tables["invitations"]["Row"];
export type InvoiceRow = Tables["invoices"]["Row"];
export type InvoicePaymentRow = Tables["invoice_payments"]["Row"];
export type PaymentRow = Tables["payments"]["Row"];
export type ExpenseRow = Tables["expenses"]["Row"];
export type ResourceRow = Tables["resources"]["Row"];
export type SessionResourceRow = Tables["session_resources"]["Row"];
export type EmailDraftRow = Tables["email_drafts"]["Row"];
export type NotificationRow = Tables["notifications"]["Row"];

export type StudentBalanceRow = Views["student_balances"]["Row"];

// Enum-like unions (schema uses text + CHECK constraints, not pg enums)
export type AttendanceStatus =
  | "pending"
  | "present"
  | "absent"
  | "excused"
  | "late";

export type SessionStatus =
  | "scheduled"
  | "completed"
  | "cancelled_billable"
  | "cancelled_free";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void" | "overdue";

export type PaymentMethod = "cash" | "bank_transfer" | "payid" | "card" | "other";

export type ExpenseCategory =
  | "materials"
  | "software"
  | "rent"
  | "travel"
  | "tutor_pay"
  | "other";

export type SeriesFrequency = "weekly" | "fortnightly" | "monthly";

export type NotificationType =
  | "prepaid_low"
  | "attendance_absent"
  | "invoice_overdue"
  | "generic";

export type EmailDraftStatus = "draft" | "sent" | "failed" | "discarded";
export type EmailDraftContext =
  | "session_summary"
  | "invoice_reminder"
  | "marketing"
  | "resource_assignment"
  | "attendance_absence"
  | "prepaid_topup"
  | "custom";
