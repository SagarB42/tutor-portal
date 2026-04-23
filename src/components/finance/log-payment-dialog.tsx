"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
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
import {
  SelectField,
  TextField,
  TextareaField,
} from "@/components/shared/form-fields";
import { useActionForm } from "@/hooks/use-action-form";
import { createPayment, updatePayment } from "@/lib/actions/finance";
import { paymentSchema, type PaymentInput } from "@/lib/schemas";
import type { z } from "zod";

type PaymentRow = PaymentInput & { id: string };

type StudentOption = { id: string; full_name: string };

type Props = {
  students: StudentOption[];
  initialData?: PaymentRow | null;
  trigger?: React.ReactNode;
  defaultStudentId?: string;
};

const methodOptions = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "payid", label: "PayID" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

type PaymentFormInput = z.input<typeof paymentSchema>;

function makeDefaults(
  row: PaymentRow | null | undefined,
  defaultStudentId?: string,
): PaymentFormInput {
  if (!row) {
    return {
      student_id: defaultStudentId ?? "",
      amount: "",
      method: "bank_transfer",
      description: "",
      payment_date: todayISO(),
    };
  }
  return {
    student_id: row.student_id ?? "",
    amount: row.amount == null ? "" : String(row.amount),
    method: row.method ?? "bank_transfer",
    description: row.description ?? "",
    payment_date: row.payment_date ?? todayISO(),
  };
}

export function LogPaymentDialog({
  students,
  initialData,
  trigger,
  defaultStudentId,
}: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);

  const { form, onSubmit, pending } = useActionForm({
    schema: paymentSchema,
    action: isEdit
      ? (values) => updatePayment(initialData.id, values)
      : createPayment,
    defaultValues: makeDefaults(initialData, defaultStudentId),
    successMessage: isEdit ? "Payment updated" : "Payment logged",
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) form.reset(makeDefaults(null, defaultStudentId));
    },
  });

  const studentOptions = students.map((s) => ({
    value: s.id,
    label: s.full_name,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) form.reset(makeDefaults(initialData, defaultStudentId));
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <Plus className="mr-2 h-4 w-4" /> Log Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Payment" : "Log Payment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update payment details."
              : "Record a payment received from a student."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            <SelectField
              name="student_id"
              label="Student"
              required
              placeholder="Select student..."
              options={studentOptions}
            />
            <TextField
              name="amount"
              label="Amount"
              type="number"
              step="0.01"
              placeholder="$0.00"
              required
            />
            <SelectField
              name="method"
              label="Method"
              required
              options={methodOptions}
            />
            <TextField
              name="payment_date"
              label="Date"
              type="date"
              required
            />
            <TextareaField
              name="description"
              label="Description"
              placeholder="Description (optional)..."
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
