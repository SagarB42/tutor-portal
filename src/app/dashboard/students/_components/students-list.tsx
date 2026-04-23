"use client";

import { Archive, ArchiveRestore, ChevronRight, Pencil, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { CsvDownloadButton } from "@/components/shared/csv-download-button";
import { StudentDialog } from "@/components/students/student-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { archiveStudent, restoreStudent } from "@/lib/actions/students";
import { exportStudentsCsv } from "@/lib/actions/exports";
import { formatCurrency, formatGrade } from "@/lib/utils";

type StudentRow = {
  id: string;
  full_name: string;
  email: string | null;
  grade_level: number | null;
  default_rate: number | null;
  archived_at: string | null;
  [key: string]: unknown;
};

export function StudentsList({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { active, archived } = useMemo(() => {
    const active: StudentRow[] = [];
    const archived: StudentRow[] = [];
    for (const s of students) {
      (s.archived_at ? archived : active).push(s);
    }
    return { active, archived };
  }, [students]);

  const filterList = (list: StudentRow[]) =>
    list.filter(
      (s) =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Students
            </h2>
            <Badge variant="secondary">{active.length} active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage students and their profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <CsvDownloadButton action={exportStudentsCsv} label="Export CSV" />
          <StudentDialog />
        </div>
      </div>

      {students.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archived.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <StudentListView
                list={filterList(active)}
                isArchived={false}
                total={active.length}
                router={router}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="archived">
          <Card>
            <CardContent className="p-0">
              <StudentListView
                list={filterList(archived)}
                isArchived={true}
                total={archived.length}
                router={router}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentListView({
  list,
  isArchived,
  total,
  router,
}: {
  list: StudentRow[];
  isArchived: boolean;
  total: number;
  router: ReturnType<typeof useRouter>;
}) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <Users className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-semibold">
          {isArchived ? "No archived students" : "No students yet"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isArchived
            ? "Archived students will appear here."
            : "Add your first student to get started."}
        </p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No students match your search.
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="divide-y md:hidden">
        {list.map((s) => (
          <div
            key={s.id}
            className="cursor-pointer p-4 transition-colors active:bg-muted/50"
            onClick={() => router.push(`/dashboard/students/${s.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.full_name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {formatGrade(s.grade_level)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(s.default_rate ?? 0)}/hr
                  </span>
                </div>
                {s.email && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {s.email}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <RowActions row={s} isArchived={isArchived} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Default Rate</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/students/${s.id}`)}
              >
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatGrade(s.grade_level)}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(s.default_rate ?? 0)}/hr</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.email}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <RowActions row={s} isArchived={isArchived} />
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

function RowActions({
  row,
  isArchived,
}: {
  row: StudentRow;
  isArchived: boolean;
}) {
  return (
    <>
      {!isArchived && (
        <StudentDialog
          // Cast: column set on the DB row is the superset of the zod-parsed shape.
          initialData={row as unknown as Parameters<typeof StudentDialog>[0]["initialData"]}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          }
        />
      )}
      {isArchived ? (
        <ActionButton
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600"
          action={() => restoreStudent(row.id)}
          successMessage="Student restored"
        >
          <ArchiveRestore className="h-3.5 w-3.5" />
        </ActionButton>
      ) : (
        <ActionButton
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-600"
          action={() => archiveStudent(row.id)}
          confirm="Archive this student? They will be moved to Past Students."
          successMessage="Student archived"
        >
          <Archive className="h-3.5 w-3.5" />
        </ActionButton>
      )}
    </>
  );
}
