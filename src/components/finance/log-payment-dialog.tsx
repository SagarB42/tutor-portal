"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  initialData?: any;
  trigger?: React.ReactNode;
};

const methods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "payid", label: "PayID" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export function LogPaymentDialog({ onSuccess, initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const { organizationId } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [description, setDescription] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase.from("students").select("id, full_name").order("full_name").then(({ data }) => setStudents(data || []));
  }, [open]);

  function prefill() {
    if (!initialData) return;
    setStudentId(initialData.student_id || "");
    setAmount(initialData.amount?.toString() ?? "");
    setMethod(initialData.method || "bank_transfer");
    setDescription(initialData.description || "");
    setPaymentDate(initialData.payment_date || "");
  }

  function resetForm() {
    setStudentId(""); setAmount(""); setMethod("bank_transfer"); setDescription(""); setPaymentDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      student_id: studentId || null,
      amount: parseFloat(amount) || 0,
      method,
      description: description || null,
      payment_date: paymentDate || new Date().toISOString().split("T")[0],
    };

    const { error } = isEdit
      ? await supabase.from("payments").update(payload).eq("id", initialData.id)
      : await supabase.from("payments").insert({ ...payload, organization_id: organizationId });

    if (error) alert("Error: " + error.message);
    else { setOpen(false); if (!isEdit) resetForm(); onSuccess?.(); }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) prefill(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
            <Plus className="mr-2 h-4 w-4" /> Log Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Payment" : "Log Payment"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update payment details." : "Record a payment received from a student."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select student..." /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Amount *</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" placeholder="$0.00" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Date *</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="col-span-3" required />
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)..." />
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
