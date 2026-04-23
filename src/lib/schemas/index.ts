import { z } from "zod";

/**
 * Validation schemas for the tutoring app entities.
 *
 * These are the source of truth for client-side form validation and will
 * be re-used on server actions in Phase 3. The shapes mirror the Postgres
 * constraints defined in schema.sql.
 */

export const paymentMethodEnum = z.enum([
  "cash",
  "bank_transfer",
  "payid",
  "card",
  "other",
]);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

export const expenseCategoryEnum = z.enum([
  "materials",
  "software",
  "rent",
  "travel",
  "tutor_pay",
  "other",
]);
export type ExpenseCategory = z.infer<typeof expenseCategoryEnum>;

export const sessionStatusEnum = z.enum([
  "scheduled",
  "completed",
  "cancelled_billable",
  "cancelled_free",
]);
export type SessionStatus = z.infer<typeof sessionStatusEnum>;

const nonEmpty = z.string().trim().min(1, "Required");
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

/** Accepts "", null, undefined as "not set" → null, otherwise coerces to number. */
const optionalGrade = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().int().min(1).max(13).nullable(),
);
/** Required numeric (empty string → validation error via min). */
const requiredNonNegativeNumber = z.coerce
  .number({ message: "Enter a number" })
  .nonnegative("Must be 0 or greater");
const requiredPositiveNumber = z.coerce
  .number({ message: "Enter a number" })
  .positive("Must be greater than 0");
const optionalNonNegativeNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().nonnegative().nullable(),
);

export const studentSchema = z.object({
  full_name: nonEmpty,
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || null),
  phone: optionalString,
  address: optionalString,
  grade_level: optionalGrade,
  default_rate: requiredNonNegativeNumber,
  parent_name: nonEmpty,
  parent_email: z.string().email("Invalid email"),
  parent_phone: nonEmpty,
  alt_parent_name: optionalString,
  alt_parent_email: z.string().email().optional().or(z.literal("")).transform((v) => v || null),
  alt_parent_phone: optionalString,
  notes: optionalString,
});
export type StudentInput = z.infer<typeof studentSchema>;

export const tutorSchema = z.object({
  full_name: nonEmpty,
  email: z.string().email("Invalid email"),
  phone: nonEmpty,
  address: nonEmpty,
  pay_rate: requiredNonNegativeNumber,
  tfn: optionalString,
  bank_bsb: optionalString,
  bank_account: optionalString,
  emergency_name: nonEmpty,
  emergency_phone: nonEmpty,
  alt_emergency_name: optionalString,
  alt_emergency_phone: optionalString,
});
export type TutorInput = z.infer<typeof tutorSchema>;

export const sessionStudentSchema = z.object({
  student_id: z.string().uuid(),
  rate: requiredPositiveNumber,
});

export const sessionSchema = z
  .object({
    tutor_id: z.string().uuid("Select a tutor"),
    start_time: z.string().min(1, "Start time required"),
    end_time: z.string().min(1, "End time required"),
    topic: nonEmpty,
    notes: optionalString,
    status: sessionStatusEnum,
    cancellation_reason: optionalString,
    tutor_pay_rate: optionalNonNegativeNumber,
    students: z.array(sessionStudentSchema).min(1, "Select at least one student"),
  })
  .refine((v) => new Date(v.end_time) > new Date(v.start_time), {
    path: ["end_time"],
    message: "End time must be after start time",
  });
export type SessionInput = z.infer<typeof sessionSchema>;

export const paymentSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  amount: requiredPositiveNumber,
  method: paymentMethodEnum,
  description: optionalString,
  payment_date: isoDate,
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const expenseSchema = z.object({
  amount: requiredPositiveNumber,
  category: expenseCategoryEnum,
  description: nonEmpty,
  expense_date: isoDate,
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const resourceSchema = z.object({
  title: nonEmpty,
  subject: nonEmpty,
  grade_level: optionalGrade,
  url: z.string().url("Enter a valid URL"),
  notes: optionalString,
});
export type ResourceInput = z.infer<typeof resourceSchema>;

export const sessionResourceSchema = z.object({
  session_id: z.string().uuid(),
  resource_id: z.string().uuid("Select a resource"),
  student_id: z.string().uuid("Select a student"),
  notes: optionalString,
});
export type SessionResourceInput = z.infer<typeof sessionResourceSchema>;

// --- Phase 4: Availability ---------------------------------------

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

export const availabilityOwnerTypeEnum = z.enum(["tutor", "student"]);
export type AvailabilityOwnerType = z.infer<typeof availabilityOwnerTypeEnum>;

export const availabilitySchema = z
  .object({
    owner_type: availabilityOwnerTypeEnum,
    tutor_id: z.string().uuid().nullable().optional(),
    student_id: z.string().uuid().nullable().optional(),
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time_of_day: timeOfDay,
    end_time_of_day: timeOfDay,
    effective_from: isoDate.nullable().optional(),
    effective_until: isoDate.nullable().optional(),
  })
  .refine((v) => v.end_time_of_day > v.start_time_of_day, {
    path: ["end_time_of_day"],
    message: "End must be after start",
  })
  .refine(
    (v) =>
      v.owner_type === "tutor"
        ? !!v.tutor_id && !v.student_id
        : !!v.student_id && !v.tutor_id,
    { path: ["owner_type"], message: "Owner reference mismatch" },
  );
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

// --- Phase 4: Session series (recurring sessions) ----------------

export const seriesFrequencyEnum = z.enum([
  "weekly",
  "fortnightly",
  "monthly",
]);
export type SeriesFrequency = z.infer<typeof seriesFrequencyEnum>;

/**
 * The client submits a regular SessionInput plus this block to request that
 * the session repeat. The server expands it into multiple session rows,
 * all linked to the same session_series.
 */
export const sessionRecurrenceSchema = z.object({
  frequency: seriesFrequencyEnum,
  occurrences: z.coerce.number().int().min(2).max(52),
});
export type SessionRecurrenceInput = z.infer<typeof sessionRecurrenceSchema>;
