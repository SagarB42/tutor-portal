"use client";

import * as React from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Save,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { SearchablePicker } from "@/components/ui/searchable-picker";
import {
  EmailMultiPicker,
  type EmailSuggestion,
} from "@/components/ui/email-multi-picker";
import { saveDraftAction, updateDraftAction, sendDraftAction } from "@/lib/actions/emails";
import type { EmailDraftContext } from "@/lib/db-types";

export type ComposeDialogExistingDraft = {
  id: string;
  contextType: EmailDraftContext;
  contextId: string | null;
  studentId: string | null;
  toEmail: string;
  subject: string;
  body: string;
};
import { cn } from "@/lib/utils";

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
   * If true, hide the contextType selector — the caller opened the dialog
   * from an entity page where the context is already known.
   */
  lockContextType?: boolean;
  /**
   * If provided, the dialog opens in edit mode for the given draft —
   * fields are populated from the draft and saving updates the same row.
   */
  existingDraft?: ComposeDialogExistingDraft | null;
};

type ContextOption = {
  value: EmailDraftContext;
  label: string;
  description: string;
  needsPicker: boolean;
  pickerLabel?: string;
};

const contextOptions: ContextOption[] = [
  {
    value: "custom",
    label: "Custom",
    description: "Free-form draft from your instructions.",
    needsPicker: false,
  },
  {
    value: "session_summary",
    label: "Session summary",
    description: "Recap a tutoring session for the parent.",
    needsPicker: true,
    pickerLabel: "Session",
  },
  {
    value: "invoice_reminder",
    label: "Invoice reminder",
    description: "Polite nudge for an outstanding invoice.",
    needsPicker: true,
    pickerLabel: "Invoice",
  },
  {
    value: "prepaid_topup",
    label: "Prepaid top-up",
    description: "Ask a parent to top up prepaid sessions.",
    needsPicker: true,
    pickerLabel: "Student",
  },
  {
    value: "attendance_absence",
    label: "Attendance follow-up",
    description: "Follow up on a missed or late session.",
    needsPicker: true,
    pickerLabel: "Attendance record",
  },
  {
    value: "resource_assignment",
    label: "Resource share",
    description: "Share a learning resource with a parent.",
    needsPicker: true,
    pickerLabel: "Resource",
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Short outreach email — no prefilled facts.",
    needsPicker: false,
  },
];

type EmailOption = { email: string; label: string };

type PickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  status?: string;
  meta?: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  studentId?: string | null;
  contextField: "contextId" | "studentId";
  emailOptions?: EmailOption[];
  students?: {
    id: string;
    name: string;
    parentName?: string | null;
    parentEmail?: string | null;
    studentEmail?: string | null;
  }[];
};

export function ComposeDialog(props: ComposeDialogProps) {
  const {
    open,
    onOpenChange,
    defaultContextType = "custom",
    contextId: initialContextId,
    studentId: initialStudentId,
    prefillToEmail,
    prefillSubject,
    prefillBody,
    prefillInstructions,
    lockContextType,
    existingDraft,
  } = props;

  const initialToEmails = existingDraft
    ? splitEmailList(existingDraft.toEmail)
    : prefillToEmail
    ? [prefillToEmail]
    : [];

  const [contextType, setContextType] = React.useState<EmailDraftContext>(
    existingDraft?.contextType ?? defaultContextType,
  );
  const [contextId, setContextId] = React.useState<string | null>(
    existingDraft?.contextId ?? initialContextId ?? null,
  );
  const [studentId, setStudentId] = React.useState<string | null>(
    existingDraft?.studentId ?? initialStudentId ?? null,
  );
  // For session_summary the user can pick more than one student; the email
  // suggestion list and the saved draft both honor this selection. For all
  // other context types the array stays in sync with `studentId`.
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>(
    existingDraft?.studentId
      ? [existingDraft.studentId]
      : initialStudentId
      ? [initialStudentId]
      : [],
  );

  const [tone, setTone] = React.useState<"professional" | "friendly" | "formal">(
    "friendly",
  );
  const [instructions, setInstructions] = React.useState(prefillInstructions ?? "");
  const [toEmails, setToEmails] = React.useState<string[]>(initialToEmails);
  const [subject, setSubject] = React.useState(
    existingDraft?.subject ?? prefillSubject ?? "",
  );
  const [body, setBody] = React.useState(existingDraft?.body ?? prefillBody ?? "");
  const [draftId, setDraftId] = React.useState<string | null>(
    existingDraft?.id ?? null,
  );

  const [pickerItems, setPickerItems] = React.useState<PickerItem[]>([]);
  const [pickerLoading, setPickerLoading] = React.useState(false);
  const [pickerError, setPickerError] = React.useState<string | null>(null);

  // Lazily-loaded full student list for contexts that need a separate student
  // selector (resource_assignment, invoice_reminder).
  const [studentList, setStudentList] = React.useState<PickerItem[]>([]);
  const [studentListLoading, setStudentListLoading] = React.useState(false);
  const studentListFetchedRef = React.useRef(false);

  // For invoice_reminder we let the user pick the student first, then narrow
  // the invoice picker to that student. Stored separately from `studentId`
  // because the invoice's student is what gets persisted on the draft once
  // an invoice is selected.
  const [invoiceStudentId, setInvoiceStudentId] = React.useState<string | null>(
    null,
  );

  // For resource_assignment: the user can attach multiple resources and send
  // to multiple students. The primary resource is `contextId` (saved on the
  // draft); the rest live here and are passed to the AI generator.
  const [extraResourceIds, setExtraResourceIds] = React.useState<string[]>([]);
  const [extraStudentIds, setExtraStudentIds] = React.useState<string[]>([]);

  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [opening, setOpening] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentContext =
    contextOptions.find((o) => o.value === contextType) ?? contextOptions[0];

  // Reset state on open. Honor any pre-fills (e.g. opened from an entity page)
  // or seed from an existing draft when editing.
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (existingDraft) {
      setContextType(existingDraft.contextType);
      setContextId(existingDraft.contextId);
      setStudentId(existingDraft.studentId);
      setSelectedStudentIds(existingDraft.studentId ? [existingDraft.studentId] : []);
      setInstructions("");
      setToEmails(splitEmailList(existingDraft.toEmail));
      setSubject(existingDraft.subject);
      setBody(existingDraft.body);
      setDraftId(existingDraft.id);
    } else {
      setContextType(defaultContextType);
      setContextId(initialContextId ?? null);
      setStudentId(initialStudentId ?? null);
      setSelectedStudentIds(initialStudentId ? [initialStudentId] : []);
      setInstructions(prefillInstructions ?? "");
      setToEmails(prefillToEmail ? [prefillToEmail] : []);
      setSubject(prefillSubject ?? "");
      setBody(prefillBody ?? "");
      setDraftId(null);
    }
    setError(null);
    setPickerItems([]);
    setPickerError(null);
    setStudentList([]);
    studentListFetchedRef.current = false;
    setInvoiceStudentId(null);
    setExtraResourceIds([]);
    setExtraStudentIds([]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    open,
    existingDraft,
    defaultContextType,
    initialContextId,
    initialStudentId,
    prefillInstructions,
    prefillToEmail,
    prefillSubject,
    prefillBody,
  ]);

  // Load picker options whenever the context type changes (and dialog is open).
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!currentContext.needsPicker) {
      setPickerItems([]);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    setPickerError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch(`/api/emails/picker?type=${contextType}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          items?: PickerItem[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(json.error || `Failed to load options (HTTP ${res.status})`);
        }
        setPickerItems(json.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPickerError(err instanceof Error ? err.message : "Failed to load options");
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, contextType, currentContext.needsPicker]);

  // Some contexts need a full student list shown alongside the primary
  // picker (resource_assignment → choose recipients; invoice_reminder →
  // pick the student first to filter invoices). Load once per dialog open.
  React.useEffect(() => {
    if (!open) return;
    if (contextType !== "resource_assignment" && contextType !== "invoice_reminder")
      return;
    if (studentListFetchedRef.current) return;
    studentListFetchedRef.current = true;
    let cancelled = false;
    setStudentListLoading(true);
    fetch("/api/emails/picker?type=prepaid_topup")
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { items?: PickerItem[] };
        if (!cancelled) setStudentList(json.items ?? []);
      })
      .catch(() => {
        /* non-fatal — picker just stays empty */
      })
      .finally(() => {
        if (!cancelled) setStudentListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, contextType]);

  const handleContextTypeChange = (value: EmailDraftContext) => {
    setContextType(value);
    setContextId(null);
    setStudentId(null);
    setSelectedStudentIds([]);
    setInvoiceStudentId(null);
    setExtraResourceIds([]);
    setExtraStudentIds([]);
    // Clear recipients — a fresh context means new options to pick from.
    setToEmails([]);
  };

  const handlePickerSelect = (id: string) => {
    const item = pickerItems.find((p) => p.id === id);
    if (!item) return;
    if (item.contextField === "studentId") {
      setStudentId(id);
      setSelectedStudentIds([id]);
      setContextId(null);
    } else {
      setContextId(id);
      if (item.students && item.students.length > 1) {
        // Group session: user must pick which students this email is about.
        setStudentId(null);
        setSelectedStudentIds([]);
      } else if (contextType === "resource_assignment") {
        // Resource share: student must be explicitly chosen.
        setStudentId(null);
        setSelectedStudentIds([]);
      } else if (item.studentId) {
        setStudentId(item.studentId);
        setSelectedStudentIds([item.studentId]);
      } else {
        setStudentId(null);
        setSelectedStudentIds([]);
      }
    }
    // We never auto-fill the To field anymore — the user picks recipients
    // explicitly from the suggestion list.
    setToEmails([]);
  };

  const selectedPickerItem = currentContext.needsPicker
    ? pickerItems.find((p) =>
        p.contextField === "studentId" ? p.id === studentId : p.id === contextId,
      ) ?? null
    : null;

  // Invoice reminder: filter invoices to the chosen student. The full list is
  // loaded once and we narrow it down for display.
  const visiblePickerItems =
    contextType === "invoice_reminder" && invoiceStudentId
      ? pickerItems.filter((p) => p.studentId === invoiceStudentId)
      : pickerItems;

  const sessionStudents =
    contextType === "session_summary" && selectedPickerItem?.students
      ? selectedPickerItem.students
      : [];
  const sessionNeedsStudentPick = sessionStudents.length > 1;

  // Resource share always needs a student selection once a resource is chosen.
  const resourceNeedsStudentPick =
    contextType === "resource_assignment" && !!contextId;

  // Unified pool of student choices for the secondary picker.
  const studentChoices = sessionNeedsStudentPick
    ? sessionStudents.map((st) => ({
        id: st.id,
        name: st.name,
        parentName: st.parentName ?? null,
        parentEmail: st.parentEmail ?? null,
        studentEmail: st.studentEmail ?? null,
      }))
    : resourceNeedsStudentPick
    ? studentList.map((s) => ({
        id: s.id,
        name: s.label,
        parentName: s.recipientName ?? null,
        parentEmail: s.emailOptions?.[0]?.email ?? null,
        studentEmail: null as string | null,
      }))
    : [];

  const handleSecondaryStudentSelect = (id: string) => {
    setStudentId(id);
    setSelectedStudentIds([id]);
    // Don't auto-fill recipients — the user picks from the To suggestions.
  };

  const toggleSessionStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      // Keep `studentId` in sync — generation/save still uses a single id.
      setStudentId(next[0] ?? null);
      return next;
    });
  };

  const pickerSelectedId = selectedPickerItem?.id ?? "";

  const requiresPickerSelection =
    (currentContext.needsPicker && !pickerSelectedId) ||
    (sessionNeedsStudentPick && selectedStudentIds.length === 0) ||
    (resourceNeedsStudentPick && !studentId);

  // Build the To suggestion list. Always shown so the user can add multiple
  // recipients and toggle them on/off. For session_summary the list is
  // filtered down to the parent + student emails of the selected students.
  const emailSuggestions: EmailSuggestion[] = (() => {
    const out: EmailSuggestion[] = [];
    const seen = new Set<string>();
    const push = (opt: EmailOption | undefined | null) => {
      if (!opt || !opt.email) return;
      const key = opt.email.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(opt);
    };
    const pushFromStudent = (st: {
      name: string;
      parentName?: string | null;
      parentEmail?: string | null;
      studentEmail?: string | null;
    }) => {
      if (st.parentEmail) {
        push({
          email: st.parentEmail,
          label: st.parentName
            ? `${st.parentName} (parent of ${st.name})`
            : `Parent of ${st.name}`,
        });
      }
      if (st.studentEmail) {
        push({
          email: st.studentEmail,
          label: `${st.name} (student)`,
        });
      }
    };
    if (contextType === "session_summary" && selectedPickerItem?.students) {
      // Only include emails for the students the user actually picked.
      const picked = selectedPickerItem.students.filter((s) =>
        selectedStudentIds.includes(s.id),
      );
      picked.forEach(pushFromStudent);
    } else {
      // Primary picker contributes its own pre-filtered emailOptions.
      selectedPickerItem?.emailOptions?.forEach(push);
    }
    // Resource share: add the chosen student's parent + student emails,
    // plus any extra students the user opted to send to.
    if (resourceNeedsStudentPick && studentId) {
      const match = studentList.find((s) => s.id === studentId);
      match?.emailOptions?.forEach(push);
    }
    if (contextType === "resource_assignment") {
      for (const sid of extraStudentIds) {
        const m = studentList.find((s) => s.id === sid);
        m?.emailOptions?.forEach(push);
      }
    }
    return out;
  })();

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
          contextId,
          studentId,
          extraResourceIds:
            contextType === "resource_assignment" ? extraResourceIds : undefined,
          extraStudentIds:
            contextType === "resource_assignment" ? extraStudentIds : undefined,
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
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        try {
          const parsed = JSON.parse(buf) as { subject?: string; body?: string };
          if (typeof parsed.subject === "string") setSubject(parsed.subject);
          if (typeof parsed.body === "string") setBody(parsed.body);
        } catch {
          // streaming partial — ignore
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

  // Saving a draft is enabled as soon as at least one of recipient / subject /
  // body has any content. Sending and the mailto handoff still require all
  // three to be filled in (see `canSend`).
  const canSave =
    toEmails.length > 0 || subject.trim().length > 0 || body.trim().length > 0;
  const canSend =
    toEmails.length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  const handleSave = async (): Promise<string | null> => {
    if (!canSave) return null;
    setSaving(true);
    setError(null);
    try {
      // Backend stores `to_email` as a comma-separated string so multiple
      // recipients survive a round-trip through the drafts table.
      const joined = toEmails.join(", ");
      if (draftId) {
        await updateDraftAction({ id: draftId, toEmail: joined, subject, body });
        toast.success("Draft saved");
        return draftId;
      }
      const row = await saveDraftAction({
        contextType,
        contextId,
        studentId,
        toEmail: joined,
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

  const handleCopy = async (kind: "subject" | "body") => {
    const text = kind === "subject" ? subject : body;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${kind === "subject" ? "Subject" : "Body"} copied`);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const handleSendNow = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      // Persist first so we always have a draft id to attach the send to.
      const id = await handleSave();
      if (!id) return;
      const result = await sendDraftAction({
        id,
        toEmails,
        subject,
        body,
      });
      if (!result.ok) {
        const message = result.error ?? "Send failed";
        setError(message);
        toast.error(message);
        return;
      }
      if (result.sandbox) {
        toast.success("Email sent", {
          description:
            "Sandbox mode — only the address on your Resend account will receive this. Connect a domain in Settings to send to anyone.",
        });
      } else {
        toast.success("Email sent");
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleOpenInMail = async () => {
    if (!canSend) return;
    setOpening(true);
    setError(null);
    try {
      // Always persist first so the row is preserved as a draft. The mailto
      // handoff does NOT mark the draft as sent — the user must explicitly
      // mark it sent (or use the in-app Send button) once the message has
      // actually left their inbox.
      await handleSave();
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (body) params.set("body", body);
      const recipients = toEmails.join(",");
      const url = `mailto:${encodeURIComponent(recipients)}?${params.toString()}`;
      const truncated = url.length > 1900;
      const finalUrl = truncated
        ? `mailto:${encodeURIComponent(recipients)}?${new URLSearchParams({ subject }).toString()}`
        : url;
      window.location.href = finalUrl;
      if (truncated) {
        await navigator.clipboard.writeText(body).catch(() => {});
        toast.message("Body too long for mailto", {
          description: "Body was copied to clipboard — paste it into the message.",
        });
      }
      toast.message("Saved as draft", {
        description:
          "Mark it as sent from the Emails tab once it has actually left your inbox.",
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't open mail app";
      setError(message);
      toast.error(message);
    } finally {
      setOpening(false);
    }
  };

  const busy = generating || saving || opening || sending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 sm:p-0">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />{" "}
            {existingDraft ? "Edit draft" : "Compose email"}
          </DialogTitle>
          <DialogDescription>
            Pick a context, let AI draft it for you, then send it from the
            app or hand off to your mail client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Step 1: Context + tone */}
          <Section index={1} title="What's this email about?">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Context</Label>
                <Select
                  value={contextType}
                  onValueChange={(v) =>
                    handleContextTypeChange(v as EmailDraftContext)
                  }
                  disabled={lockContextType || busy}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contextOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {currentContext.description}
                </p>
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

            {currentContext.needsPicker && (
              <div className="space-y-1.5">
                {contextType === "invoice_reminder" && (
                  <div className="space-y-1.5">
                    <Label>Student</Label>
                    <SearchablePicker
                      items={studentList.map((s) => ({
                        id: s.id,
                        label: s.label,
                        sublabel: s.sublabel,
                      }))}
                      value={invoiceStudentId ?? ""}
                      onValueChange={(id) => {
                        setInvoiceStudentId(id);
                        // If the currently selected invoice belongs to a
                        // different student, clear it so the user re-picks.
                        if (
                          contextId &&
                          !pickerItems.some(
                            (p) => p.id === contextId && p.studentId === id,
                          )
                        ) {
                          setContextId(null);
                          setStudentId(null);
                        }
                      }}
                      placeholder="Pick a student first…"
                      searchPlaceholder="Search students…"
                      emptyText="No students found."
                      loading={studentListLoading}
                      disabled={busy}
                    />
                  </div>
                )}
                <Label>{currentContext.pickerLabel}</Label>
                <SearchablePicker
                  items={visiblePickerItems}
                  value={pickerSelectedId}
                  onValueChange={handlePickerSelect}
                  placeholder={
                    contextType === "invoice_reminder" && !invoiceStudentId
                      ? "Pick a student first to see their invoices…"
                      : `Select ${currentContext.pickerLabel?.toLowerCase()}…`
                  }
                  searchPlaceholder={`Search ${currentContext.pickerLabel?.toLowerCase()}s…`}
                  emptyText={
                    contextType === "invoice_reminder" && invoiceStudentId
                      ? "This student has no open invoices."
                      : `No ${currentContext.pickerLabel?.toLowerCase()}s found.`
                  }
                  loading={pickerLoading}
                  disabled={
                    busy ||
                    (contextType === "invoice_reminder" && !invoiceStudentId)
                  }
                />
                {pickerError && (
                  <p className="text-xs text-destructive">{pickerError}</p>
                )}
              </div>
            )}

            {sessionNeedsStudentPick && (
              <div className="space-y-1.5">
                <Label>Students</Label>
                <p className="text-xs text-muted-foreground">
                  This session has multiple students — pick one or more. The To
                  field will only suggest the selected students&apos; parents and
                  their own emails.
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {sessionStudents.map((st) => {
                    const checked = selectedStudentIds.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleSessionStudent(st.id)}
                        disabled={busy}
                        className={cn(
                          "flex items-start gap-2 rounded-md border bg-background p-2 text-left text-sm transition",
                          "hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
                          checked && "border-primary bg-primary/5",
                        )}
                        aria-pressed={checked}
                      >
                        {checked ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{st.name}</span>
                          {st.parentName && (
                            <span className="block truncate text-xs text-muted-foreground">
                              Parent: {st.parentName}
                              {st.parentEmail ? ` · ${st.parentEmail}` : ""}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {resourceNeedsStudentPick && (
              <div className="space-y-1.5">
                <Label>Student</Label>
                <SearchablePicker
                  items={studentChoices.map((st) => ({
                    id: st.id,
                    label: st.name,
                    sublabel: st.parentName
                      ? `Parent: ${st.parentName}${st.parentEmail ? ` · ${st.parentEmail}` : ""}`
                      : st.parentEmail ?? undefined,
                  }))}
                  value={studentId ?? ""}
                  onValueChange={handleSecondaryStudentSelect}
                  placeholder="Pick a student…"
                  searchPlaceholder="Search students…"
                  emptyText="No students found."
                  loading={studentListLoading}
                  disabled={busy}
                />
                {studentList.length > 0 && (
                  <details className="rounded-md border bg-card/50 p-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                      Send to additional students ({extraStudentIds.length} selected)
                    </summary>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {studentList
                        .filter((s) => s.id !== studentId)
                        .map((s) => {
                          const checked = extraStudentIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                setExtraStudentIds((prev) =>
                                  prev.includes(s.id)
                                    ? prev.filter((x) => x !== s.id)
                                    : [...prev, s.id],
                                )
                              }
                              disabled={busy}
                              aria-pressed={checked}
                              className={cn(
                                "flex items-start gap-2 rounded-md border bg-background p-2 text-left text-xs transition",
                                "hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
                                checked && "border-primary bg-primary/5",
                              )}
                            >
                              {checked ? (
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              ) : (
                                <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {s.label}
                                </span>
                                {s.sublabel && (
                                  <span className="block truncate text-[11px] text-muted-foreground">
                                    {s.sublabel}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </details>
                )}
              </div>
            )}

            {contextType === "resource_assignment" && contextId && pickerItems.length > 1 && (
              <details className="rounded-md border bg-card/50 p-2">
                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                  Share additional resources ({extraResourceIds.length} selected)
                </summary>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {pickerItems
                    .filter((r) => r.id !== contextId)
                    .map((r) => {
                      const checked = extraResourceIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() =>
                            setExtraResourceIds((prev) =>
                              prev.includes(r.id)
                                ? prev.filter((x) => x !== r.id)
                                : [...prev, r.id],
                            )
                          }
                          disabled={busy}
                          aria-pressed={checked}
                          className={cn(
                            "flex items-start gap-2 rounded-md border bg-background p-2 text-left text-xs transition",
                            "hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
                            checked && "border-primary bg-primary/5",
                          )}
                        >
                          {checked ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          ) : (
                            <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {r.label}
                            </span>
                            {r.sublabel && (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {r.sublabel}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </details>
            )}
          </Section>

          {/* Step 2: Generation prompt */}
          <Section index={2} title="Anything specific to mention?">
            <Textarea
              id="email-instructions"
              rows={2}
              placeholder="e.g. mention I'll be away next Friday, suggest two new dates…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={busy}
            />
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={busy || requiresPickerSelection}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {subject || body ? "Regenerate draft" : "Generate draft"}
                </>
              )}
            </Button>
            {requiresPickerSelection && (
              <p className="text-xs text-muted-foreground">
                {sessionNeedsStudentPick && selectedStudentIds.length === 0
                  ? "Pick at least one student this email is about."
                  : resourceNeedsStudentPick && !studentId
                  ? "Pick which student this email is about."
                  : `Pick a ${currentContext.pickerLabel?.toLowerCase()} above first.`}
              </p>
            )}
          </Section>

          {/* Step 3: Edit and send */}
          <Section index={3} title="Review and send">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">To</Label>
              <EmailMultiPicker
                value={toEmails}
                onValueChange={setToEmails}
                suggestions={emailSuggestions}
                disabled={busy}
                placeholder={
                  emailSuggestions.length > 0
                    ? "Click to pick from parent or student emails…"
                    : "Type an email address…"
                }
              />
              {emailSuggestions.length > 0 && toEmails.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {emailSuggestions.length} address{emailSuggestions.length === 1 ? "" : "es"} available — click the field to pick one or more.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-subject">Subject</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy("subject")}
                  disabled={!subject.trim() || busy}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
              </div>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">Body</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy("body")}
                  disabled={!body.trim() || busy}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
              </div>
              <Textarea
                id="email-body"
                rows={11}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={busy}
                className="resize-y leading-relaxed"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </Section>
        </div>

        <DialogFooter className="border-t bg-muted/30 p-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleOpenInMail}
              disabled={!canSend || busy}
              title="Open the draft in your default mail app (it stays a draft until you mark it sent)"
            >
              {opening ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Open in mail app
              <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-60" />
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
              onClick={handleSendNow}
              disabled={!canSend || busy}
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

function Section({
  index,
  title,
  children,
  className,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <header className="flex items-center gap-2">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {index}
        </span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </header>
      {children}
    </section>
  );
}

// Split a comma-separated `to_email` string back into a recipient array.
function splitEmailList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
