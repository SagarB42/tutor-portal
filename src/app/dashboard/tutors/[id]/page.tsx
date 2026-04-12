"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { TutorDialog } from "@/components/tutors/tutor-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Mail, Phone, MapPin, DollarSign, Shield, Calendar, Pencil, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, getSessionHours } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function TutorDetailPage() {
  const [tutor, setTutor] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  async function fetchData() {
    if (!params.id) return;

    const { data: tutor, error } = await supabase.from("tutors").select("*").eq("id", params.id).single();
    if (error || !tutor) { setLoading(false); return; }
    setTutor(tutor);

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("id, start_time, end_time, topic, status, tutor_pay_rate, session_students(rate, students(id, full_name))")
      .eq("tutor_id", params.id)
      .order("start_time", { ascending: false });
    setSessions(sessionData || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [params.id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!tutor) return <div className="p-12 text-center text-destructive">Tutor not found.</div>;

  const handleDelete = async () => {
    if (!confirm("Delete this tutor? This cannot be undone.")) return;
    const { error } = await supabase.from("tutors").delete().eq("id", params.id);
    if (error) alert("Error: " + error.message);
    else router.push("/dashboard/tutors");
  };

  const completedSessions = sessions.filter((s) => ["completed", "cancelled_billable"].includes(s.status));
  const totalEarnings = completedSessions.reduce((sum, s) => {
    return sum + (Number(s.tutor_pay_rate) || 0) * getSessionHours(s.start_time, s.end_time);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <TutorDialog initialData={tutor} onSuccess={fetchData} trigger={
            <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
          } />
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 text-white border-0 shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold">{tutor.full_name}</h1>
              <div className="flex items-center gap-2 mt-2 text-slate-300 text-sm">
                <DollarSign className="h-4 w-4" /> {formatCurrency(tutor.pay_rate)}/hr
              </div>
            </div>
            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">Active</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-700">
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Contact</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {tutor.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-400" /> {tutor.phone}</div>
                <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-slate-400" /> {tutor.address}</div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Emergency: {tutor.emergency_name}</h3>
              <div className="flex items-center gap-2 text-sm"><Phone className="h-3 w-3 text-slate-400" /> {tutor.emergency_phone}</div>
              {tutor.alt_emergency_name && (
                <div className="mt-2">
                  <h4 className="text-xs text-slate-400">Alt: {tutor.alt_emergency_name}</h4>
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-3 w-3 text-slate-400" /> {tutor.alt_emergency_phone}</div>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Financial</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2"><DollarSign className="h-3 w-3 text-slate-400" /> {formatCurrency(tutor.pay_rate)}/hr</div>
                {tutor.tfn && <div className="flex items-center gap-2"><Shield className="h-3 w-3 text-slate-400" /> TFN: ••••••{tutor.tfn.slice(-3)}</div>}
                {tutor.bank_bsb && <div className="text-slate-300">BSB: {tutor.bank_bsb}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-50"><Calendar className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{completedSessions.length}</div></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <div className="p-2 rounded-xl bg-green-50"><DollarSign className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Session History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic">No sessions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const studentNames = s.session_students?.map((ss: any) => ss.students?.full_name).filter(Boolean).join(", ") || "—";
                  const hours = getSessionHours(s.start_time, s.end_time);
                  const pay = (Number(s.tutor_pay_rate) || 0) * hours;
                  return (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/sessions/${s.id}`)}>
                      <TableCell className="font-medium">{format(new Date(s.start_time), "MMM d, yyyy")}</TableCell>
                      <TableCell>{s.topic}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{studentNames}</TableCell>
                      <TableCell>{pay > 0 ? formatCurrency(pay) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={statusStyles[s.status] || ""}>{s.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
