"use client";

import { BookOpen, ExternalLink, Pencil, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { ResourceDialog } from "@/components/resources/resource-dialog";
import { DraftEmailButton } from "@/components/emails/draft-email-button";
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
import { deleteResource } from "@/lib/actions/resources";
import { formatGrade } from "@/lib/utils";

type ResourceRow = {
  id: string;
  title: string;
  subject: string;
  url: string;
  grade_level: number | null;
  [key: string]: unknown;
};

export function ResourcesList({ resources }: { resources: ResourceRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = resources.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Resources
            </h2>
            <Badge variant="secondary">{resources.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Learning materials and links.
          </p>
        </div>
        <ResourceDialog />
      </div>

      {resources.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No resources yet</h3>
              <p className="text-sm text-muted-foreground">
                Add your first learning resource.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No resources match your search.
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="divide-y md:hidden">
                {filtered.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{r.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {r.subject}
                          </Badge>
                          {r.grade_level != null && (
                            <span className="text-xs text-muted-foreground">
                              {formatGrade(r.grade_level)}
                            </span>
                          )}
                        </div>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <RowActions row={r} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.subject}</Badge>
                        </TableCell>
                        <TableCell>{formatGrade(r.grade_level)}</TableCell>
                        <TableCell>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <RowActions row={r} />
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

function RowActions({ row }: { row: ResourceRow }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <DraftEmailButton
        contextType="resource_assignment"
        contextId={row.id}
        label="Email"
        size="sm"
        variant="ghost"
      />
      <ResourceDialog
        initialData={row as unknown as Parameters<typeof ResourceDialog>[0]["initialData"]}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <ActionButton
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        action={() => deleteResource(row.id)}
        confirm="Delete this resource? It will be unlinked from all sessions."
        successMessage="Resource deleted"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ActionButton>
    </div>
  );
}
