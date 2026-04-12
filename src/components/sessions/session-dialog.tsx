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
import { Plus, Loader2, X } from "lucide-react";
import { format } from "date-fns";

type StudentEntry = { id: string; name: string; rate: string };

type Props = {
  onSuccess?: () => void;
  initialData?: any;
  trigger?: React.ReactNode;
};

export function SessionDialog({ onSuccess, initialData, trigger }: Props) {
  const isEdit = !!initialData;
  const { organizationId } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);

  const [selectedStudents, setSelectedStudents] = useState<StudentEntry[]>([]);
  const [tutorId, setTutorId] = useState("");
  const [status, setStatus] = useState("completed");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [tutorPayRate, setTutorPayRate] = useState("");

  useEffect(() => {
    if (!open) return;
    async function load() {
      const [sRes, tRes] = await Promise.all([
        supabase.from("students").select("id, full_name, default_rate").order("full_name"),
        supabase.from("tutors").select("id, full_name, pay_rate").order("full_name"),
      ]);
      setStudents(sRes.data || []);
      setTutors(tRes.data || []);

      // If editing, load session_students
      if (initialData) {
        const { data: ssData } = await supabase
          .from("session_students")
          .select("student_id, rate, students(full_name)")
          .eq("session_id", initialData.id);
        const entries: StudentEntry[] = (ssData || []).map((ss: any) => ({
          id: ss.student_id,
          name: ss.students?.full_name || "",
          rate: String(ss.rate),
        }));
        setSelectedStudents(entries);
      }
    }
    load();
  }, [open]);

  function prefill() {
    if (!initialData) return;
    const start = new Date(initialData.start_time);
    const end = new Date(initialData.end_time);
    setDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    setEndTime(format(end, "HH:mm"));
    setTopic(initialData.topic || "");
    setNotes(initialData.notes || "");
    setStatus(initialData.status || "completed");
    setCancelReason(initialData.cancellation_reason || "");
    setTutorId(initialData.tutor_id || "");
    setTutorPayRate(initialData.tutor_pay_rate?.toString() ?? "");
  }

  function addStudent(id: string) {
    if (!id || selectedStudents.some((s) => s.id === id)) return;
    const student = students.find((s) => s.id === id);
    if (!student) return;
    setSelectedStudents([
      ...selectedStudents,
      { id, name: student.full_name, rate: String(student.default_rate || 0) },
    ]);
  }

  function removeStudent(id: string) {
    setSelectedStudents(selectedStudents.filter((s) => s.id !== id));
  }

  function updateRate(id: string, rate: string) {
    setSelectedStudents(selectedStudents.map((s) => (s.id === id ? { ...s, rate } : s)));
  }

  function handleTutorChange(id: string) {
    setTutorId(id);
    if (!isEdit) {
      const tutor = tutors.find((t) => t.id === id);
      if (tutor?.pay_rate) setTutorPayRate(String(tutor.pay_rate));
    }
  }

  function resetForm() {
    setSelectedStudents([]); setTutorId(""); setStatus("completed");
    setDate(""); setStartTime(""); setEndTime(""); setTopic("");
    setNotes(""); setCancelReason(""); setTutorPayRate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedStudents.length === 0) { alert("Select at least one student."); return; }

    const startDT = new Date(`${date}T${startTime}`);
    const endDT = new Date(`${date}T${endTime}`);
    if (endDT <= startDT) { alert("End time must be after start time."); return; }

    setLoading(true);
    const isCancelled = status.startsWith("cancelled");

    const payload = {
      tutor_id: tutorId || null,
      start_time: startDT.toISOString(),
      end_time: endDT.toISOString(),
      topic: isCancelled ? (topic || "Cancelled session") : topic,
      notes: notes || null,
      status,
      cancellation_reason: isCancelled ? cancelReason : null,
      tutor_pay_rate: tutorPayRate ? parseFloat(tutorPayRate) : null,
    };

    if (isEdit) {
      const { error } = await supabase.from("sessions").update(payload).eq("id", initialData.id);
      if (error) { alert("Error: " + error.message); setLoading(false); return; }

      // Replace session_students
      const { error: delErr } = await supabase.from("session_students").delete().eq("session_id", initialData.id);
      if (delErr) { alert("Error clearing students: " + delErr.message); setLoading(false); return; }
      const junctionRows = selectedStudents.map((s) => ({
        session_id: initialData.id,
        student_id: s.id,
        rate: parseFloat(s.rate) || 0,
      }));
      const { error: jErr } = await supabase.from("session_students").insert(junctionRows);
      if (jErr) { alert("Error saving students: " + jErr.message); setLoading(false); return; }
    } else {
      const { data: session, error: sessionErr } = await supabase.from("sessions").insert({
        ...payload,
        organization_id: organizationId,
      }).select("id").single();

      if (sessionErr) { alert("Error: " + sessionErr.message); setLoading(false); return; }

      const junctionRows = selectedStudents.map((s) => ({
        session_id: session.id,
        student_id: s.id,
        rate: parseFloat(s.rate) || 0,
      }));
      const { error: jErr } = await supabase.from("session_students").insert(junctionRows);
      if (jErr) { alert("Error saving students: " + jErr.message); setLoading(false); return; }
    }

    setLoading(false);
    setOpen(false);
    if (!isEdit) resetForm();
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) prefill(); else if (!isEdit) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Log Session</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Session" : "Log Session"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update session details." : "Record a completed session or schedule a future one."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Students */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Students</h4>
            <Select onValueChange={addStudent}>
              <SelectTrigger><SelectValue placeholder="Add a student..." /></SelectTrigger>
              <SelectContent>
                {students
                  .filter((s) => !selectedStudents.some((ss) => ss.id === s.id))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name} ({`$${s.default_rate}/hr`})</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedStudents.length > 0 && (
              <div className="space-y-2">
                {selectedStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={s.rate}
                      onChange={(e) => updateRate(s.id, e.target.value)}
                      className="w-24 h-8 text-sm"
                      placeholder="$/hr"
                    />
                    <span className="text-xs text-muted-foreground">/hr</span>
                    <button type="button" onClick={() => removeStudent(s.id)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tutor & Pay Rate */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Tutor</h4>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Tutor</Label>
                <Select value={tutorId} onValueChange={handleTutorChange}>
                  <SelectTrigger><SelectValue placeholder="Select tutor..." /></SelectTrigger>
                  <SelectContent>
                    {tutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name} ({`$${t.pay_rate}/hr`})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tutorId && (
                <div className="space-y-1">
                  <Label className="text-sm">Tutor Pay Rate ($/hr)</Label>
                  <Input type="number" step="0.01" value={tutorPayRate} onChange={(e) => setTutorPayRate(e.target.value)} placeholder="$/hr" />
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Schedule</h4>
            <div className="space-y-1">
              <Label className="text-sm">Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Start *</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">End *</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Details</h4>
            <div className="space-y-1">
              <Label className="text-sm">Topic *</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Algebra Review" required />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="cancelled_billable">Cancelled (Billable)</SelectItem>
                  <SelectItem value="cancelled_free">Cancelled (Free)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status.startsWith("cancelled") && (
              <div className="space-y-1">
                <Label className="text-sm">Cancellation Reason</Label>
                <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why was the session cancelled?" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-sm">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Session notes..." rows={3} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update Session" : "Save Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
