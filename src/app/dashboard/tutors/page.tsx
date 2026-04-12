"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { TutorDialog } from "@/components/tutors/tutor-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Briefcase, Mail, Phone, Pencil, Trash2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function TutorsPage() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function fetchTutors() {
    const { data } = await supabase.from("tutors").select("*").order("full_name");
    setTutors(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchTutors(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this tutor? This cannot be undone.")) return;
    const { error } = await supabase.from("tutors").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchTutors();
  };

  const filtered = tutors.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Tutors</h2>
            {!loading && <Badge variant="secondary">{tutors.length}</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Manage staff and payroll details.</p>
        </div>
        <TutorDialog onSuccess={fetchTutors} />
      </div>

      {tutors.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading...
            </div>
          ) : tutors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No tutors yet</h3>
              <p className="text-sm text-muted-foreground">Add your first tutor to get started.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No tutors match your search.</div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y">
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/tutors/${t.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{t.full_name}</p>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mt-1">{formatCurrency(t.pay_rate)}/hr</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> {t.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <TutorDialog initialData={t} onSuccess={fetchTutors} trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        } />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDelete(e, t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Pay Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/tutors/${t.id}`)}
                      >
                        <TableCell className="font-medium">{t.full_name}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3 w-3" /> {t.email}</div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3 w-3" /> {t.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(t.pay_rate)}/hr</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TutorDialog initialData={t} onSuccess={fetchTutors} trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDelete(e, t.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
