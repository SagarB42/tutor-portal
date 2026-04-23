"use client";

import { format } from "date-fns";
import { Loader2, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SelectField,
  TextField,
  TextareaField,
} from "@/components/shared/form-fields";
import { useActionForm } from "@/hooks/use-action-form";
import {
  createRecurringSessions,
  createSession,
  updateSession,
} from "@/lib/actions/sessions";
import { sessionSchema, type SessionInput } from "@/lib/schemas";

export type SessionStudentOption = {
  id: string;
  full_name: string;
  default_rate: number | null;
  archived_at: string | null;
};

export type SessionTutorOption = {
  id: string;
  full_name: string;
  pay_rate: number | null;
  archived_at: string | null;
};

export type SessionInitialData = {
  id: string;
  tutor_id: string | null;
  start_time: string;
  end_time: string;
  topic: string;
  status: SessionInput["status"];
  notes: string | null;
  cancellation_reason: string | null;
  tutor_pay_rate: number | null;
  session_students?: Array<{
    student_id: string;
    rate: number;
    students?: {
      id: string;
      full_name: string;
      default_rate?: number | null;
      archived_at?: string | null;
    } | null;
  }> | null;
};

type Props = {
  students: SessionStudentOption[];
  tutors: SessionTutorOption[];
  initialData?: SessionInitialData | null;
  trigger?: React.ReactNode;
};

/** Format an ISO/date string for a `datetime-local` input (local time, no TZ). */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}

function makeDefaults(initialData: SessionInitialData | null | undefined) {
  if (!initialData) {
    return {
      tutor_id: "",
      start_time: "",
      end_time: "",
      topic: "",
      status: "completed" as const,
      notes: "",
      cancellation_reason: "",
      tutor_pay_rate: "",
      students: [] as Array<{ student_id: string; rate: string }>,
    };
  }
  return {
    tutor_id: initialData.tutor_id ?? "",
    start_time: toLocalInput(initialData.start_time),
    end_time: toLocalInput(initialData.end_time),
    topic: initialData.topic ?? "",
    status: initialData.status ?? ("completed" as const),
    notes: initialData.notes ?? "",
    cancellation_reason: initialData.cancellation_reason ?? "",
    tutor_pay_rate:
      initialData.tutor_pay_rate == null
        ? ""
        : String(initialData.tutor_pay_rate),
    students: (initialData.session_students ?? []).map((ss) => ({
      student_id: ss.student_id,
      rate: String(ss.rate),
    })),
  };
}

export function SessionDialog({
  students,
  tutors,
  initialData,
  trigger,
}: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<
    "weekly" | "fortnightly" | "monthly"
  >("weekly");
  const [repeatOccurrences, setRepeatOccurrences] = useState("4");

  // Merge in any archived students/tutors referenced by this session so they
  // render even though the RSC page only sends active rows.
  const mergedStudents = useMemo<SessionStudentOption[]>(() => {
    if (!initialData?.session_students) return students;
    const archived = initialData.session_students
      .map((ss) => ss.students)
      .filter((s): s is NonNullable<typeof s> => !!s && !!s.archived_at)
      .map((s) => ({
        id: s.id,
        full_name: s.full_name,
        default_rate: s.default_rate ?? null,
        archived_at: s.archived_at ?? null,
      }));
    const existing = new Set(students.map((s) => s.id));
    return [...students, ...archived.filter((s) => !existing.has(s.id))];
  }, [students, initialData]);

  const mergedTutors = useMemo<SessionTutorOption[]>(() => {
    if (!initialData?.tutor_id) return tutors;
    const isPresent = tutors.some((t) => t.id === initialData.tutor_id);
    if (isPresent) return tutors;
    // If the archived tutor row didn't come through props, fall back to a stub.
    return [
      ...tutors,
      {
        id: initialData.tutor_id,
        full_name: "(archived tutor)",
        pay_rate: null,
        archived_at: new Date().toISOString(),
      },
    ];
  }, [tutors, initialData]);

  const studentLookup = useMemo(
    () => new Map(mergedStudents.map((s) => [s.id, s])),
    [mergedStudents],
  );

  const { form, onSubmit, pending } = useActionForm({
    schema: sessionSchema,
    action: async (values) => {
      const payload: SessionInput = {
        ...values,
        start_time: fromLocalInput(values.start_time),
        end_time: fromLocalInput(values.end_time),
      };
      if (isEdit) return updateSession(initialData.id, payload);
      if (repeatEnabled) {
        const occ = Number(repeatOccurrences);
        if (!Number.isFinite(occ) || occ < 2 || occ > 52) {
          return { ok: false as const, error: "Occurrences must be 2-52" };
        }
        const res = await createRecurringSessions(payload, {
          frequency: repeatFrequency,
          occurrences: occ,
        });
        if (!res.ok) return res;
        return { ok: true as const, data: { id: res.data.series_id } };
      }
      return createSession(payload);
    },
    defaultValues: makeDefaults(initialData),
    successMessage: isEdit
      ? "Session updated"
      : repeatEnabled
        ? "Recurring sessions created"
        : "Session logged",
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) {
        form.reset(makeDefaults(null));
        setRepeatEnabled(false);
      }
    },
  });

  const studentsArray = useFieldArray({
    control: form.control,
    name: "students",
  });

  const watchedStudents = form.watch("students") ?? [];
  const watchedStatus = form.watch("status");
  const isCancelled = watchedStatus?.startsWith("cancelled");

  function addStudent(studentId: string) {
    if (!studentId) return;
    if (watchedStudents.some((s) => s.student_id === studentId)) return;
    const s = studentLookup.get(studentId);
    studentsArray.append({
      student_id: studentId,
      rate: s?.default_rate == null ? "" : String(s.default_rate),
    });
  }

  function handleTutorChange(id: string) {
    form.setValue("tutor_id", id);
    if (!isEdit) {
      const tutor = mergedTutors.find((t) => t.id === id);
      if (tutor?.pay_rate != null) {
        form.setValue("tutor_pay_rate", String(tutor.pay_rate));
      }
    }
  }

  const statusOptions = [
    { value: "completed", label: "Completed" },
    { value: "scheduled", label: "Scheduled" },
    { value: "cancelled_billable", label: "Cancelled (Billable)" },
    { value: "cancelled_free", label: "Cancelled (Free)" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) form.reset(makeDefaults(initialData));
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Log Session
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Session" : "Log Session"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update session details."
              : "Record a completed session or schedule a future one."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            {/* Students */}
            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Students <span className="text-destructive">*</span>
              </h4>
              <Select onValueChange={addStudent} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Add a student..." />
                </SelectTrigger>
                <SelectContent>
                  {mergedStudents
                    .filter(
                      (s) =>
                        !watchedStudents.some((ws) => ws.student_id === s.id) &&
                        !s.archived_at,
                    )
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                        {s.default_rate != null && ` ($${s.default_rate}/hr)`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {studentsArray.fields.length > 0 && (
                <div className="space-y-2">
                  {studentsArray.fields.map((field, index) => {
                    const studentId = watchedStudents[index]?.student_id;
                    const student = studentId
                      ? studentLookup.get(studentId)
                      : undefined;
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                      >
                        <span className="flex-1 truncate text-sm font-medium">
                          {student?.full_name ?? "Unknown"}
                          {student?.archived_at && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (archived)
                            </span>
                          )}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 w-24 text-sm"
                          placeholder="$/hr"
                          {...form.register(`students.${index}.rate`)}
                        />
                        <span className="text-xs text-muted-foreground">
                          /hr
                        </span>
                        <button
                          type="button"
                          onClick={() => studentsArray.remove(index)}
                          className="cursor-pointer text-muted-foreground hover:text-destructive"
                          aria-label="Remove student"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {form.formState.errors.students && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.students.message ??
                    form.formState.errors.students.root?.message ??
                    "Select at least one student with a positive rate."}
                </p>
              )}
            </section>

            {/* Tutor */}
            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Tutor
              </h4>
              <div className="space-y-1">
                <Label className="text-sm">
                  Tutor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("tutor_id") ?? ""}
                  onValueChange={handleTutorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tutor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mergedTutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                        {t.pay_rate != null && ` ($${t.pay_rate}/hr)`}
                        {t.archived_at && " (archived)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.tutor_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.tutor_id.message}
                  </p>
                )}
              </div>
              {form.watch("tutor_id") && (
                <TextField
                  name="tutor_pay_rate"
                  label="Tutor Pay Rate ($/hr)"
                  type="number"
                  step="0.01"
                  placeholder="$/hr"
                />
              )}
            </section>

            {/* Schedule */}
            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Schedule
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  name="start_time"
                  label="Start"
                  type="datetime-local"
                  required
                />
                <TextField
                  name="end_time"
                  label="End"
                  type="datetime-local"
                  required
                />
              </div>
            </section>

            {!isEdit && (
              <section className="space-y-3 border-b pb-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={repeatEnabled}
                    onChange={(e) => setRepeatEnabled(e.target.checked)}
                  />
                  Repeat this session
                </label>
                {repeatEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Frequency</Label>
                      <Select
                        value={repeatFrequency}
                        onValueChange={(v) =>
                          setRepeatFrequency(
                            v as "weekly" | "fortnightly" | "monthly",
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">
                            Fortnightly
                          </SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Occurrences</Label>
                      <Input
                        type="number"
                        min={2}
                        max={52}
                        value={repeatOccurrences}
                        onChange={(e) =>
                          setRepeatOccurrences(e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Details */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Details
              </h4>
              <TextField
                name="topic"
                label="Topic"
                placeholder="e.g. Algebra Review"
                required
              />
              <SelectField
                name="status"
                label="Status"
                options={statusOptions}
              />
              {isCancelled && (
                <TextField
                  name="cancellation_reason"
                  label="Cancellation Reason"
                  placeholder="Why was the session cancelled?"
                />
              )}
              <TextareaField
                name="notes"
                label="Notes"
                placeholder="Session notes..."
              />
            </section>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update Session" : "Save Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
