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
import { TextField } from "@/components/shared/form-fields";
import { useActionForm } from "@/hooks/use-action-form";
import { createTutor, updateTutor } from "@/lib/actions/tutors";
import { tutorSchema, type TutorInput } from "@/lib/schemas";

type TutorRow = TutorInput & { id: string };

type Props = {
  initialData?: TutorRow | null;
  trigger?: React.ReactNode;
};

const emptyDefaults = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  pay_rate: "",
  tfn: "",
  bank_bsb: "",
  bank_account: "",
  emergency_name: "",
  emergency_phone: "",
  alt_emergency_name: "",
  alt_emergency_phone: "",
};

function toFormValues(row: TutorRow | null | undefined) {
  if (!row) return { ...emptyDefaults };
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    pay_rate: row.pay_rate == null ? "" : String(row.pay_rate),
    tfn: row.tfn ?? "",
    bank_bsb: row.bank_bsb ?? "",
    bank_account: row.bank_account ?? "",
    emergency_name: row.emergency_name ?? "",
    emergency_phone: row.emergency_phone ?? "",
    alt_emergency_name: row.alt_emergency_name ?? "",
    alt_emergency_phone: row.alt_emergency_phone ?? "",
  };
}

export function TutorDialog({ initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);

  const action = isEdit
    ? (values: TutorInput) => updateTutor(initialData.id, values)
    : createTutor;

  const { form, onSubmit, pending } = useActionForm({
    schema: tutorSchema,
    action,
    defaultValues: toFormValues(initialData),
    successMessage: isEdit ? "Tutor updated" : "Tutor added",
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
            <Plus className="mr-2 h-4 w-4" /> Add Tutor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tutor" : "Add Tutor"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update tutor details." : "Enter tutor details below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Personal
              </h4>
              <TextField name="full_name" label="Name" required />
              <TextField name="email" type="email" label="Email" required />
              <TextField name="phone" label="Phone" required />
              <TextField name="address" label="Address" required />
            </section>

            <section className="space-y-3 border-b pb-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Payroll
              </h4>
              <TextField
                name="pay_rate"
                label="Rate ($/hr)"
                type="number"
                step="0.01"
                required
              />
              <TextField name="tfn" label="TFN" />
              <TextField
                name="bank_bsb"
                label="BSB"
                placeholder="000-000"
              />
              <TextField name="bank_account" label="Account #" />
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Emergency Contacts
              </h4>
              <TextField name="emergency_name" label="Name" required />
              <TextField name="emergency_phone" label="Phone" required />
              <div className="border-t pt-3 mt-2 space-y-3">
                <TextField name="alt_emergency_name" label="Alt Name" />
                <TextField name="alt_emergency_phone" label="Alt Phone" />
              </div>
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
