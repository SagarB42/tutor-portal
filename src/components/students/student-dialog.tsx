"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  initialData?: any;
  trigger?: React.ReactNode;
};

export function StudentDialog({ onSuccess, initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const { organizationId } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [altParentName, setAltParentName] = useState("");
  const [altParentEmail, setAltParentEmail] = useState("");
  const [altParentPhone, setAltParentPhone] = useState("");
  const [notes, setNotes] = useState("");

  function prefill() {
    if (!initialData) return;
    setFullName(initialData.full_name || "");
    setEmail(initialData.email || "");
    setPhone(initialData.phone || "");
    setGradeLevel(initialData.grade_level?.toString() ?? "");
    setDefaultRate(initialData.default_rate?.toString() ?? "");
    setParentName(initialData.parent_name || "");
    setParentEmail(initialData.parent_email || "");
    setParentPhone(initialData.parent_phone || "");
    setAltParentName(initialData.alt_parent_name || "");
    setAltParentEmail(initialData.alt_parent_email || "");
    setAltParentPhone(initialData.alt_parent_phone || "");
    setNotes(initialData.notes || "");
  }

  function resetForm() {
    setFullName(""); setEmail(""); setPhone(""); setGradeLevel(""); setDefaultRate("");
    setParentName(""); setParentEmail(""); setParentPhone("");
    setAltParentName(""); setAltParentEmail(""); setAltParentPhone("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      full_name: fullName,
      email,
      phone,
      grade_level: gradeLevel ? parseInt(gradeLevel) : null,
      default_rate: parseFloat(defaultRate) || 0,
      parent_name: parentName,
      parent_email: parentEmail,
      parent_phone: parentPhone,
      alt_parent_name: altParentName || null,
      alt_parent_email: altParentEmail || null,
      alt_parent_phone: altParentPhone || null,
      notes: notes || null,
    };

    const { error } = isEdit
      ? await supabase.from("students").update(payload).eq("id", initialData.id)
      : await supabase.from("students").insert({ ...payload, organization_id: organizationId });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setOpen(false);
      if (!isEdit) resetForm();
      onSuccess?.();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) prefill(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update student details." : "Enter student details below."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Student Info</h4>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Grade</Label>
              <Input type="number" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="col-span-3" placeholder="e.g. 10" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Rate ($/hr) *</Label>
              <Input type="number" step="0.01" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} className="col-span-3" required />
            </div>
          </div>

          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Parent / Guardian</h4>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Name *</Label>
              <Input value={parentName} onChange={(e) => setParentName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Email *</Label>
              <Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Phone *</Label>
              <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="col-span-3" required />
            </div>
          </div>

          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Alt Parent (Optional)</h4>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Name</Label>
              <Input value={altParentName} onChange={(e) => setAltParentName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Email</Label>
              <Input type="email" value={altParentEmail} onChange={(e) => setAltParentEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Phone</Label>
              <Input value={altParentPhone} onChange={(e) => setAltParentPhone(e.target.value)} className="col-span-3" />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Notes</h4>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>

          <div className="flex justify-end pt-2">
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
