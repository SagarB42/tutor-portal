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
import { TextField, TextareaField } from "@/components/shared/form-fields";
import { useActionForm } from "@/hooks/use-action-form";
import { createStudent, updateStudent } from "@/lib/actions/students";
import { studentSchema, type StudentInput } from "@/lib/schemas";

type StudentRow = StudentInput & { id: string };

type Props = {
  initialData?: StudentRow | null;
  trigger?: React.ReactNode;
};

const emptyDefaults = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  grade_level: "",
  default_rate: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  alt_parent_name: "",
  alt_parent_email: "",
  alt_parent_phone: "",
  notes: "",
};

function toFormValues(row: StudentRow | null | undefined) {
  if (!row) return emptyDefaults;
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    grade_level: row.grade_level == null ? "" : String(row.grade_level),
    default_rate: row.default_rate == null ? "" : String(row.default_rate),
    parent_name: row.parent_name ?? "",
    parent_email: row.parent_email ?? "",
    parent_phone: row.parent_phone ?? "",
    alt_parent_name: row.alt_parent_name ?? "",
    alt_parent_email: row.alt_parent_email ?? "",
    alt_parent_phone: row.alt_parent_phone ?? "",
    notes: row.notes ?? "",
  };
}

export function StudentDialog({ initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);

  const { form, onSubmit, pending } = useActionForm({
    schema: studentSchema,
    action: isEdit
      ? (values) => updateStudent(initialData.id, values)
      : createStudent,
    defaultValues: toFormValues(initialData),
    successMessage: isEdit ? "Student updated" : "Student added",
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) form.reset(emptyDefaults);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) form.reset(toFormValues(initialData));
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update student details." : "Enter student details below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Student Info
              </h4>
              <TextField name="full_name" label="Name" required />
              <TextField name="email" type="email" label="Email" />
              <TextField name="phone" label="Phone" />
              <TextField
                name="address"
                label="Address"
                placeholder="Street, suburb, postcode"
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  name="grade_level"
                  label="Grade"
                  type="number"
                  placeholder="e.g. 10"
                />
                <TextField
                  name="default_rate"
                  label="Rate ($/hr)"
                  type="number"
                  step="0.01"
                  required
                />
              </div>
            </section>

            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Parent / Guardian
              </h4>
              <TextField name="parent_name" label="Name" required />
              <TextField
                name="parent_email"
                type="email"
                label="Email"
                required
              />
              <TextField name="parent_phone" label="Phone" required />
            </section>

            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Alt Parent (Optional)
              </h4>
              <TextField name="alt_parent_name" label="Name" />
              <TextField
                name="alt_parent_email"
                type="email"
                label="Email"
              />
              <TextField name="alt_parent_phone" label="Phone" />
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Notes
              </h4>
              <TextareaField
                name="notes"
                placeholder="Any additional notes..."
              />
            </section>

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
