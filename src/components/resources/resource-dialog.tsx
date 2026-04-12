"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  initialData?: any;
  trigger?: React.ReactNode;
};

export function ResourceDialog({ onSuccess, initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const { organizationId } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  function prefill() {
    if (!initialData) return;
    setTitle(initialData.title || "");
    setSubject(initialData.subject || "");
    setGradeLevel(initialData.grade_level?.toString() ?? "");
    setUrl(initialData.url || "");
    setNotes(initialData.notes || "");
  }

  function resetForm() {
    setTitle(""); setSubject(""); setGradeLevel(""); setUrl(""); setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title,
      subject,
      grade_level: gradeLevel ? parseInt(gradeLevel) : null,
      url,
      notes: notes || null,
    };

    const { error } = isEdit
      ? await supabase.from("resources").update(payload).eq("id", initialData.id)
      : await supabase.from("resources").insert({ ...payload, organization_id: organizationId });

    if (error) alert("Error: " + error.message);
    else { setOpen(false); if (!isEdit) resetForm(); onSuccess?.(); }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) prefill(); }}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Add Resource</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Resource" : "Add Resource"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update resource details." : "Add a learning resource."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Grade</Label>
            <Input type="number" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">URL *</Label>
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" required />
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
