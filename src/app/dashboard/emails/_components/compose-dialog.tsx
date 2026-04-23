"use client";

import * as React from "react";
import { Loader2, Send, Sparkles, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveDraftAction, updateDraftAction } from "@/lib/actions/emails";
import type { EmailDraftContext } from "@/lib/db-types";

export type ComposeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContextType?: EmailDraftContext;
  contextId?: string | null;
  studentId?: string | null;
  prefillToEmail?: string | null;
  prefillSubject?: string;
  prefillBody?: string;
  prefillInstructions?: string;
  /**
   * If true, hide the contextType selector because the caller opened the
   * dialog from an entity page with a specific context.
   */
  lockContextType?: boolean;
};

const contextTypeOptions: { value: EmailDraftContext; label: string; needsContextId: boolean }[] = [
  { value: "custom", label: "Custom (free-form)", needsContextId: false },
  { value: "session_summary", label: "Session summary", needsContextId: true },
  { value: "invoice_reminder", label: "Invoice reminder", needsContextId: true },
  { value: "prepaid_topup", label: "Prepaid top-up", needsContextId: false },
  { value: "attendance_absence", label: "Attendance follow-up", needsContextId: true },
  { value: "resource_assignment", label: "Resource share", needsContextId: true },
  { value: "marketing", label: "Marketing", needsContextId: false },
];

export function ComposeDialog(props: ComposeDialogProps) {
  const {
    open,
    onOpenChange,
    defaultContextType = "custom",
    contextId,
    studentId,
    prefillToEmail,
    prefillSubject,
    prefillBody,
    prefillInstructions,
    lockContextType,
  } = props;

  const [contextType, setContextType] = React.useState<EmailDraftContext>(defaultContextType);
  const [tone, setTone] = React.useState<"professional" | "friendly" | "formal">("friendly");
  const [instructions, setInstructions] = React.useState(prefillInstructions ?? "");
  const [toEmail, setToEmail] = React.useState(prefillToEmail ?? "");
  const [subject, setSubject] = React.useState(prefillSubject ?? "");
  const [body, setBody] = React.useState(prefillBody ?? "");
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset when opened fresh
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setContextType(defaultContextType);
    setInstructions(prefillInstructions ?? "");
    setToEmail(prefillToEmail ?? "");
    setSubject(prefillSubject ?? "");
    setBody(prefillBody ?? "");
    setDraftId(null);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    open,
    defaultContextType,
    prefillInstructions,
    prefillToEmail,
    prefillSubject,
    prefillBody,
  ]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSubject("");
    setBody("");
    try {
      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType,
          contextId: contextId ?? null,
          studentId: studentId ?? null,
          tone,
          extraInstructions: instructions || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // streamObject emits incremental JSON partials (one per chunk).
      // Each chunk is the full JSON object up to that point.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Try parsing progressively — the AI SDK text stream mode of
        // streamObject returns partial JSON. We attempt JSON.parse on the
        // buffer and fall back silently until the whole thing is valid.
        try {
          const parsed = JSON.parse(buf) as { subject?: string; body?: string };
          if (typeof parsed.subject === "string") setSubject(parsed.subject);
          if (typeof parsed.body === "string") setBody(parsed.body);
        } catch {
          // still streaming — ignore partial
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const canSave = toEmail.trim() && subject.trim() && body.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (draftId) {
        await updateDraftAction({ id: draftId, toEmail, subject, body });
      } else {
        const row = await saveDraftAction({
          contextType,
          contextId: contextId ?? null,
          studentId: studentId ?? null,
          toEmail,
          subject,
          body,
        });
        setDraftId(row.id);
      }
      toast.success("Draft saved");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!canSave) return;
    setSending(true);
    setError(null);
    try {
      // Ensure we have a draftId first
      let id = draftId;
      if (!id) {
        const row = await saveDraftAction({
          contextType,
          contextId: contextId ?? null,
          studentId: studentId ?? null,
          toEmail,
          subject,
          body,
        });
        id = row.id;
        setDraftId(id);
      }
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: id, toEmail, subject, body }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast.success("Email sent");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const busy = generating || saving || sending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Compose email
          </DialogTitle>
          <DialogDescription>
            Use AI to draft an email, edit it, then save or send via Resend.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Context</Label>
              <Select
                value={contextType}
                onValueChange={(v) => setContextType(v as EmailDraftContext)}
                disabled={lockContextType || busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contextTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select
                value={tone}
                onValueChange={(v) => setTone(v as typeof tone)}
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-instructions">
              Extra instructions{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="email-instructions"
              rows={2}
              placeholder="e.g. mention that I'll be away next Friday"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={busy}
            />
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {subject || body ? "Regenerate" : "Generate draft"}
              </>
            )}
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="parent@example.com"
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              className="font-mono text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={!canSave || busy}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSave || busy}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
