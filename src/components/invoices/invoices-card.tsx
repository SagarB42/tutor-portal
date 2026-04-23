"use client";

import { format } from "date-fns";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraftEmailButton } from "@/components/emails/draft-email-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateInvoice,
  getInvoiceSignedUrl,
  markInvoiceSent,
  recordInvoicePayment,
  voidInvoice,
} from "@/lib/actions/invoices";
import type { InvoiceLineItem } from "@/lib/queries/invoices";
import type { InvoiceRow } from "@/lib/db-types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  studentId: string;
  invoices: InvoiceRow[];
  billableLines: InvoiceLineItem[];
};

const statusVariants: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  void: "bg-rose-100 text-rose-700",
};

export function InvoicesCard({ studentId, invoices, billableLines }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Invoices</CardTitle>
        <GenerateInvoiceDialog
          studentId={studentId}
          billableLines={billableLines}
        />
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <InvoiceRowItem key={inv.id} invoice={inv} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceRowItem({ invoice }: { invoice: InvoiceRow }) {
  const [pending, startTransition] = useTransition();
  const [paymentOpen, setPaymentOpen] = useState(false);

  function handleDownload() {
    startTransition(async () => {
      const res = await getInvoiceSignedUrl(invoice.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.data.url, "_blank");
    });
  }

  function handleMarkSent() {
    startTransition(async () => {
      const res = await markInvoiceSent({ invoice_id: invoice.id });
      if (!res.ok) toast.error(res.error);
      else toast.success("Marked as sent");
    });
  }

  function handleVoid() {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await voidInvoice({ invoice_id: invoice.id });
      if (!res.ok) toast.error(res.error);
      else toast.success("Invoice voided");
    });
  }

  const canSend = invoice.status === "draft";
  const canPay =
    invoice.status !== "void" && invoice.status !== "paid";
  const canVoid = invoice.status !== "paid" && invoice.status !== "void";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{invoice.invoice_number}</span>
          <Badge
            variant="outline"
            className={statusVariants[invoice.status] ?? ""}
          >
            {invoice.status}
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {format(new Date(invoice.issue_date), "dd MMM yyyy")}
          {invoice.due_date &&
            ` · due ${format(new Date(invoice.due_date), "dd MMM yyyy")}`}
          {` · ${formatCurrency(Number(invoice.amount))}`}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !invoice.pdf_url}
          onClick={handleDownload}
        >
          <Download className="mr-1 h-3.5 w-3.5" /> PDF
        </Button>
        {canSend && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleMarkSent}
          >
            <Send className="mr-1 h-3.5 w-3.5" /> Mark sent
          </Button>
        )}
        {invoice.status !== "paid" && invoice.status !== "void" && (
          <DraftEmailButton
            contextType="invoice_reminder"
            contextId={invoice.id}
            label="Email reminder"
          />
        )}
        {canPay && (
          <RecordPaymentDialog
            invoice={invoice}
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
          />
        )}
        {canVoid && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-rose-600 hover:bg-rose-50"
            disabled={pending}
            onClick={handleVoid}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Void
          </Button>
        )}
      </div>
    </li>
  );
}

function GenerateInvoiceDialog({
  studentId,
  billableLines,
}: {
  studentId: string;
  billableLines: InvoiceLineItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(billableLines.map((l) => l.session_id)),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const subtotal = billableLines
    .filter((l) => selected.has(l.session_id))
    .reduce((s, l) => s + l.amount, 0);

  function handleGenerate() {
    if (selected.size === 0) {
      toast.error("Select at least one session");
      return;
    }
    startTransition(async () => {
      const res = await generateInvoice({
        student_id: studentId,
        due_date: dueDate || null,
        notes: notes || null,
        session_ids: Array.from(selected),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Invoice generated");
      setOpen(false);
      setNotes("");
      setDueDate("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={billableLines.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Generate invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Generate invoice</DialogTitle>
          <DialogDescription>
            Select the billable sessions to include. A PDF will be rendered
            and stored against this student.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {billableLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This student has no billable sessions.
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
              {billableLines.map((l) => (
                <label
                  key={l.session_id}
                  className="flex cursor-pointer items-center gap-3 rounded p-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(l.session_id)}
                    onChange={() => toggle(l.session_id)}
                  />
                  <div className="flex-1 min-w-0 truncate">
                    <span className="font-medium">{l.topic}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {format(new Date(l.start_time), "dd MMM yyyy")} ·{" "}
                      {l.hours}h @ {formatCurrency(l.rate)}
                    </span>
                  </div>
                  <span className="tabular-nums">
                    {formatCurrency(l.amount)}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="due_date">Due date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex items-end justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(subtotal)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="invoice_notes">Notes</Label>
            <Textarea
              id="invoice_notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes shown on the PDF"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={handleGenerate}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(invoice.amount));
  const [method, setMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState("");

  function handleRecord() {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    startTransition(async () => {
      const res = await recordInvoicePayment({
        invoice_id: invoice.id,
        amount: amt,
        method: method as "cash" | "bank_transfer" | "payid" | "card" | "other",
        payment_date: paymentDate,
        description: description || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment recorded");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Check className="mr-1 h-3.5 w-3.5" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Applies a payment against {invoice.invoice_number}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="rp_amount">Amount</Label>
            <Input
              id="rp_amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="payid">PayID</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rp_date">Date</Label>
            <Input
              id="rp_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rp_desc">Description</Label>
            <Input
              id="rp_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" disabled={pending} onClick={handleRecord}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
