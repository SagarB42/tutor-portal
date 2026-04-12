"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Paperclip, Loader2 } from "lucide-react";

type Props = {
  sessionId: string;
  studentIds: string[];
  onSuccess?: () => void;
};

export function LinkResourceDialog({ sessionId, studentIds, onSuccess }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [resourceId, setResourceId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    async function load() {
      const [rRes, sRes] = await Promise.all([
        supabase.from("resources").select("id, title, subject").order("title"),
        supabase.from("students").select("id, full_name").in("id", studentIds),
      ]);
      setResources(rRes.data || []);
      setStudents(sRes.data || []);
    }
    load();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resourceId) { alert("Select a resource."); return; }
    setLoading(true);

    const { error } = await supabase.from("session_resources").insert({
      session_id: sessionId,
      resource_id: resourceId,
      student_id: studentId || null,
      notes: notes || null,
    });

    if (error) alert("Error: " + error.message);
    else { setOpen(false); setResourceId(""); setStudentId(""); setNotes(""); onSuccess?.(); }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Paperclip className="mr-2 h-4 w-4" /> Link Resource</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Link Resource</DialogTitle>
          <DialogDescription>Attach a resource to this session.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <Select value={resourceId} onValueChange={setResourceId}>
            <SelectTrigger><SelectValue placeholder="Select resource..." /></SelectTrigger>
            <SelectContent>
              {resources.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.title} ({r.subject})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {studentIds.length > 1 && (
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="For which student? (optional)" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
