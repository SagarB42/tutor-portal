"use client";

import { Loader2, Paperclip } from "lucide-react";
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
  TextareaField,
} from "@/components/shared/form-fields";
import { useActionForm } from "@/hooks/use-action-form";
import { linkResourceToSession } from "@/lib/actions/sessions";
import { sessionResourceSchema } from "@/lib/schemas";

type ResourceOption = { id: string; title: string; subject: string };
type StudentOption = { id: string; full_name: string };

type Props = {
  sessionId: string;
  resources: ResourceOption[];
  sessionStudents: StudentOption[];
};

export function LinkResourceDialog({
  sessionId,
  resources,
  sessionStudents,
}: Props) {
  const [open, setOpen] = useState(false);

  const defaultValues = {
    session_id: sessionId,
    resource_id: "",
    student_id: "",
    notes: "",
  };

  const { form, onSubmit, pending } = useActionForm({
    schema: sessionResourceSchema,
    action: linkResourceToSession,
    defaultValues,
    successMessage: "Resource linked",
    onSuccess: () => {
      setOpen(false);
      form.reset(defaultValues);
    },
  });

  const resourceOptions = resources.map((r) => ({
    value: r.id,
    label: `${r.title} (${r.subject})`,
  }));
  const studentOptions = sessionStudents.map((s) => ({
    value: s.id,
    label: s.full_name,
  }));

  const disabled = sessionStudents.length === 0 || resources.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) form.reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Paperclip className="mr-2 h-4 w-4" /> Link Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Link Resource</DialogTitle>
          <DialogDescription>
            Attach a resource to a student in this session.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            <SelectField
              name="resource_id"
              label="Resource"
              required
              placeholder="Select resource..."
              options={resourceOptions}
            />
            <SelectField
              name="student_id"
              label="Student"
              required
              placeholder="Select student..."
              options={studentOptions}
            />
            <TextareaField name="notes" label="Notes" placeholder="Notes..." />

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
