"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { StudentDialog } from "@/components/students/student-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Mail, Phone, GraduationCap, DollarSign, Pencil, Trash2,
  Calendar, ExternalLink, BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { formatGrade, formatCurrency, getSessionHours } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function StudentDetailPage() {
  const [student, setStudent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  async function fetchData() {
    if (!params.id) return;

    const { data: student, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !student) { setLoading(false); return; }
    setStudent(student);

    // Sessions via junction
    const { data: ssData } = await supabase
      .from("session_students")
      .select("rate, sessions(id, start_time, end_time, topic, status)")
      .eq("student_id", params.id);

    const sessionList = (ssData || [])
      .map((ss: any) => ({ ...ss.sessions, rate: ss.rate }))
      .filter((s: any) => s.id)
      .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    setSessions(sessionList);

    // Resources via session_resources
    if (sessionList.length > 0) {
      const sessionIds = sessionList.map((s: any) => s.id);
      const { data: resData } = await supabase
        .from("session_resources")
        .select("notes, resources(id, title, subject, url), sessions(start_time)")
        .eq("student_id", params.id)
        .in("session_id", sessionIds);
      setResources(resData || []);
    }

    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [params.id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!student) return <div className="p-12 text-center text-destructive">Student not found.</div>;

  const handleDelete = async () => {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    const { error } = await supabase.from("students").delete().eq("id", params.id);
    if (error) alert("Error: " + error.message);
    else router.push("/dashboard/students");
  };

  const billableSessions = sessions.filter((s) => ["completed", "cancelled_billable"].includes(s.status));
  const totalBilled = billableSessions.reduce((sum, s) => {
    return sum + Number(s.rate) * getSessionHours(s.start_time, s.end_time);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <StudentDialog initialData={student} onSuccess={fetchData} trigger={
            <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
          } />
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white border-0 shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold">{student.full_name}</h1>
              <div className="flex items-center gap-4 mt-2 text-slate-300 text-sm">
                <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {formatGrade(student.grade_level)}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> {formatCurrency(student.default_rate)}/hr</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-700">
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Student</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {student.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-400" /> {student.phone}</div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Parent: {student.parent_name}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {student.parent_email}</div>
                <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-400" /> {student.parent_phone}</div>
              </div>
            </div>
            {student.alt_parent_name && (
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Alt: {student.alt_parent_name}</h3>
                <div className="space-y-1 text-sm">
                  {student.alt_parent_email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {student.alt_parent_email}</div>}
                  {student.alt_parent_phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-400" /> {student.alt_parent_phone}</div>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <div className="p-2 rounded-xl bg-blue-50"><Calendar className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{sessions.length}</div></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
            <div className="p-2 rounded-xl bg-green-50"><DollarSign className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resources Assigned</CardTitle>
            <div className="p-2 rounded-xl bg-violet-50"><BookOpen className="h-4 w-4 text-violet-600" /></div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{resources.length}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resources */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Resources Given</CardTitle></CardHeader>
            <CardContent className="p-0">
              {resources.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">No resources assigned yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {item.resources?.title}
                          {item.notes && <div className="text-xs text-muted-foreground mt-1 italic">{item.notes}</div>}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{item.resources?.subject}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.sessions?.start_time ? format(new Date(item.sessions.start_time), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.resources?.url && (
                            <a href={item.resources.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent sessions */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Recent Sessions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground italic">No sessions yet.</div>
            ) : (
              <div className="divide-y">
                {sessions.slice(0, 8).map((s: any) => {
                  const hours = getSessionHours(s.start_time, s.end_time);
                  const charge = Number(s.rate) * hours;
                  return (
                    <div
                      key={s.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/sessions/${s.id}`)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{format(new Date(s.start_time), "MMM d")}</span>
                        <Badge variant="outline" className={statusStyles[s.status] || ""}>{s.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{s.topic}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(s.rate)}/hr × {hours.toFixed(1)}h = {formatCurrency(charge)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
