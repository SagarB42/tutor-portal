"use client";

import * as React from "react";
import { Copy, ExternalLink, Loader2, Mail, Save, Sparkles, X } from "lucide-react";
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
import { saveDraftAction, updateDraftAction, markDraftSentAction } from "@/lib/actions/emails";
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
  const [opening, setOpening] = React.useState(false);
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
    if (!canSave) return null;
    setSaving(true);
    setError(null);
    try {
      if (draftId) {
        await updateDraftAction({ id: draftId, toEmail, subject, body });
        toast.success("Draft saved");
        return draftId;
      }
      const row = await saveDraftAction({
        contextType,
        contextId: contextId ?? null,
        studentId: studentId ?? null,
        toEmail,
        subject,
        body,
      });
      setDraftId(row.id);
      toast.success("Draft saved");
      return row.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success("Body copied");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(subject);
      toast.success("Subject copied");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const handleOpenInMail = async () => {
    if (!canSave) return;
    setOpening(true);
    setError(null);
    try {
      // Persist before handing off — opening a mailto link can navigate away
      // depending on the OS handler.
      const id = await handleSave();
      // mailto URLs are limited to ~2000 chars on most clients. For long
      // bodies we silently truncate the URL and rely on the copy action.
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (body) params.set("body", body);
      const url = `mailto:${encodeURIComponent(toEmail)}?${params.toString()}`;
      const truncated = url.length > 1900;
      const finalUrl = truncated
        ? `mailto:${encodeURIComponent(toEmail)}?${new URLSearchParams({
            subject,
          }).toString()}`
        : url;
      window.location.href = finalUrl;
      if (truncated) {
        await navigator.clipboard.writeText(body).catch(() => {});
        toast.message("Body too long for mailto", {
          description: "Body was copied to clipboard — paste it into the message.",
        });
      }
      if (id) {
        // Best-effort: stamp as sent so it leaves the drafts queue.
        try {
          await markDraftSentAction(id);
        } catch {
          // Non-fatal — user can mark it sent from the list.
        }
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't open mail app";
      setError(message);
      toast.error(message);
    } finally {
      setOpening(false);
    }
  };

  const busy = generating || saving || opening;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Compose email
          </DialogTitle>
          <DialogDescription>
            Use AI to draft an email, then open it in your mail app or copy
            the body to paste anywhere.
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopySubject}
              disabled={!subject.trim() || busy}
              title="Copy subject"
            >
              <Copy className="mr-2 h-4 w-4" /> Subject
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyBody}
              disabled={!body.trim() || busy}
              title="Copy body"
            >
              <Copy className="mr-2 h-4 w-4" /> Body
            </Button>
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
              onClick={handleOpenInMail}
              disabled={!canSave || busy}
            >
              {opening ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Open in mail app
              <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
