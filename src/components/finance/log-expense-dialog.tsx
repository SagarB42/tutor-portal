"use client";

import { useState } from "react";
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

const categories = [
  { value: "materials", label: "Materials" },
  { value: "software", label: "Software" },
  { value: "rent", label: "Rent" },
  { value: "travel", label: "Travel" },
  { value: "tutor_pay", label: "Tutor Pay" },
  { value: "other", label: "Other" },
];

export function LogExpenseDialog({ onSuccess, initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const { organizationId } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState("");

  function prefill() {
    if (!initialData) return;
    setAmount(initialData.amount?.toString() ?? "");
    setCategory(initialData.category || "other");
    setDescription(initialData.description || "");
    setExpenseDate(initialData.expense_date || "");
  }

  function resetForm() {
    setAmount(""); setCategory("other"); setDescription(""); setExpenseDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      amount: parseFloat(amount) || 0,
      category,
      description,
      expense_date: expenseDate || new Date().toISOString().split("T")[0],
    };

    const { error } = isEdit
      ? await supabase.from("expenses").update(payload).eq("id", initialData.id)
      : await supabase.from("expenses").insert({ ...payload, organization_id: organizationId });

    if (error) alert("Error: " + error.message);
    else { setOpen(false); if (!isEdit) resetForm(); onSuccess?.(); }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) prefill(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
            <Plus className="mr-2 h-4 w-4" /> Log Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Log Expense"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update expense details." : "Record a business expense."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Amount *</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" placeholder="$0.00" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-sm">Date *</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="col-span-3" required />
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description *" required />
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
