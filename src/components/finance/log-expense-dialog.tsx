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
import { createExpense, updateExpense } from "@/lib/actions/finance";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";
import type { z } from "zod";

type ExpenseRow = ExpenseInput & { id: string };

type Props = {
  initialData?: ExpenseRow | null;
  trigger?: React.ReactNode;
};

const categoryOptions = [
  { value: "materials", label: "Materials" },
  { value: "software", label: "Software" },
  { value: "rent", label: "Rent" },
  { value: "travel", label: "Travel" },
  { value: "tutor_pay", label: "Tutor Pay" },
  { value: "other", label: "Other" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

type ExpenseFormInput = z.input<typeof expenseSchema>;

function makeDefaults(row: ExpenseRow | null | undefined): ExpenseFormInput {
  if (!row) {
    return {
      amount: "",
      category: "other",
      description: "",
      expense_date: todayISO(),
    };
  }
  return {
    amount: row.amount == null ? "" : String(row.amount),
    category: row.category ?? "other",
    description: row.description ?? "",
    expense_date: row.expense_date ?? todayISO(),
  };
}

export function LogExpenseDialog({ initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);

  const { form, onSubmit, pending } = useActionForm({
    schema: expenseSchema,
    action: isEdit
      ? (values) => updateExpense(initialData.id, values)
      : createExpense,
    defaultValues: makeDefaults(initialData),
    successMessage: isEdit ? "Expense updated" : "Expense logged",
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) form.reset(makeDefaults(null));
    },
  });

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
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            <Plus className="mr-2 h-4 w-4" /> Log Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Log Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update expense details."
              : "Record a business expense."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            <TextField
              name="amount"
              label="Amount"
              type="number"
              step="0.01"
              placeholder="$0.00"
              required
            />
            <SelectField
              name="category"
              label="Category"
              required
              options={categoryOptions}
            />
            <TextField
              name="expense_date"
              label="Date"
              type="date"
              required
            />
            <TextareaField
              name="description"
              label="Description"
              placeholder="What was this expense for?"
              required
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
