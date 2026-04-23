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
import { createResource, updateResource } from "@/lib/actions/resources";
import { resourceSchema, type ResourceInput } from "@/lib/schemas";

type ResourceRow = ResourceInput & { id: string };

type Props = {
  initialData?: ResourceRow | null;
  trigger?: React.ReactNode;
};

const emptyDefaults = {
  title: "",
  subject: "",
  grade_level: "",
  url: "",
  notes: "",
};

function toFormValues(row: ResourceRow | null | undefined) {
  if (!row) return emptyDefaults;
  return {
    title: row.title ?? "",
    subject: row.subject ?? "",
    grade_level: row.grade_level == null ? "" : String(row.grade_level),
    url: row.url ?? "",
    notes: row.notes ?? "",
  };
}

export function ResourceDialog({ initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);

  const { form, onSubmit, pending } = useActionForm({
    schema: resourceSchema,
    action: isEdit
      ? (values) => updateResource(initialData.id, values)
      : createResource,
    defaultValues: toFormValues(initialData),
    successMessage: isEdit ? "Resource updated" : "Resource added",
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
            <Plus className="mr-2 h-4 w-4" /> Add Resource
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Resource" : "Add Resource"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update resource details." : "Add a learning resource."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            <TextField name="title" label="Title" required />
            <TextField name="subject" label="Subject" required />
            <TextField
              name="grade_level"
              label="Grade"
              type="number"
              placeholder="e.g. 10"
            />
            <TextField
              name="url"
              label="URL"
              required
              type="url"
              placeholder="https://..."
            />
            <TextareaField name="notes" label="Notes" />

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
