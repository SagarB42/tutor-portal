"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ResourceDialog } from "@/components/resources/resource-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, BookOpen, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { formatGrade } from "@/lib/utils";

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  async function fetchResources() {
    const { data } = await supabase.from("resources").select("*").order("title");
    setResources(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchResources(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this resource? It will be unlinked from all sessions.")) return;
    // Remove from session_resources first (no ON DELETE CASCADE on resource_id)
    await supabase.from("session_resources").delete().eq("resource_id", id);
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchResources();
  };

  const filtered = resources.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Resources</h2>
            {!loading && <Badge variant="secondary">{resources.length}</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Learning materials and links.</p>
        </div>
        <ResourceDialog onSuccess={fetchResources} />
      </div>

      {resources.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title or subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No resources yet</h3>
              <p className="text-sm text-muted-foreground">Add your first learning resource.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No resources match your search.</div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y">
                {filtered.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{r.subject}</Badge>
                          {r.grade_level != null && <span className="text-xs text-muted-foreground">{formatGrade(r.grade_level)}</span>}
                        </div>
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm mt-1">
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ResourceDialog initialData={r} onSuccess={fetchResources} trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                        } />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDelete(e, r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell><Badge variant="secondary">{r.subject}</Badge></TableCell>
                        <TableCell>{formatGrade(r.grade_level)}</TableCell>
                        <TableCell>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm">
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <ResourceDialog initialData={r} onSuccess={fetchResources} trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDelete(e, r.id)}>
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
