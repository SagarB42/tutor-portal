"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { StudentDialog } from "@/components/students/student-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Users, Pencil, Archive, ArchiveRestore, ChevronRight } from "lucide-react";
import { formatGrade, formatCurrency } from "@/lib/utils";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function fetchStudents() {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("full_name");
    setStudents(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchStudents(); }, []);

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Archive this student? They will be moved to Past Students.")) return;
    const { error } = await supabase.from("students").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchStudents();
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("students").update({ archived_at: null }).eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchStudents();
  };

  const active = students.filter((s) => !s.archived_at);
  const archived = students.filter((s) => !!s.archived_at);

  const filterList = (list: any[]) =>
    list.filter((s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    );

  function StudentList({ list, isArchived }: { list: any[]; isArchived: boolean }) {
    const filtered = filterList(list);

    if (list.length === 0)
      return (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">{isArchived ? "No archived students" : "No students yet"}</h3>
          <p className="text-sm text-muted-foreground">{isArchived ? "Archived students will appear here." : "Add your first student to get started."}</p>
        </div>
      );

    if (filtered.length === 0)
      return <div className="p-8 text-center text-muted-foreground">No students match your search.</div>;

    return (
      <>
        {/* Mobile card view */}
        <div className="md:hidden divide-y">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/students/${s.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{s.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{formatGrade(s.grade_level)}</Badge>
                    <span className="text-sm text-muted-foreground">{formatCurrency(s.default_rate)}/hr</span>
                  </div>
                  {s.email && <p className="text-sm text-muted-foreground mt-1 truncate">{s.email}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isArchived && (
                    <StudentDialog initialData={s} onSuccess={fetchStudents} trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    } />
                  )}
                  {isArchived ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={(e) => handleRestore(e, s.id)}>
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={(e) => handleArchive(e, s.id)}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Default Rate</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/students/${s.id}`)}
                >
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell><Badge variant="secondary">{formatGrade(s.grade_level)}</Badge></TableCell>
                  <TableCell>{formatCurrency(s.default_rate)}/hr</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!isArchived && (
                        <StudentDialog initialData={s} onSuccess={fetchStudents} trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        } />
                      )}
                      {isArchived ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={(e) => handleRestore(e, s.id)}>
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={(e) => handleArchive(e, s.id)}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Students</h2>
            {!loading && <Badge variant="secondary">{active.length} active</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Manage students and their profiles.</p>
        </div>
        <StudentDialog onSuccess={fetchStudents} />
      </div>

      {students.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading...
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Students ({active.length})</TabsTrigger>
            <TabsTrigger value="past">Past Students ({archived.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <StudentList list={active} isArchived={false} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="past">
            <Card>
              <CardContent className="p-0">
                <StudentList list={archived} isArchived={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
