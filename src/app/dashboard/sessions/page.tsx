"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { SessionDialog } from "@/components/sessions/session-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, CalendarDays, Pencil, Trash2, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusLabels: Record<string, string> = {
  completed: "Completed",
  scheduled: "Scheduled",
  cancelled_billable: "Cancelled (Billable)",
  cancelled_free: "Cancelled",
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [tutorMap, setTutorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function fetchData() {
    const [sessionsRes, tutorsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, start_time, end_time, topic, status, tutor_id, tutor_pay_rate, notes, cancellation_reason, session_students(rate, student_id, students(id, full_name))")
        .order("start_time", { ascending: false }),
      supabase.from("tutors").select("id, full_name"),
    ]);

    setSessions(sessionsRes.data || []);
    const map: Record<string, string> = {};
    (tutorsRes.data || []).forEach((t: any) => { map[t.id] = t.full_name; });
    setTutorMap(map);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this session? This cannot be undone.")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchData();
  };

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const names = s.session_students?.map((ss: any) => ss.students?.full_name).filter(Boolean).join(" ") || "";
    return s.topic?.toLowerCase().includes(q) || names.toLowerCase().includes(q) || (s.tutor_id && tutorMap[s.tutor_id]?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Sessions</h2>
            {!loading && <Badge variant="secondary">{sessions.length}</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Click a session for details.</p>
        </div>
        <SessionDialog onSuccess={fetchData} />
      </div>

      {sessions.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by topic, student, or tutor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No sessions yet</h3>
              <p className="text-sm text-muted-foreground">Log your first session to get started.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No sessions match your search.</div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y">
                {filtered.map((s) => {
                  const names = s.session_students?.map((ss: any) => ss.students?.full_name).filter(Boolean).join(", ") || "—";
                  return (
                    <div
                      key={s.id}
                      className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/sessions/${s.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">{s.topic}</p>
                            <Badge variant="outline" className={`text-xs shrink-0 ${statusStyles[s.status] || ""}`}>
                              {statusLabels[s.status] || s.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(s.start_time), "MMM d, yyyy")} · {format(new Date(s.start_time), "h:mm a")} – {format(new Date(s.end_time), "h:mm a")}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{names}</p>
                          {s.tutor_id && tutorMap[s.tutor_id] && (
                            <p className="text-xs text-muted-foreground mt-0.5">Tutor: {tutorMap[s.tutor_id]}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <SessionDialog initialData={s} onSuccess={fetchData} trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          } />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDelete(e, s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Tutor</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => {
                      const names = s.session_students?.map((ss: any) => ss.students?.full_name).filter(Boolean).join(", ") || "—";
                      return (
                        <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/sessions/${s.id}`)}>
                          <TableCell className="font-medium">{format(new Date(s.start_time), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {format(new Date(s.start_time), "h:mm a")} – {format(new Date(s.end_time), "h:mm a")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{names}</TableCell>
                          <TableCell>{s.tutor_id ? tutorMap[s.tutor_id] || "—" : "—"}</TableCell>
                          <TableCell className="font-medium">{s.topic}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusStyles[s.status] || ""}>{statusLabels[s.status] || s.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <SessionDialog initialData={s} onSuccess={fetchData} trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              } />
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDelete(e, s.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
