"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  initialData?: any;
  trigger?: React.ReactNode;
};

export function TutorDialog({ onSuccess, initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const { organizationId } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payRate, setPayRate] = useState("");
  const [tfn, setTfn] = useState("");
  const [bankBsb, setBankBsb] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [altEmergencyName, setAltEmergencyName] = useState("");
  const [altEmergencyPhone, setAltEmergencyPhone] = useState("");

  function prefill() {
    if (!initialData) return;
    setFullName(initialData.full_name || "");
    setEmail(initialData.email || "");
    setPhone(initialData.phone || "");
    setAddress(initialData.address || "");
    setPayRate(initialData.pay_rate?.toString() ?? "");
    setTfn(initialData.tfn || "");
    setBankBsb(initialData.bank_bsb || "");
    setBankAccount(initialData.bank_account || "");
    setEmergencyName(initialData.emergency_name || "");
    setEmergencyPhone(initialData.emergency_phone || "");
    setAltEmergencyName(initialData.alt_emergency_name || "");
    setAltEmergencyPhone(initialData.alt_emergency_phone || "");
  }

  function resetForm() {
    setFullName(""); setEmail(""); setPhone(""); setAddress(""); setPayRate("");
    setTfn(""); setBankBsb(""); setBankAccount("");
    setEmergencyName(""); setEmergencyPhone(""); setAltEmergencyName(""); setAltEmergencyPhone("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      full_name: fullName,
      email,
      phone,
      address,
      pay_rate: parseFloat(payRate) || 0,
      tfn: tfn || null,
      bank_bsb: bankBsb || null,
      bank_account: bankAccount || null,
      emergency_name: emergencyName,
      emergency_phone: emergencyPhone,
      alt_emergency_name: altEmergencyName || null,
      alt_emergency_phone: altEmergencyPhone || null,
    };

    const { error } = isEdit
      ? await supabase.from("tutors").update(payload).eq("id", initialData.id)
      : await supabase.from("tutors").insert({ ...payload, organization_id: organizationId });

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
        {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Add Tutor</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tutor" : "Add Tutor"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update tutor details." : "Enter tutor details below."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Personal</h4>
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
              <Label className="text-right text-sm">Address *</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" required />
            </div>
          </div>

          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Payroll</h4>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Rate ($/hr) *</Label>
              <Input type="number" step="0.01" value={payRate} onChange={(e) => setPayRate(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">TFN</Label>
              <Input value={tfn} onChange={(e) => setTfn(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">BSB</Label>
              <Input value={bankBsb} onChange={(e) => setBankBsb(e.target.value)} className="col-span-3" placeholder="000-000" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Account #</Label>
              <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="col-span-3" />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Emergency Contacts</h4>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Name *</Label>
              <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-sm">Phone *</Label>
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="col-span-3" required />
            </div>
            <div className="border-t pt-3 mt-2 space-y-3">
              <div className="grid grid-cols-4 items-center gap-3">
                <Label className="text-right text-sm">Alt Name</Label>
                <Input value={altEmergencyName} onChange={(e) => setAltEmergencyName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-3">
                <Label className="text-right text-sm">Alt Phone</Label>
                <Input value={altEmergencyPhone} onChange={(e) => setAltEmergencyPhone(e.target.value)} className="col-span-3" />
              </div>
            </div>
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
