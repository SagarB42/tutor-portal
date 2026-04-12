"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LinkResourceDialog } from "@/components/sessions/link-resource-dialog";
import { SessionDialog } from "@/components/sessions/session-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, Clock, Users, Trash2, ExternalLink, Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, formatGrade, getSessionHours } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  completed: "Completed",
  scheduled: "Scheduled",
  cancelled_billable: "Cancelled (Billable)",
  cancelled_free: "Cancelled",
};

export default function SessionDetailPage() {
  const [session, setSession] = useState<any>(null);
  const [linkedResources, setLinkedResources] = useState<any[]>([]);
  const [tutorName, setTutorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  async function fetchData() {
    if (!params.id) return;

    const { data: sess, error } = await supabase
      .from("sessions")
      .select("*, session_students(rate, students(id, full_name, grade_level))")
      .eq("id", params.id)
      .single();

    if (error || !sess) { setLoading(false); return; }
    setSession(sess);

    if (sess.tutor_id) {
      const { data: tutor } = await supabase.from("tutors").select("full_name").eq("id", sess.tutor_id).single();
      if (tutor) setTutorName(tutor.full_name);
    }

    const { data: resData } = await supabase
      .from("session_resources")
      .select("id, notes, student_id, resources(id, title, url, subject), students(full_name)")
      .eq("session_id", params.id);
    setLinkedResources(resData || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [params.id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!session) return <div className="p-12 text-center text-destructive">Session not found.</div>;

  const handleDelete = async () => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", params.id);
    if (error) alert("Error: " + error.message);
    else router.push("/dashboard/sessions");
  };

  const hours = getSessionHours(session.start_time, session.end_time);
  const duration = Math.round(hours * 60);
  const students = (session.session_students || [])
    .map((ss: any) => ({ ...ss.students, rate: ss.rate }))
    .filter(Boolean);

  const studentIds = students.map((s: any) => s.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <SessionDialog initialData={session} onSuccess={fetchData} trigger={
            <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
          } />
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{session.topic}</h1>
          <div className="flex items-center gap-2 text-muted-foreground flex-wrap text-sm">
            <Users className="h-4 w-4" />
            {students.map((s: any, i: number) => (
              <span key={s.id}>
                <span className="font-medium text-foreground">{s.full_name}</span>
                {s.grade_level != null && <span className="text-xs ml-1">({formatGrade(s.grade_level)})</span>}
                <span className="text-xs ml-1">{formatCurrency(Number(s.rate) * hours)}</span>
                {i < students.length - 1 && <span className="mx-1">·</span>}
              </span>
            ))}
            {tutorName && (
              <>
                <span className="mx-1">|</span>
                <span>Tutor: <span className="font-medium text-foreground">{tutorName}</span></span>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">{statusLabels[session.status] || session.status}</Badge>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Date</CardTitle>
            <div className="p-2 rounded-xl bg-blue-50"><Calendar className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent><div className="text-lg font-semibold">{format(new Date(session.start_time), "EEEE, MMMM d, yyyy")}</div></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-50"><Clock className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{format(new Date(session.start_time), "h:mm a")} – {format(new Date(session.end_time), "h:mm a")}</div>
            <div className="text-sm text-muted-foreground mt-1">{duration} minutes ({hours.toFixed(1)} hrs)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Rates (per hour)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {students.map((s: any) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.full_name}</span>
                  <span className="font-semibold">{formatCurrency(s.rate)}/hr = {formatCurrency(Number(s.rate) * hours)}</span>
                </div>
              ))}
            </div>
            {session.tutor_pay_rate && (
              <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                Tutor pay: {formatCurrency(session.tutor_pay_rate)}/hr = {formatCurrency(Number(session.tutor_pay_rate) * hours)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancellation */}
      {session.cancellation_reason && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader><CardTitle className="text-red-800 text-sm">Cancellation Reason</CardTitle></CardHeader>
          <CardContent className="text-red-700">{session.cancellation_reason}</CardContent>
        </Card>
      )}

      {/* Notes */}
      {session.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Session Notes</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{session.notes}</p></CardContent>
        </Card>
      )}

      {/* Resources */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Linked Resources</CardTitle>
          <LinkResourceDialog sessionId={session.id} studentIds={studentIds} onSuccess={fetchData} />
        </CardHeader>
        <CardContent>
          {linkedResources.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No resources linked yet.</p>
          ) : (
            <div className="space-y-3">
              {linkedResources.map((lr: any) => (
                <div key={lr.id} className="flex items-start justify-between border rounded-xl p-4 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{lr.resources?.title}</p>
                    <p className="text-xs text-muted-foreground">{lr.resources?.subject}</p>
                    {lr.students?.full_name && <p className="text-xs text-muted-foreground">For: {lr.students.full_name}</p>}
                    {lr.notes && <p className="text-xs italic mt-1">{lr.notes}</p>}
                  </div>
                  {lr.resources?.url && (
                    <a href={lr.resources.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
