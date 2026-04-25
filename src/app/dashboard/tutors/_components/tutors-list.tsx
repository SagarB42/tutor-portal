"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  Search,
  Briefcase,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { CsvDownloadButton } from "@/components/shared/csv-download-button";
import { TutorDialog } from "@/components/tutors/tutor-dialog";
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
import { archiveTutor, restoreTutor } from "@/lib/actions/tutors";
import { exportTutorsCsv } from "@/lib/actions/exports";
import { formatCurrency } from "@/lib/utils";

type TutorRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  pay_rate: number | null;
  archived_at: string | null;
  [key: string]: unknown;
};

export function TutorsList({ tutors }: { tutors: TutorRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { active, archived } = useMemo(() => {
    const active: TutorRow[] = [];
    const archived: TutorRow[] = [];
    for (const t of tutors) {
      (t.archived_at ? archived : active).push(t);
    }
    return { active, archived };
  }, [tutors]);

  const filterList = (list: TutorRow[]) =>
    list.filter(
      (t) =>
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tutors
            </h2>
            <Badge variant="secondary">{active.length} active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff and payroll details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvDownloadButton action={exportTutorsCsv} label="Export CSV" />
          <TutorDialog />
        </div>
      </div>

      {tutors.length > 0 && (
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
          <TabsTrigger value="active">
            Active Tutors ({active.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past Tutors ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <TutorListView
                list={filterList(active)}
                isArchived={false}
                total={active.length}
                router={router}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="past">
          <Card>
            <CardContent className="p-0">
              <TutorListView
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

function TutorListView({
  list,
  isArchived,
  total,
  router,
}: {
  list: TutorRow[];
  isArchived: boolean;
  total: number;
  router: ReturnType<typeof useRouter>;
}) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-semibold">
          {isArchived ? "No archived tutors" : "No tutors yet"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isArchived
            ? "Archived tutors will appear here."
            : "Add your first tutor to get started."}
        </p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No tutors match your search.
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="divide-y md:hidden">
        {list.map((t) => (
          <div
            key={t.id}
            className="cursor-pointer p-4 transition-colors active:bg-muted/50"
            onClick={() => router.push(`/dashboard/tutors/${t.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{t.full_name}</p>
                  <Badge
                    variant="outline"
                    className={
                      isArchived
                        ? "border-gray-200 bg-gray-50 text-xs text-gray-500"
                        : "border-green-200 bg-green-50 text-xs text-green-700"
                    }
                  >
                    {isArchived ? "Archived" : "Active"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {formatCurrency(t.pay_rate ?? 0)}/hr
                </p>
                {t.email && (
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {t.email}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <TutorRowActions row={t} isArchived={isArchived} />
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
              <TableHead>Contact</TableHead>
              <TableHead>Pay Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/tutors/${t.id}`)}
              >
                <TableCell className="font-medium">{t.full_name}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {t.email && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" /> {t.email}
                      </div>
                    )}
                    {t.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" /> {t.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(t.pay_rate ?? 0)}/hr</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      isArchived
                        ? "border-gray-200 bg-gray-50 text-gray-500"
                        : "border-green-200 bg-green-50 text-green-700"
                    }
                  >
                    {isArchived ? "Archived" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TutorRowActions row={t} isArchived={isArchived} />
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

function TutorRowActions({
  row,
  isArchived,
}: {
  row: TutorRow;
  isArchived: boolean;
}) {
  return (
    <>
      {!isArchived && (
        <TutorDialog
          initialData={row as unknown as Parameters<typeof TutorDialog>[0]["initialData"]}
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
          action={() => restoreTutor(row.id)}
          successMessage="Tutor restored"
        >
          <ArchiveRestore className="h-3.5 w-3.5" />
        </ActionButton>
      ) : (
        <ActionButton
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-600"
          action={() => archiveTutor(row.id)}
          confirm="Archive this tutor? They will be moved to Past Tutors."
          successMessage="Tutor archived"
        >
          <Archive className="h-3.5 w-3.5" />
        </ActionButton>
      )}
    </>
  );
}
